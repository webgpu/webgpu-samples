import {
  BindGroupCluster,
  createBindGroupCluster,
  extractGPUData,
} from '../utils';
import { sortWGSL } from './sortWGSL';
import offsetsWGSL from './offsets.wgsl';

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
  maxWorkgroupSize: number;
  stepsInSort: number;
  workgroupsToDispatch: number;
  // Spatial Indices GPU Buffers
  spatialIndicesBuffer: GPUBuffer;
  spatialIndicesBufferSize: number;
  spatialIndicesStagingBuffer?: GPUBuffer;
  // Spatial Offsets GPU Buffer
  spatialOffsetsBuffer: GPUBuffer;
  spatialOffsetsBufferSize: number;
  spatialOffsetsStagingBuffer?: GPUBuffer;
  // Algo + BlockHeight Uniforms Buffer
  algoStorageBuffer: GPUBuffer;
  // Bind Groups
  dataStorageBGCluster: BindGroupCluster;
  algoStorageBGCluster: BindGroupCluster;
}

interface CreateSpaitalSortResourceArgs {
  device: GPUDevice;
  numParticles: number;
  createStagingBuffers: boolean;
}

export const createSpatialSortResource = (
  args: CreateSpaitalSortResourceArgs
): SpaitalSortResource => {
  const { device, numParticles, createStagingBuffers } = args;
  const workgroupCalculation =
    (numParticles - 1) / (device.limits.maxComputeWorkgroupSizeX * 2);
  const indicesBufferSize = Uint32Array.BYTES_PER_ELEMENT * 3 * numParticles;
  const offsetsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numParticles;
  const bufferUsage = createStagingBuffers
    ? GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;

  const inputBuffer = device.createBuffer({
    size: indicesBufferSize,
    usage: bufferUsage,
  });

  const offsetsBuffer = device.createBuffer({
    size: offsetsBufferSize,
    usage: bufferUsage,
  });

  const algoStorageBuffer = device.createBuffer({
    // algo, stepBlockHeight, highestBlockHeight, dispatchSize
    size: Uint32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const retObject: SpaitalSortResource = {
    maxWorkgroupSize: Math.min(
      numParticles / 2,
      device.limits.maxComputeWorkgroupSizeX
    ),
    stepsInSort: getNumSteps(numParticles),
    workgroupsToDispatch: Math.ceil(workgroupCalculation),
    spatialIndicesBufferSize: indicesBufferSize,
    spatialIndicesBuffer: inputBuffer,
    spatialOffsetsBuffer: offsetsBuffer,
    spatialOffsetsBufferSize: offsetsBufferSize,
    algoStorageBuffer,
    dataStorageBGCluster: createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.storage',
      bindings: [0, 1],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer'],
      resourceLayouts: [{ type: 'storage' }, { type: 'storage' }],
      resources: [[{ buffer: inputBuffer }, { buffer: offsetsBuffer }]],
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
  if (createStagingBuffers) {
    const indicesStagingBuffer = device.createBuffer({
      size: indicesBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const offsetsStagingBuffer = device.createBuffer({
      size: offsetsBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    retObject.spatialIndicesStagingBuffer = indicesStagingBuffer;
    retObject.spatialOffsetsStagingBuffer = offsetsStagingBuffer;
  }
  return retObject;
};
