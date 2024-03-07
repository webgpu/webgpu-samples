import { gridVertices, gridIndices, gridJoints, gridWeights } from './gridData';

// Uses constant grid data to create appropriately sized GPU Buffers for our skinned grid
export const createSkinnedGridBuffers = (device: GPUDevice) => {
  // Utility function that creates GPUBuffers from data
  const createBuffer = (
    data: Float32Array | Uint32Array,
    type: 'f32' | 'u32'
  ) => {
    const buffer = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    if (type === 'f32') {
      new Float32Array(buffer.getMappedRange()).set(data);
    } else {
      new Uint32Array(buffer.getMappedRange()).set(data);
    }
    buffer.unmap();
    return buffer;
  };
  const positionsBuffer = createBuffer(gridVertices, 'f32');
  const jointsBuffer = createBuffer(gridJoints, 'u32');
  const weightsBuffer = createBuffer(gridWeights, 'f32');
  const indicesBuffer = device.createBuffer({
    size: Uint16Array.BYTES_PER_ELEMENT * gridIndices.length,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  new Uint16Array(indicesBuffer.getMappedRange()).set(gridIndices);
  indicesBuffer.unmap();

  return {
    positions: positionsBuffer,
    joints: jointsBuffer,
    weights: weightsBuffer,
    indices: indicesBuffer,
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
      buffers: [
        // Vertex Positions (positions)
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
        // Bone Indices (joints)
        {
          arrayStride: Uint32Array.BYTES_PER_ELEMENT * 4,
          attributes: [
            {
              format: 'uint32x4',
              offset: 0,
              shaderLocation: 1,
            },
          ],
        },
        // Bone Weights (weights)
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
