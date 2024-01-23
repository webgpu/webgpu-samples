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
    size: Uint16Array.BYTES_PER_ELEMENT * gridIndices.length,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  new Uint16Array(indicesBuffer.getMappedRange()).set(gridIndices);
  indicesBuffer.unmap();

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
  bgLayouts: GPUBindGroupLayout[]
) => {
  const pipeline = device.createRenderPipeline({
    label: 'SkinnedGridRenderer',
    layout: device.createPipelineLayout({
      label: `SkinnedGridRenderer.pipelineLayout`,
      bindGroupLayouts: bgLayouts,
    }),
    vertex: {
      module: device.createShaderModule({
        label: `SkinnedGridRenderer.vertexShader`,
        code: vertexShader,
      }),
      entryPoint: 'vertexMain',
      buffers: [
        // Vert Positions
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
          attributes: [
            {
              format: 'float32x2',
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
        // Bone Indicies
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 4,
          attributes: [
            {
              format: 'float32x4',
              offset: 0,
              shaderLocation: 1,
            },
          ],
        },
        // Bone Weights
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 4,
          attributes: [
            {
              format: 'float32x4',
              offset: 0,
              shaderLocation: 2,
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        label: `SkinnedGridRenderer.fragmentShader`,
        code: fragmentShader,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'line-list',
    },
  });
  return pipeline;
};

// In Shader...
// Bones[gridBoneIndices[0][0] * BonePositions[0] * gridBoneWeights[0][0] +
// Bones[gridBoneIndices[0][1] * BonePositions[0] * gridBoneWeights[0][1] +
// Bones[gridBoneIndices[0][2] * BonePositions[0] * gridBoneWeights[0][2] +
// Bones[gridBoneIndices[0][3] * BonePositions[0] * gridBoneWeights[0][3]
