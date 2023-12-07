import {
  BindGroupCluster,
  createBindGroupCluster,
  extractGPUData,
} from '../utils';
import { NaiveBitonicCompute } from './computeSort';
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

const getNumSteps = (numElements: number) => {
  const n = Math.log2(numElements);
  return (n * (n + 1)) / 2;
};

// TODO: Make sure to test this class in an arbitrary scenario before using in the fluid sim
export class SpatialInfoSort {
  // Compute Resources
  private maxWorkgroupSize: number;
  private particlesToSort: number;
  private workgroupsToDispatch: number;
  private stepsInSort: number;
  // Spatial Indices GPU Buffers
  private spatialIndicesBufferSize: number;
  private spatialIndicesInputBuffer: GPUBuffer;
  private spatialIndicesOutputBuffer: GPUBuffer;
  public spatialIndicesStagingBuffer: GPUBuffer;
  // Spatial Offsets GPU Buffer
  public spatialOffsetsBuffer: GPUBuffer;
  // Algo + BlockHeight Uniforms Buffer
  private algoStorageBuffer: GPUBuffer;
  // Bind Groups
  private dataStorageBGCluster: BindGroupCluster;
  private algoStorageBGCluster: BindGroupCluster;
  // Pipelines
  private sortSpatialIndicesPipeline: GPUComputePipeline;
  private computeSpatialOffsetsPipeline: GPUComputePipeline;

  constructor(device: GPUDevice, numParticles: number) {
    // Compute Resources
    this.maxWorkgroupSize = Math.min(
      numParticles / 2,
      device.limits.maxComputeWorkgroupSizeX
    );
    this.particlesToSort = numParticles;
    this.stepsInSort = getNumSteps(this.particlesToSort);
    const workgroupCalculation =
      (this.particlesToSort - 1) / (this.maxWorkgroupSize * 2);
    this.workgroupsToDispatch = Math.ceil(workgroupCalculation);

    // Spatial Indices vec3<u32>(index, hash, key) GPUBuffers
    this.spatialIndicesBufferSize =
      Uint32Array.BYTES_PER_ELEMENT * 3 * this.particlesToSort;
    this.spatialIndicesInputBuffer = device.createBuffer({
      size: this.spatialIndicesBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.spatialIndicesOutputBuffer = device.createBuffer({
      size: this.spatialIndicesBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this.spatialIndicesStagingBuffer = device.createBuffer({
      size: this.spatialIndicesBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Spatial Offsets uint
    this.spatialOffsetsBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * this.particlesToSort,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Uniforms (algo + blockHeight)
    this.algoStorageBuffer = device.createBuffer({
      // algo, stepBlockHeight, highestBlockHeight, dispatchSize
      size: Uint32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Bind Groups
    // 0: indices input 1: indices output 2: offsets
    this.dataStorageBGCluster = createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.storage',
      bindings: [0, 1, 2],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer', 'buffer'],
      resourceLayouts: [
        { type: 'storage' },
        { type: 'storage' },
        { type: 'storage' },
      ],
      resources: [
        [
          { buffer: this.spatialIndicesInputBuffer },
          { buffer: this.spatialIndicesOutputBuffer },
          { buffer: this.spatialOffsetsBuffer },
        ],
      ],
    });

    this.algoStorageBGCluster = createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.uniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'storage' }],
      resources: [[{ buffer: this.algoStorageBuffer }]],
    });

    // Pipelines
    this.sortSpatialIndicesPipeline = device.createComputePipeline({
      label: 'SpatialInfoSort.sortSpatialIndices.computePipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          this.dataStorageBGCluster.bindGroupLayout,
          this.algoStorageBGCluster.bindGroupLayout,
        ],
      }),
      compute: {
        entryPoint: 'computeMain',
        module: device.createShaderModule({
          code: NaiveBitonicCompute(this.maxWorkgroupSize),
        }),
      },
    });

