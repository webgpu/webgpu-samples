import { BindGroupCluster, createBindGroupCluster } from '../utils';
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

// TODO: Make sure to test this class in an arbitrary scenario before using in the fluid sim
export class SpatialInfoSort {
  // Compute Resources
  private maxWorkgroupSize: number;
  private particlesToSort: number;
  private workgroupsToDispatch: number;
  // Spatial Indices GPU Buffers
  private spatialIndicesBufferSize: number;
  public spatialIndicesInputBuffer: GPUBuffer;
  public spatialIndicesOutputBuffer: GPUBuffer;
  public spatialIndicesStagingBuffer: GPUBuffer;
  // Spatial Offsets GPU Buffer
  public spatialOffsetsBuffer: GPUBuffer;
  // Algo + BlockHeight Uniforms Buffer
  private uniformsBuffer: GPUBuffer;
  // Bind Groups
  private storageBGCluster: BindGroupCluster;
  private uniformsBGCluster: BindGroupCluster;
  // Pipelines
  private sortSpatialIndicesPipeline: GPUComputePipeline;
  private computeSpatialOffsetsPipeline: GPUComputePipeline;

  constructor(device: GPUDevice, numParticles: number) {
    // Compute Resources
    this.maxWorkgroupSize = device.limits.maxComputeWorkgroupSizeX;
    this.particlesToSort = numParticles;
    const workgroupCalculation =
      (numParticles - 1) / (this.maxWorkgroupSize * 2);
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
    this.uniformsBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * 2,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    // Bind Groups
    // 0: indices input 1: indices output 2: offsets
    this.storageBGCluster = createBindGroupCluster({
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

    this.uniformsBGCluster = createBindGroupCluster({
      device: device,
      label: 'SpatialInfoSort.uniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      resources: [[{ buffer: this.uniformsBuffer }]],
    });

    // Pipelines
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
          code: NaiveBitonicCompute(this.maxWorkgroupSize),
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

  logSortInfo() {
    console.log(`Workgroup Size: ${this.maxWorkgroupSize}`);
    console.log(`Sorted Particles: ${this.particlesToSort}`);
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
    // Write defaults to buffer
    device.queue.writeBuffer(
      this.uniformsBuffer,
      0,
      new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
    );

    while (highestBlockHeight !== this.particlesToSort * 2) {
      this.sortSpatialIndices(commandEncoder);
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
        device.queue.writeBuffer(
          this.uniformsBuffer,
          0,
          new Uint32Array([StepEnum[nextAlgo], nextBlockHeight])
        );
      }
    }
    this.computeSpatialOffsets(commandEncoder);
  }

  computeSpatialOffsets(commandEncoder: GPUCommandEncoder) {
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

  sortSpatialIndices(commandEncoder: GPUCommandEncoder) {
    // Perform the compute Pass
    const sortSpatialIndicesComputePassEncoder =
      commandEncoder.beginComputePass();
    // Set the resources for this pass of the compute shader
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
    // Dispatch workgroups
    sortSpatialIndicesComputePassEncoder.dispatchWorkgroups(
      this.workgroupsToDispatch
    );
    sortSpatialIndicesComputePassEncoder.end();
    // Copy output data back to input
    commandEncoder.copyBufferToBuffer(
      this.spatialIndicesOutputBuffer,
      0,
      this.spatialIndicesInputBuffer,
      0,
      this.spatialIndicesBufferSize
    );
  }
}
