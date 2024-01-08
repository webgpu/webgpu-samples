// WEBGPU SPECIFIC UTILS
type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

// An object containing
// 1. A generated Bind Group Layout
// 2. An array of Bind Groups that accord to that layout
export type BindGroupCluster = {
  bindGroups: GPUBindGroup[];
  bindGroupLayout: GPUBindGroupLayout;
};

type ResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

interface CreateBindGroupClusterArgs {
  device: GPUDevice;
  label: string;
  bindings: number[];
  visibilities: number[];
  resourceTypes: ResourceTypeName[];
  resourceLayouts: BindGroupBindingLayout[];
  resources: GPUBindingResource[][];
}

export const createBindGroupCluster = (
  args: CreateBindGroupClusterArgs
): BindGroupCluster => {
  const {
    device,
    label,
    bindings,
    visibilities,
    resourceTypes,
    resourceLayouts,
    resources,
  } = args;
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < bindings.length; i++) {
    layoutEntries.push({
      binding: bindings[i],
      visibility: visibilities[i % visibilities.length],
      [resourceTypes[i]]: resourceLayouts[i],
    });
  }

  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}.bindGroupLayout`,
    entries: layoutEntries,
  });

  const bindGroups: GPUBindGroup[] = [];
  //i represent the bindGroup index, j represents the binding index of the resource within the bindgroup
  //i=0, j=0  bindGroup: 0, binding: 0
  //i=1, j=1, bindGroup: 0, binding: 1
  //NOTE: not the same as @group(0) @binding(1) group index within the fragment shader is set within a pipeline
  for (let i = 0; i < resources.length; i++) {
    const groupEntries: GPUBindGroupEntry[] = [];
    for (let j = 0; j < resources[0].length; j++) {
      groupEntries.push({
        binding: j,
        resource: resources[i][j],
      });
    }
    const newBindGroup = device.createBindGroup({
      label: `${label}.bindGroup${i}`,
      layout: bindGroupLayout,
      entries: groupEntries,
    });
    bindGroups.push(newBindGroup);
  }

  return {
    bindGroups,
    bindGroupLayout,
  };
};

type ArrayBufferDataFormat = 'Uint32' | 'Uint16' | 'Float32';

export const typeArrayBuffer = (
  buffer: ArrayBuffer,
  format: ArrayBufferDataFormat
) => {
  switch (format) {
    case 'Float32': {
      return new Float32Array(buffer);
    }
    case 'Uint32': {
      return new Uint32Array(buffer);
    }
    case 'Uint16': {
      return new Uint16Array(buffer);
    }
  }
};

export const extractGPUData = async (
  stagingBuffer: GPUBuffer,
  srcBufferSize: number
) => {
  await stagingBuffer.mapAsync(GPUMapMode.READ, 0, srcBufferSize);
  const copyBuffer = stagingBuffer.getMappedRange(0, srcBufferSize);
  return copyBuffer.slice(0, srcBufferSize);
};

// SPH FLUID SPECIFIC UTILS
export const generateParticleData = (
  numParticles: number,
  x_start: number,
  y_start: number,
  width: number,
  height: number
): {
  inputPositions: Float32Array;
  inputVelocities: Float32Array;
} => {
  const inputPositions = new Float32Array(
    new ArrayBuffer(numParticles * 2 * Float32Array.BYTES_PER_ELEMENT)
  );
  // Create buffer for default velocities data
  const inputVelocities = new Float32Array(
    new ArrayBuffer(numParticles * 2 * Float32Array.BYTES_PER_ELEMENT)
  );
  // Generate positions data and velocities data for their respective buffers
  // Positions are set between position x to x + w, y to y + h
  for (let i = 0; i < numParticles; i++) {
    // Position
    inputPositions[i * 2 + 0] = x_start + Math.random() * width;
    inputPositions[i * 2 + 1] = y_start + Math.random() * height;

    // Velocity
    inputVelocities[i * 2 + 0] = 0;
    inputVelocities[i * 2 + 1] = 0;
  }

  return {
    inputPositions,
    inputVelocities,
  };
};

export interface DistributionSettings {
  poly6Scale: number;
  spikyGradScale: number;
  spikyLapacianScale: number;
  srSquared: number;
  massPoly6: number;
  selfDensity: number;
}

// Main.ts utils
export type SpatialIndicesDebugPropertySelect =
  | 'Spatial Indices'
  | 'Spatial Indices (Idx)'
  | 'Spatial Indices (Hash)'
  | 'Spatial Indices (Key)';

export type DebugPropertySelect =
  | 'Positions'
  | 'Velocities'
  | 'Current Forces'
  | 'Pressures'
  | 'Densities'
  | SpatialIndicesDebugPropertySelect
  | 'Spatial Offsets';

export type SimulateState = 'PAUSE' | 'RUN' | 'RESET';