    this.computeSpatialOffsetsPipeline = device.createComputePipeline({
      label: 'SpatialInfoSort.computeSpatialOffsets.computePipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.dataStorageBGCluster.bindGroupLayout],
      }),
      compute: {
        entryPoint: 'computeMain',
        module: device.createShaderModule({
          code: offsetsWGSL,
        }),
      },
    });
  }

  logSortInfo() {
    console.log(`Sorted Particles: ${this.particlesToSort}`);
    console.log(`Steps in Sort: ${this.stepsInSort}`);
    console.log(`Workgroup Size: ${this.maxWorkgroupSize}`);
    console.log(`Workgroups Dispatched Per Step: ${this.workgroupsToDispatch}`);
  }

  resetNumWorkgroups(numParticles: number) {
    const workgroupCalculation =
      (numParticles - 1) / (this.maxWorkgroupSize * 2);
    this.workgroupsToDispatch = Math.ceil(workgroupCalculation);
  }

  computeSpatialInformation(
    device: GPUDevice,
    commandEncoder: GPUCommandEncoder,
    initialValues: Uint32Array
  ) {
    // Check if the size of the initialValues array matches our buffer
    if (initialValues.byteLength !== this.spatialIndicesBufferSize) {
      console.log(
        'Incorrect arrayBuffer size. Size of spatialIndices array must be equal to Uint32Array.BytesPerElement * 3 * totalParticles'
      );
    }
    // Write initial values to buffer before sort
    device.queue.writeBuffer(
      this.spatialIndicesInputBuffer,
      0,
      initialValues.buffer,
      initialValues.byteOffset,
      initialValues.byteLength
    );

    // Set up the defaults at the beginning of an arbitrarily sized bitonic sort
    let nextBlockHeight = 2;
    let nextAlgo: StepType = 'FLIP_LOCAL';
    let highestBlockHeight = nextBlockHeight;
    const initialAlgoInfo = new Uint32Array([
      StepEnum[nextAlgo],
      nextBlockHeight,
      highestBlockHeight,
      this.workgroupsToDispatch,
    ]);
    console.log(initialAlgoInfo);
    // Write defaults to buffer
    device.queue.writeBuffer(
      this.algoStorageBuffer,
      0,
      initialAlgoInfo.buffer,
      initialAlgoInfo.byteOffset,
      initialAlgoInfo.byteLength
    );

    let step = 0;
    // We calculate the numSteps for a single complete pass of the bitonic sort because it allows the user to better debug where in the shader (i.e in which step)
    // something is going wrong
    for (let i = 0; i < this.stepsInSort; i++) {
      console.log(step);
      step += 1;
      const commandEncoder = device.createCommandEncoder();
      this.sortSpatialIndicesDiscrete(commandEncoder);
      nextBlockHeight /= 2;
      if (nextBlockHeight === 1) {
        highestBlockHeight *= 2;
        if (highestBlockHeight === this.particlesToSort * 2) {
          nextAlgo = 'NONE';
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
      }
      commandEncoder.copyBufferToBuffer(
        this.spatialIndicesOutputBuffer,
        0,
        this.spatialIndicesInputBuffer,
        0,
        this.spatialIndicesBufferSize
      );
      commandEncoder.copyBufferToBuffer(
        this.spatialIndicesInputBuffer,
        0,
        this.spatialIndicesStagingBuffer,
        0,
        this.spatialIndicesBufferSize
      );
    }
    //this.computeSpatialOffsets(commandEncoder);
  }

  computeSpatialOffsets(commandEncoder: GPUCommandEncoder) {
    const computeSpatialOffsetPassEncoder = commandEncoder.beginComputePass();
    computeSpatialOffsetPassEncoder.setPipeline(
      this.computeSpatialOffsetsPipeline
    );
    computeSpatialOffsetPassEncoder.setBindGroup(
      0,
      this.dataStorageBGCluster.bindGroups[0]
    );
    computeSpatialOffsetPassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    computeSpatialOffsetPassEncoder.end();
  }

  async logSpatialIndices() {
    let data: Uint32Array;
    {
      const output = await extractGPUData(
        this.spatialIndicesStagingBuffer,
        this.spatialIndicesBufferSize
      );
      data = new Uint32Array(output);
      console.log(data);
    }
  }

  sortSpatialIndicesDiscrete(commandEncoder: GPUCommandEncoder) {
    // Perform the compute Pass
    const sortSpatialIndicesComputePassEncoder =
      commandEncoder.beginComputePass();
    // Set the resources for this pass of the compute shader
    sortSpatialIndicesComputePassEncoder.setPipeline(
      this.sortSpatialIndicesPipeline
    );
    sortSpatialIndicesComputePassEncoder.setBindGroup(
      0,
      this.dataStorageBGCluster.bindGroups[0]
    );
    sortSpatialIndicesComputePassEncoder.setBindGroup(
      1,
      this.algoStorageBGCluster.bindGroups[0]
    );
    // Dispatch workgroups
    sortSpatialIndicesComputePassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    sortSpatialIndicesComputePassEncoder.end();
    // Copy output data back to in
  }

  sortSpatialIndicesNonDiscrete(commandEncoder: GPUCommandEncoder) {
    return;
  }
}
