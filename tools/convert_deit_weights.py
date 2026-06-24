#!/usr/bin/env python3
"""
Convert DeiT-Tiny weights to flat binary format for WebGPU inference.

Usage:
    python tools/convert_deit_weights.py [--output public/assets/models/deit-tiny-int8.bin]

Downloads facebook/deit-tiny-patch16-224 (Apache 2.0) from HuggingFace,
quantizes weight matrices to int8 with per-tensor scale factors, and packs
into a flat binary format consumable by the WebGPU sample.

Format (v2):
    magic: b"DEIT" (4 bytes)
    version: u32 (2)
    numTensors: u32
    For each tensor:
        nameLen: u32
        name: bytes (UTF-8)
        dtype: u32 (0=fp32, 1=int8)
        ndims: u32
        shape: ndims * u32
        [if int8: scale: f32]
        dataLen: u32
        [padding to 4-byte alignment]
        data: fp32[] or int8[]

    Int8 tensors are dequantized during loading: value = int8 * scale.
    Weight matrices (2D) are stored as int8; biases, norms, and embeddings
    are stored as fp32.
"""

import argparse
import struct
import json
from pathlib import Path

import numpy as np
import torch
import timm


def convert_qkv_weights(state_dict: dict, layer_idx: int) -> dict:
    """Transpose and repack combined QKV weight for our WGSL layout.

    PyTorch stores qkv.weight as (3*dim, dim) = (576, 192).
    Our shader uses buffer offsets to slice Q, K, V and expects each
    portion in (inDim, outDim) = (192, 192) layout.
    We transpose each portion separately, then concatenate so buffer
    offsets still work: [Q.T | K.T | V.T] each (192, 192), total (192, 576)
    stored contiguously as 3 * dim * dim floats.
    """
    prefix = f"blocks.{layer_idx}.attn.qkv"
    qkv_weight = state_dict[f"{prefix}.weight"]  # (3*dim, dim)
    qkv_bias = state_dict[f"{prefix}.bias"]  # (3*dim)

    dim = qkv_weight.shape[1]  # 192

    # Split into Q, K, V portions, transpose each, concatenate
    q_w = qkv_weight[0:dim, :].T.contiguous()      # (dim, dim)
    k_w = qkv_weight[dim:2*dim, :].T.contiguous()   # (dim, dim)
    v_w = qkv_weight[2*dim:3*dim, :].T.contiguous() # (dim, dim)
    combined = torch.cat([q_w, k_w, v_w], dim=1)    # (dim, 3*dim) = (192, 576)

    # Flatten to make buffer offsets work: Q at [0..dim*dim], K at [dim*dim..2*dim*dim], etc.
    # But cat along dim=1 gives (192, 576) row-major, so element [k, col] is at k*576+col.
    # With buffer offset splitting into (dim, dim) chunks, Q is bytes [0..dim*dim*4],
    # which gives elements [0..dim*dim] of the flat array = rows 0..dim of a (dim, dim) matrix.
    # That's NOT right because (192, 576) flat[0..192*192] is rows 0..192 of width 576.

    # Simpler: store as three separate contiguous (dim, dim) blocks.
    combined_flat = torch.cat([
        q_w.reshape(-1),
        k_w.reshape(-1),
        v_w.reshape(-1),
    ])  # (3*dim*dim,)

    return {
        f"blocks.{layer_idx}.attn.qkv.weight": combined_flat.reshape(3 * dim, dim),
        f"blocks.{layer_idx}.attn.qkv.bias": qkv_bias,
    }


def reshape_patch_embed(state_dict: dict) -> dict:
    """Reshape patch embedding conv2d weights to linear projection format.

    DeiT patch_embed.proj is a Conv2d(3, 192, kernel_size=16, stride=16).
    Weight shape: (192, 3, 16, 16) -> we need (768, 192) for our linear projection.
    The 768 = 16*16*3 is the flattened patch dimension.

    The WGSL shader indexes patch pixels in HWC order (channel varies fastest):
      c = i % channels;  pixelInPatch = i / channels;
      py = pixelInPatch / patchSize;  px = pixelInPatch % patchSize;
    So the weight's 768-dim input axis must be in H-W-C order.
    PyTorch conv2d weight is (out, C, H, W) = C-H-W order.
    We permute to (out, H, W, C) before flattening.
    """
    weight = state_dict["patch_embed.proj.weight"]  # (192, 3, 16, 16)
    bias = state_dict["patch_embed.proj.bias"]  # (192,)

    out_dim = weight.shape[0]  # 192
    # Permute from (out, C, H, W) to (out, H, W, C) then flatten spatial dims
    weight_hwc = weight.permute(0, 2, 3, 1).contiguous()  # (192, 16, 16, 3)
    flat_weight = weight_hwc.reshape(out_dim, -1).T.contiguous()  # (768, 192)

    return {
        "patch_embed.proj.weight": flat_weight,
        "patch_embed.proj.bias": bias,
    }


def export_imagenet_labels(output_path: Path):
    """Export ImageNet class labels as JSON."""
    # timm includes imagenet label mapping
    from timm.data import ImageNetInfo
    info = ImageNetInfo()
    labels = []
    for i in range(1000):
        desc = info.index_to_description(i)
        # Use the human-readable description
        labels.append(desc.split(",")[0].strip())

    label_path = output_path.parent / "imagenet-labels.json"
    with open(label_path, "w") as f:
        json.dump(labels, f)
    print(f"Wrote {len(labels)} labels to {label_path}")


