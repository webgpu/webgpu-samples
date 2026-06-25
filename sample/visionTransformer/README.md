# Vision Transformer (ViT) — WebGPU Compute

Runs a DeiT-Tiny vision transformer (5.7M params) entirely in WebGPU compute shaders to classify images, and visualizes per-head attention maps as interactive heatmap overlays.

**[Live demo](https://lyonsno.github.io/webgpu-samples/)**

## What it does

1. **Patch embedding**: splits a 224x224 image into a 14x14 grid of 16x16-pixel patches, projects each to a 192-dim token
2. **12 transformer blocks**: each applies layer normalization, multi-head self-attention (3 heads), and an MLP with GELU activation, connected by residual additions
3. **Classification**: the CLS token is projected to 1000 ImageNet class logits
4. **Attention visualization**: select any layer and head to see which image patches the model attends to, rendered as a viridis heatmap overlay

## Running locally

```bash
npm install
npm run serve
# Open http://localhost:8080/?sample=visionTransformer
```

## Model weights

The int8-quantized weight file (`public/assets/models/deit-tiny-int8.bin`, 5.5MB) is derived from Meta's [DeiT-Tiny](https://huggingface.co/facebook/deit-tiny-patch16-224) (Apache-2.0). To regenerate:

```bash
pip install torch timm
python tools/convert_deit_weights.py
```

## Files

| File | Description |
|------|-------------|
| `main.ts` | UI, image loading, WebGPU setup |
| `inference.ts` | Forward pass orchestration (patch embed → 12 transformer blocks → classify) |
| `weights.ts` | Binary weight loader with int8 dequantization |
| `visualize.ts` | Attention map extraction and heatmap rendering |
| `shaders/patchEmbed.wgsl` | Image patches → token embeddings |
| `shaders/layerNorm.wgsl` | Layer normalization |
| `shaders/mlp.wgsl` | Feed-forward network (linear + GELU) |
| `shaders/attnScores.wgsl` | Q·K^T scaled dot-product scores |
| `shaders/attnSoftmax.wgsl` | Softmax normalization + attention weight storage |
| `shaders/attnApply.wgsl` | Attention-weighted value summation |
| `shaders/visualize.wgsl` | Viridis heatmap overlay render pass |

## License

Sample code: BSD-3-Clause (matching webgpu-samples).
Model weights: Apache-2.0 (Meta DeiT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
