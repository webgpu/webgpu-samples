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
  x: number,
  y: number,
  w: number,
  h: number
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

  const boundsX = w;
  const boundsY = h;

  // Generate positions data and velocities data for their respective buffers
  // Positions are set between position x to x + w, y to y + h
  for (let i = 0; i < numParticles; i++) {
    // Position
    inputPositions[i * 2 + 0] = x + Math.random() * w;
    inputPositions[i * 2 + 1] = y + Math.random() * h;

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

// Distributions from this link
// https://matthias-research.github.io/pages/publications/sca03.pdf
export const calculateDistributionScales = (
  smoothingRadius: number,
  mass: number,
) => {
  const pow6 = Math.pow(smoothingRadius, 6);
  const pow9 = Math.pow(smoothingRadius, 9);
  const poly6Scale = 315.0 / (64.0 * Math.PI * pow9);
  const spikyGradScale = -45.0 / (Math.PI * pow6);
  const spikyLapacianScale = 45.0 / (Math.PI * pow6);
  const srSquared = smoothingRadius * smoothingRadius;
  const massPoly6 = mass * poly6Scale;
  const selfDensity = massPoly6 * pow6;
  return {
    poly6Scale,
    spikyGradScale,
    spikyLapacianScale,
    srSquared,
    massPoly6,
    selfDensity,
  }
};

// Main.ts utils
export type DebugPropertySelect =
  | 'Positions'
  | 'Velocities'
  | 'Predicted Positions'
  | 'Densities'
  | 'Spatial Indices'
  | 'Spatial Offsets';

export type SimulateState = 'PAUSE' | 'RUN' | 'RESET';


