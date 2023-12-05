import { BindGroupCluster } from '../utils';
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

export class SpatialInfoSort {
  private sortSpatialIndicesPipeline: GPUComputePipeline;
  private maxWorkgroupSize: number;
  private particlesToSort: number;
  private computeSpatialOffsetsPipeline: GPUComputePipeline;
  private uniformsBuffer: GPUBuffer;
  private workgroupsToDispatch: number;

  constructor(device: GPUDevice, numParticles: number) {
    this.maxWorkgroupSize = device.limits.maxComputeWorkgroupSizeX;
    this.workgroupsToDispatch = Math.ceil(numParticles / this.maxWorkgroupSize);

    const storageBGLayout = device.createBindGroupLayout({
      label: 'SpatialInfoSort.bindGroupLayout',
      entries: [
        {
          binding: 0,
          buffer: {
            type: 'storage',
          },
          visibility: GPUShaderStage.COMPUTE,
        },
        {
          binding: 1,
          buffer: {
            type: 'storage',
          },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    const uniformsBGLayout = device.createBindGroupLayout({
      label: 'SpatialInfoSort.bindGroupLayout',
      entries: [
        {
          binding: 0,
          buffer: {
            type: 'uniform',
          },
          visibility: GPUShaderStage.COMPUTE,
        },
      ],
    });

    this.sortSpatialIndicesPipeline = device.createComputePipeline({
      label: 'SpatialInfoSort.sortSpatialIndices.computePipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [storageBGLayout, uniformsBGLayout],
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
        bindGroupLayouts: [storageBGLayout],
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
    commandEncoder: GPUCommandEncoder,
    storageBindGroup: GPUBindGroup,
    uniformsBindGroup: GPUBindGroup,
    uniformsBuffer: GPUBuffer
  ) {
    // Set up the defaults at the beginning of an arbitrarily sized bitonic sort
    let prevBlockHeight = 0;
    let nextBlockHeight = 2;
    let nextAlgo: StepType = 'FLIP_LOCAL';
    let highestBlockHeight = nextBlockHeight;
    // Write defaults to buffer
    device.queue.writeBuffer(
      uniformsBuffer,
      0,
      new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
    );
    // Perform each step of the bitonic sort in sequence
    while (highestBlockHeight !== this.particlesToSort * 2) {
      this.sortSpatialIndices(
        commandEncoder,
        storageBindGroup,
        uniformsBindGroup
      );
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
          uniformsBuffer,
          0,
          new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
        );
      }
    }
  }

  private sortSpatialIndices(
    commandEncoder: GPUCommandEncoder,
    storageBindGroup: GPUBindGroup,
    uniformsBindGroup: GPUBindGroup
  ) {
    const sortSpatialIndicesComputePassEncoder =
      commandEncoder.beginComputePass();
    sortSpatialIndicesComputePassEncoder.setPipeline(
      this.sortSpatialIndicesPipeline
    );
    sortSpatialIndicesComputePassEncoder.setBindGroup(0, storageBindGroup);
    sortSpatialIndicesComputePassEncoder.setBindGroup(1, uniformsBindGroup);
    sortSpatialIndicesComputePassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    sortSpatialIndicesComputePassEncoder.end();
  }
}