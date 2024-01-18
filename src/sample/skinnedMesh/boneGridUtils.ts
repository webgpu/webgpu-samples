import { create3DRenderPipeline } from '../normalMap/utils';
import {
  gridBoneIndices,
  gridBoneWeights,
  gridVertices,
  gridIndices,
} from './gridData';

export const createSkinnedGridBuffers = (device: GPUDevice) => {
  const createBuffer = (data: Float32Array) => {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  };
  const positionsBuffer = createBuffer(gridVertices);
  const boneIndicesBuffer = createBuffer(gridBoneIndices);
  const boneWeightsBuffer = createBuffer(gridBoneWeights);
  const indicesBuffer = device.createBuffer({
    size: gridIndices.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  new Uint16Array(indicesBuffer.getMappedRange()).set(gridIndices);

  return {
    vertPositions: positionsBuffer,
    boneIndices: boneIndicesBuffer,
    boneWeights: boneWeightsBuffer,
    vertIndices: indicesBuffer,
  };
};

export const createSkinnedGridRenderPipeline = (
  device: GPUDevice,
  presentationFormat: GPUTextureFormat,
  vertexShader: string,
  fragmentShader: string,
  cameraBGLayout: GPUBindGroupLayout,
  boneBGLayout: GPUBindGroupLayout
) => {
  const pipeline = create3DRenderPipeline(
    device,
    'SkinnedGridRenderer',
    [cameraBGLayout, boneBGLayout],
    vertexShader,
    // vertPos    // boneIndices //boneWeights
    ['float32x4', 'float32x4', 'float32x4'],
    fragmentShader,
    presentationFormat,
    false,
    'line-list'
  );
  return pipeline;
};

// In Shader...
// Bones[gridBoneIndices[0][0] * BonePositions[0] * gridBoneWeights[0][0] +
// Bones[gridBoneIndices[0][1] * BonePositions[0] * gridBoneWeights[0][1] +
// Bones[gridBoneIndices[0][2] * BonePositions[0] * gridBoneWeights[0][2] +
// Bones[gridBoneIndices[0][3] * BonePositions[0] * gridBoneWeights[0][3]
