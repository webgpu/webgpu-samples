import { BindGroupCluster, createBindGroupCluster } from '../utils';

export enum StepEnum {
  NONE,
  FLIP_LOCAL,
  DISPERSE_LOCAL,
  FLIP_GLOBAL,
  DISPERSE_GLOBAL,
}

// String access to StepEnum
export type StepType =
  | 'NONE'
  | 'FLIP_LOCAL'
  | 'DISPERSE_LOCAL'
  | 'FLIP_GLOBAL'
  | 'DISPERSE_GLOBAL';

const getNumSteps = (numElements: number) => {
  const n = Math.log2(numElements);
  return (n * (n + 1)) / 2;
};

interface SpaitalSortResource {
  // Compute Resources
  stepsInSort: number;
  // Spatial Indices GPU Buffers
  spatialIndicesBuffer: GPUBuffer;
  spatialIndicesBufferSize: number;
  spatialIndicesStagingBuffer: GPUBuffer;
  spatialIndicesWorkloadSize: number;
  // Spatial Offsets GPU Buffer
  spatialOffsetsBuffer: GPUBuffer;
  spatialOffsetsBufferSize: number;
  spatialOffsetsStagingBuffer: GPUBuffer;
  spatialOffsetsWorkloadSize: number;
  // Algo + BlockHeight Uniforms Buffer
  algoStorageBuffer: GPUBuffer;
  // Bind Groups
  dataStorageBGCluster: BindGroupCluster;
  algoStorageBGCluster: BindGroupCluster;
}

export const createSpatialSortResource = (
  device: GPUDevice,
  numParticles: number
): SpaitalSortResource => {
  // Max workgroups * 2
  const spatialIndicesWorkloadSize = Math.ceil(
    (numParticles - 1) / (device.limits.maxComputeWorkgroupSizeX * 2)
  );
  const spatialOffsetsWorkloadSize =
    numParticles / device.limits.maxComputeWorkgroupSizeX;
  const spatialIndicesBufferSize =
    Float32Array.BYTES_PER_ELEMENT * 3 * numParticles;
  const spatialOffsetsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numParticles;
  const bufferUsage =
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

  const spatialIndicesBuffer = device.createBuffer({
    size: spatialIndicesBufferSize,
    usage: bufferUsage,
  });

  const spatialOffsetsBuffer = device.createBuffer({
    size: spatialOffsetsBufferSize,
    usage: bufferUsage,
  });

  const algoStorageBuffer = device.createBuffer({
    // algo, stepBlockHeight, highestBlockHeight, dispatchSize
    size: Uint32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const spatialIndicesStagingBuffer = device.createBuffer({
    size: spatialIndicesBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const spatialOffsetsStagingBuffer = device.createBuffer({
    size: spatialOffsetsBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  const retObject: SpaitalSortResource = {
    stepsInSort: getNumSteps(numParticles),
    spatialIndicesBuffer,
    spatialIndicesBufferSize,
    spatialIndicesWorkloadSize,
    spatialIndicesStagingBuffer,
    spatialOffsetsBuffer,
    spatialOffsetsBufferSize,
    spatialOffsetsWorkloadSize,
    spatialOffsetsStagingBuffer,
    algoStorageBuffer,
    dataStorageBGCluster: createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.storage',
      bindings: [0, 1],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer'],
      resourceLayouts: [{ type: 'storage' }, { type: 'storage' }],
      // Spatial Indices First then spatial offsets
      resources: [
        [{ buffer: spatialIndicesBuffer }, { buffer: spatialOffsetsBuffer }],
      ],
    }),
    algoStorageBGCluster: createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.uniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'storage' }],
      resources: [[{ buffer: algoStorageBuffer }]],
    }),
  };
  return retObject;
};
