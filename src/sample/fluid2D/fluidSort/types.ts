import { BindGroupCluster, createBindGroupCluster } from '../utils';

export enum StepEnum {
  NONE,
  FLIP_LOCAL,
  DISPERSE_LOCAL,
  FLIP_GLOBAL,
  DISPERSE_GLOBAL,
}

const getNumSteps = (numElements: number) => {
  const n = Math.log2(numElements);
  return (n * (n + 1)) / 2;
};

interface SpaitalSortResource {
  // Compute Resources
  stepsInSort: number;
  // Spatial Indices GPU Buffers
  spatialIndicesBuffer: GPUBuffer;
  spatialIndicesStagingBuffer: GPUBuffer;
  spatialIndicesWorkloadSize: number;
  // Spatial Offsets GPU Buffers
  spatialOffsetsBuffer: GPUBuffer;
  spatialOffsetsStagingBuffer: GPUBuffer;
  spatialOffsetsWorkloadSize: number;
  // Algo + BlockHeight Uniforms Buffer
  algoStorageBuffer: GPUBuffer;
  // Bind Groups
  dataStorageBGCluster: BindGroupCluster;
  algoStorageBGCluster: BindGroupCluster;
}

/**
 * @param {GPUDevice} device - The binding value of each resource in the bind group.
 * @param {number} numParticles - The number of particles being simulated
 * NOTE: Using this for spatial offsets is very brittle, and will increase your memory requirement depending on the number of cells needed.
 * However, for now in lieu of dealing with hash keys, I am using this method for now to prevent hash collisions
 * @param {totalCellsInHashGrid} resourceTypes - The total number of hash grid cells.
 * @returns {BindGroupsObjectsAndLayout} An object containing an array of bindGroups and the bindGroupLayout they implement.
 */
export const createSpatialSortResource = (
  device: GPUDevice,
  numParticles: number,
  totalCellsInHashGrid: number,
): SpaitalSortResource => {
  // Spatial Indices Calculations
  const spatialIndicesWorkloadSize = Math.ceil(
    (numParticles - 1) / (device.limits.maxComputeWorkgroupSizeX * 2)
  );
  const spatialIndicesBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * 2 * numParticles,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const spatialIndicesStagingBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * 2 * numParticles,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  // Spatial Offsets Calculations
  const spatialOffsetsWorkloadSize =
    numParticles / device.limits.maxComputeWorkgroupSizeX;
  /*const spatialOffsetsBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * numParticles,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  }); 
  const spatialOffsetsStagingBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * numParticles,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  }); */
  const spatialOffsetsBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * totalCellsInHashGrid,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  const spatialOffsetsStagingBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * totalCellsInHashGrid,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  // Algo Information Buffer
  const algoStorageBuffer = device.createBuffer({
    // algo, stepBlockHeight, highestBlockHeight, dispatchSize
    size: Uint32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const retObject: SpaitalSortResource = {
    stepsInSort: getNumSteps(numParticles),
    spatialIndicesBuffer,
    spatialIndicesWorkloadSize,
    spatialIndicesStagingBuffer,
    spatialOffsetsBuffer,
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
