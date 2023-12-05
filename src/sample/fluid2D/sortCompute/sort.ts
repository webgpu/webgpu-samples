import { BindGroupCluster, createBindGroupCluster } from '../utils';
import sortWGSL from './sort.wgsl';
import offsetsWGSL from './offsets.wgsl';

enum StepEnum {
  NONE,
  FLIP_LOCAL,
  DISPERSE_LOCAL,
  FLIP_GLOBAL,
  DISPERSE_GLOBAL,
}

// String access to StepEnum
type StepType =
  | 'NONE'
  | 'FLIP_LOCAL'
  | 'DISPERSE_LOCAL'
  | 'FLIP_GLOBAL'
  | 'DISPERSE_GLOBAL';

// TODO: Make sure to test this class in an arbitrary scenario before using in the fluid sim
export class SpatialInfoSort {
  private sortSpatialIndicesPipeline: GPUComputePipeline;
  private maxWorkgroupSize: number;
  private particlesToSort: number;
  private computeSpatialOffsetsPipeline: GPUComputePipeline;
  public spatialIndicesBuffer: GPUBuffer;
  public spatialOffsetsBuffer: GPUBuffer;
  private uniformsBuffer: GPUBuffer;
  private workgroupsToDispatch: number;
  private storageBGCluster: BindGroupCluster;
  private uniformsBGCluster: BindGroupCluster;

  constructor(device: GPUDevice, numParticles: number) {
    this.maxWorkgroupSize = device.limits.maxComputeWorkgroupSizeX;
    this.workgroupsToDispatch = Math.ceil(numParticles / this.maxWorkgroupSize);

    // vec3<u32>(index, hash, key)
    this.spatialIndicesBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 3 * numParticles,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // uint
    this.spatialOffsetsBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * numParticles
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });

    this.uniformsBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 2,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    this.storageBGCluster = createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.storage',
      bindings: [0, 1],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer'],
      resourceLayouts: [{ type: 'storage' }, { type: 'storage' }],
      resources: [
        [
          { buffer: this.spatialIndicesBuffer },
          { buffer: this.spatialOffsetsBuffer },
        ],
      ],
    });

    this.uniformsBGCluster = createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.uniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      resources: [[{ buffer: this.uniformsBuffer }]],
    });

    this.sortSpatialIndicesPipeline = device.createComputePipeline({
      label: 'SpatialInfoSort.sortSpatialIndices.computePipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          this.storageBGCluster.bindGroupLayout,
          this.uniformsBGCluster.bindGroupLayout,
        ],
      }),
      compute: {
        entryPoint: 'computeMain',
        module: device.createShaderModule({
          code: sortWGSL,
        }),
      },
    });

    this.computeSpatialOffsetsPipeline = device.createComputePipeline({
      label: 'SpatialInfoSort.computeSpatialOffsets.computePipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.storageBGCluster.bindGroupLayout],
      }),
      compute: {
        entryPoint: 'computeMain',
        module: device.createShaderModule({
          code: offsetsWGSL,
        }),
      },
    });
  }

  resetNumWorkgroups(numParticles: number) {
    this.workgroupsToDispatch = Math.ceil(numParticles / this.maxWorkgroupSize);
  }

  computeSpatialInformation(
    device: GPUDevice,
    commandEncoder: GPUCommandEncoder
  ) {
    // Set up the defaults at the beginning of an arbitrarily sized bitonic sort
    let nextBlockHeight = 2;
    let nextAlgo: StepType = 'FLIP_LOCAL';
    let highestBlockHeight = nextBlockHeight;
    // Write defaults to buffer
    device.queue.writeBuffer(
      this.uniformsBuffer,
      0,
      new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
    );
    // Perform each step of the bitonic sort in sequence
    while (highestBlockHeight !== this.particlesToSort * 2) {
      this.sortSpatialIndices(commandEncoder);
      nextBlockHeight /= 2;
      if (nextBlockHeight === 1) {
        highestBlockHeight *= 2;
        if (highestBlockHeight === this.particlesToSort * 2) {
          nextAlgo = 'NONE';
          nextBlockHeight = 0;
        } else if (highestBlockHeight > this.maxWorkgroupSize * 2) {
          nextAlgo = 'FLIP_GLOBAL';
          nextBlockHeight = highestBlockHeight;
        } else {
          nextAlgo = 'FLIP_LOCAL';
          nextBlockHeight = highestBlockHeight;
        }
      } else {
        nextBlockHeight > this.maxWorkgroupSize * 2
          ? (nextAlgo = 'DISPERSE_GLOBAL')
          : (nextAlgo = 'DISPERSE_LOCAL');
        device.queue.writeBuffer(
          this.uniformsBuffer,
          0,
          new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
        );
      }
    }
    this.computeSpatialOffset(commandEncoder);
  }

  private computeSpatialOffset(commandEncoder: GPUCommandEncoder) {
    const computeSpatialOffsetPassEncoder = commandEncoder.beginComputePass();
    computeSpatialOffsetPassEncoder.setPipeline(
      this.computeSpatialOffsetsPipeline
    );
    computeSpatialOffsetPassEncoder.setBindGroup(
      0,
      this.storageBGCluster.bindGroups[0]
    );
    computeSpatialOffsetPassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    computeSpatialOffsetPassEncoder.end();
  }

  private sortSpatialIndices(commandEncoder: GPUCommandEncoder) {
    const sortSpatialIndicesComputePassEncoder =
      commandEncoder.beginComputePass();
    sortSpatialIndicesComputePassEncoder.setPipeline(
      this.sortSpatialIndicesPipeline
    );
    sortSpatialIndicesComputePassEncoder.setBindGroup(
      0,
      this.storageBGCluster.bindGroups[0]
    );
    sortSpatialIndicesComputePassEncoder.setBindGroup(
      1,
      this.uniformsBGCluster.bindGroups[0]
    );
    sortSpatialIndicesComputePassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    sortSpatialIndicesComputePassEncoder.end();
  }
}
