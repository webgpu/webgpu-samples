// Weight loading for DeiT-Tiny
// Binary format (v2):
//   magic (4 bytes): "DEIT"
//   version (u32): 2
//   numTensors (u32)
//   For each tensor:
//     nameLen (u32), name (UTF-8)
//     dtype (u32): 0=fp32, 1=int8
//     ndims (u32), shape (ndims * u32)
//     [if int8: scale (f32)]
//     dataLen (u32), [align to 4], data
//
// Int8 tensors are dequantized to fp32 during loading:
//   float_value = int8_value * scale

export interface TensorData {
  name: string;
  shape: number[];
  data: Float32Array;
}

export interface ModelWeights {
  tensors: Map<string, TensorData>;
}

export async function loadWeights(url: string): Promise<ModelWeights> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load weights: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const view = new DataView(buffer);
  let offset = 0;

  const magic = String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
  offset += 4;
  if (magic !== 'DEIT') {
    throw new Error(`Invalid weight file magic: ${magic}`);
  }

  const version = view.getUint32(offset, true);
  offset += 4;
  if (version !== 2) {
    throw new Error(`Unsupported weight file version: ${version}`);
  }

  const numTensors = view.getUint32(offset, true);
  offset += 4;

  const tensors = new Map<string, TensorData>();

  for (let t = 0; t < numTensors; t++) {
    const nameLen = view.getUint32(offset, true);
    offset += 4;
    const nameBytes = new Uint8Array(buffer, offset, nameLen);
    const name = new TextDecoder().decode(nameBytes);
    offset += nameLen;

    const dtype = view.getUint32(offset, true);
    offset += 4;

    const ndims = view.getUint32(offset, true);
    offset += 4;
    const shape: number[] = [];
    let numElements = 1;
    for (let d = 0; d < ndims; d++) {
      const dim = view.getUint32(offset, true);
      shape.push(dim);
      numElements *= dim;
      offset += 4;
    }

    let scale = 0;
    if (dtype === 1) {
      scale = view.getFloat32(offset, true);
      offset += 4;
    }

    const dataLen = view.getUint32(offset, true);
    offset += 4;

    const alignedOffset = (offset + 3) & ~3;

    let data: Float32Array;
    if (dtype === 1) {
      // Int8: dequantize to fp32
      const int8Data = new Int8Array(buffer, alignedOffset, numElements);
      data = new Float32Array(numElements);
      for (let i = 0; i < numElements; i++) {
        data[i] = int8Data[i] * scale;
      }
    } else {
      // FP32: read directly
      data = new Float32Array(
        buffer.slice(alignedOffset, alignedOffset + dataLen)
      );
    }
    offset = alignedOffset + dataLen;

    tensors.set(name, { name, shape, data });
  }

  return { tensors };
}

export function createTensorBuffer(
  device: GPUDevice,
  tensor: TensorData,
  usage: GPUBufferUsageFlags = GPUBufferUsage.STORAGE
): GPUBuffer {
  const buf = device.createBuffer({
    size: tensor.data.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(buf.getMappedRange()).set(tensor.data);
  buf.unmap();
  return buf;
}

// DeiT-Tiny model configuration.
// These values define the network architecture. Changing them requires
// a matching weight file — the shapes of all weight tensors depend on
// these dimensions.
export const DEIT_CONFIG = {
  imgSize: 224,
  patchSize: 16,
  numPatches: 196, // (224/16)^2
  numTokens: 197, // numPatches + 1 (CLS token)
  channels: 3,
  dim: 192,
  numHeads: 3,
  headDim: 64, // dim / numHeads
  mlpHiddenDim: 768, // dim * 4
  numLayers: 12,
  numClasses: 1000,
  scale: 1.0 / Math.sqrt(64), // 1/sqrt(headDim)
} as const;