def write_tensor(f, name: str, tensor: torch.Tensor, quantize: bool = True):
    """Write a single tensor in our flat binary format.

    If quantize=True and tensor has >1 element, stores as int8 with a per-tensor
    scale factor. Biases and small tensors (e.g., CLS token) are stored as fp32.
    The JS loader dequantizes: float_value = int8_value * scale.
    """
    data = tensor.float().contiguous().numpy()
    name_bytes = name.encode("utf-8")

    # Quantize weight matrices (2D+) to int8; keep biases, norms, embeddings as fp32
    use_int8 = quantize and data.ndim >= 2
    if use_int8:
        abs_max = np.abs(data).max()
        scale = abs_max / 127.0 if abs_max > 0 else 1.0
        quantized = np.clip(np.round(data / scale), -128, 127).astype(np.int8)
        dtype_flag = 1  # int8
    else:
        dtype_flag = 0  # fp32

    # nameLen + name
    f.write(struct.pack("<I", len(name_bytes)))
    f.write(name_bytes)

    # dtype flag
    f.write(struct.pack("<I", dtype_flag))

    # ndims + shape
    f.write(struct.pack("<I", data.shape.__len__()))
    for dim in data.shape:
        f.write(struct.pack("<I", dim))

    if use_int8:
        # scale (f32) + int8 data
        f.write(struct.pack("<f", scale))
        data_bytes = quantized.tobytes()
    else:
        data_bytes = data.tobytes()

    # dataLen + alignment + data
    f.write(struct.pack("<I", len(data_bytes)))
    pos = f.tell()
    padding = (4 - pos % 4) % 4
    f.write(b"\x00" * padding)
    f.write(data_bytes)


def main():
    parser = argparse.ArgumentParser(description="Convert DeiT-Tiny weights for WebGPU")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/assets/models/deit-tiny-int8.bin"),
        help="Output path for weight binary",
    )
    parser.add_argument(
        "--model",
        default="deit_tiny_patch16_224",
        help="timm model name",
    )
    args = parser.parse_args()

    print(f"Loading {args.model}...")
    model = timm.create_model(args.model, pretrained=True)
    model.eval()
    state_dict = model.state_dict()

    print(f"Model has {sum(p.numel() for p in model.parameters())} parameters")

    # Collect tensors to export
    tensors: dict[str, torch.Tensor] = {}

    # Patch embedding (reshape conv2d to linear)
    tensors.update(reshape_patch_embed(state_dict))

    # CLS token and position embedding
    tensors["cls_token"] = state_dict["cls_token"].squeeze(0).squeeze(0)  # (192,)
    tensors["pos_embed"] = state_dict["pos_embed"].squeeze(0)  # (197, 192)

    # Transformer blocks
    # NOTE: PyTorch stores linear weights as (outDim, inDim).
    # Our WGSL shader expects (inDim, outDim) row-major layout:
    #   output[col] = sum_k(input[k] * weight[k * outDim + col])
    # So all linear weights must be transposed before export.
    for layer_idx in range(12):
        prefix = f"blocks.{layer_idx}"

        # Attention QKV (keep combined, transpose)
        tensors.update(convert_qkv_weights(state_dict, layer_idx))

        # Attention output projection (transpose)
        tensors[f"{prefix}.attn.proj.weight"] = state_dict[f"{prefix}.attn.proj.weight"].T.contiguous()
        tensors[f"{prefix}.attn.proj.bias"] = state_dict[f"{prefix}.attn.proj.bias"]

        # Layer norms
        tensors[f"{prefix}.norm1.weight"] = state_dict[f"{prefix}.norm1.weight"]
        tensors[f"{prefix}.norm1.bias"] = state_dict[f"{prefix}.norm1.bias"]
        tensors[f"{prefix}.norm2.weight"] = state_dict[f"{prefix}.norm2.weight"]
        tensors[f"{prefix}.norm2.bias"] = state_dict[f"{prefix}.norm2.bias"]

        # MLP (transpose weights)
        tensors[f"{prefix}.mlp.fc1.weight"] = state_dict[f"{prefix}.mlp.fc1.weight"].T.contiguous()
        tensors[f"{prefix}.mlp.fc1.bias"] = state_dict[f"{prefix}.mlp.fc1.bias"]
        tensors[f"{prefix}.mlp.fc2.weight"] = state_dict[f"{prefix}.mlp.fc2.weight"].T.contiguous()
        tensors[f"{prefix}.mlp.fc2.bias"] = state_dict[f"{prefix}.mlp.fc2.bias"]

    # Final layer norm (1D, no transpose needed)
    tensors["norm.weight"] = state_dict["norm.weight"]
    tensors["norm.bias"] = state_dict["norm.bias"]

    # Classification head (transpose weight)
    tensors["head.weight"] = state_dict["head.weight"].T.contiguous()
    tensors["head.bias"] = state_dict["head.bias"]

    # Write binary
    args.output.parent.mkdir(parents=True, exist_ok=True)

    total_params = sum(t.numel() for t in tensors.values())
    total_bytes = sum(t.numel() * 4 for t in tensors.values())  # fp32

    print(f"Exporting {len(tensors)} tensors, {total_params:,} parameters, ~{total_bytes / 1024 / 1024:.1f}MB")

    with open(args.output, "wb") as f:
        # Header
        f.write(b"DEIT")
        f.write(struct.pack("<I", 2))  # version (2 = int8 quantization support)
        f.write(struct.pack("<I", len(tensors)))

        # Tensors
        for name, tensor in sorted(tensors.items()):
            write_tensor(f, name, tensor)

    file_size = args.output.stat().st_size
    print(f"Wrote {file_size:,} bytes ({file_size / 1024 / 1024:.1f}MB) to {args.output}")

    # Also export labels
    export_imagenet_labels(args.output)

    # Print tensor inventory
    print("\nTensor inventory:")
    for name in sorted(tensors.keys()):
        t = tensors[name]
        print(f"  {name}: {list(t.shape)} ({t.numel():,} params)")


if __name__ == "__main__":
    main()
