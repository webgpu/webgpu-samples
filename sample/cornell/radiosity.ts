import Common from './common';
import radiosityWGSL from './radiosity.wgsl';
import Scene from './scene';

/**
 * Radiosity computes lightmaps, calculated by software raytracing of light in
 * the scene.
 */
export default class Radiosity {
  // The output lightmap format and dimensions
  static readonly lightmapFormat = 'rgba16float';
  static readonly lightmapWidth = 256;
  static readonly lightmapHeight = 256;

  // The output lightmap.
  readonly lightmap: GPUTexture;

  // Number of photons emitted per workgroup.
  // This is equal to the workgroup size (one photon per invocation)
  private readonly kPhotonsPerWorkgroup = 256;
  // Number of radiosity workgroups dispatched per frame.
  private readonly kWorkgroupsPerFrame = 1024;
  private readonly kPhotonsPerFrame =
    this.kPhotonsPerWorkgroup * this.kWorkgroupsPerFrame;
  // Maximum value that can be added to the 'accumulation' buffer, per photon,
  // across all texels.
  private readonly kPhotonEnergy = 100000;
  // The total number of lightmap texels for all quads.
  private readonly kTotalLightmapTexels;

  private readonly kAccumulationToLightmapWorkgroupSizeX = 16;
  private readonly kAccumulationToLightmapWorkgroupSizeY = 16;

  private readonly device: GPUDevice;
  private readonly common: Common;
  private readonly scene: Scene;
  private readonly radiosityPipeline: GPUComputePipeline;
  private readonly accumulationToLightmapPipeline: GPUComputePipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly accumulationBuffer: GPUBuffer;
  private readonly uniformBuffer: GPUBuffer;

  // The 'accumulation' buffer average value
  private accumulationMean = 0;

  // The maximum value of 'accumulationAverage' before all values in
  // 'accumulation' are reduced to avoid integer overflows.
  private readonly kAccumulationMeanMax = 0x10000000;

  constructor(device: GPUDevice, common: Common, scene: Scene) {
    this.device = device;
    this.common = common;
    this.scene = scene;
    this.lightmap = device.createTexture({
      label: 'Radiosity.lightmap',
      size: {
        width: Radiosity.lightmapWidth,
        height: Radiosity.lightmapHeight,
        depthOrArrayLayers: scene.quads.length,
      },
      format: Radiosity.lightmapFormat,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
    });
    this.accumulationBuffer = device.createBuffer({
      label: 'Radiosity.accumulationBuffer',
      size:
        Radiosity.lightmapWidth *
        Radiosity.lightmapHeight *
        scene.quads.length *
        16,
      usage: GPUBufferUsage.STORAGE,
    });
    this.kTotalLightmapTexels =
      Radiosity.lightmapWidth * Radiosity.lightmapHeight * scene.quads.length;
    this.uniformBuffer = device.createBuffer({
      label: 'Radiosity.uniformBuffer',
      size: 8 * 4, // 8 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Radiosity.bindGroupLayout',
      entries: [
        {
          // accumulation buffer
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
        {
          // lightmap
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: 'write-only',
            format: Radiosity.lightmapFormat,
            viewDimension: '2d-array',
          },
        },
        {
          // radiosity_uniforms
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
      ],
    });
    this.bindGroup = device.createBindGroup({
      label: 'Radiosity.bindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          // accumulation buffer
          binding: 0,
          resource: {
            buffer: this.accumulationBuffer,
            size: this.accumulationBuffer.size,
          },
        },
        {
          // lightmap
          binding: 1,
          resource: this.lightmap.createView(),
        },
        {
          // radiosity_uniforms
          binding: 2,
          resource: {
            buffer: this.uniformBuffer,
            size: this.uniformBuffer.size,
          },
        },
      ],
    });

    const mod = device.createShaderModule({
      code: radiosityWGSL + common.wgsl,
    });
    const pipelineLayout = device.createPipelineLayout({
      label: 'Radiosity.accumulatePipelineLayout',
      bindGroupLayouts: [common.uniforms.bindGroupLayout, bindGroupLayout],
    });

    this.radiosityPipeline = device.createComputePipeline({
      label: 'Radiosity.radiosityPipeline',
      layout: pipelineLayout,
      compute: {
        module: mod,
        entryPoint: 'radiosity',
        constants: {
          PhotonsPerWorkgroup: this.kPhotonsPerWorkgroup,
          PhotonEnergy: this.kPhotonEnergy,
        },
      },
    });

    this.accumulationToLightmapPipeline = device.createComputePipeline({
      label: 'Radiosity.accumulationToLightmapPipeline',
      layout: pipelineLayout,
      compute: {
        module: mod,
        entryPoint: 'accumulation_to_lightmap',
        constants: {
          AccumulationToLightmapWorkgroupSizeX:
            this.kAccumulationToLightmapWorkgroupSizeX,
          AccumulationToLightmapWorkgroupSizeY:
            this.kAccumulationToLightmapWorkgroupSizeY,
        },
      },
    });
  }

  run(commandEncoder: GPUCommandEncoder) {
    // Calculate the new mean value for the accumulation buffer
    this.accumulationMean +=
      (this.kPhotonsPerFrame * this.kPhotonEnergy) / this.kTotalLightmapTexels;

    // Calculate the 'accumulation' -> 'lightmap' scale factor from 'accumulationMean'
    const accumulationToLightmapScale = 1 / this.accumulationMean;
    // If 'accumulationMean' is greater than 'kAccumulationMeanMax', then reduce
    // the 'accumulation' buffer values to prevent u32 overflow.
    const accumulationBufferScale =
      this.accumulationMean > 2 * this.kAccumulationMeanMax ? 0.5 : 1;
    this.accumulationMean *= accumulationBufferScale;

    // Update the radiosity uniform buffer data.
    const uniformDataF32 = new Float32Array(this.uniformBuffer.size / 4);
    uniformDataF32[0] = accumulationToLightmapScale;
    uniformDataF32[1] = accumulationBufferScale;
    uniformDataF32[2] = this.scene.lightWidth;
    uniformDataF32[3] = this.scene.lightHeight;
    uniformDataF32[4] = this.scene.lightCenter[0];
    uniformDataF32[5] = this.scene.lightCenter[1];
    uniformDataF32[6] = this.scene.lightCenter[2];
    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      uniformDataF32.buffer,
      uniformDataF32.byteOffset,
      uniformDataF32.byteLength
    );

    // Dispatch the radiosity workgroups
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setBindGroup(0, this.common.uniforms.bindGroup);
    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.setPipeline(this.radiosityPipeline);
    passEncoder.dispatchWorkgroups(this.kWorkgroupsPerFrame);

    // Then copy the 'accumulation' data to 'lightmap'
    passEncoder.setPipeline(this.accumulationToLightmapPipeline);
    passEncoder.dispatchWorkgroups(
      Math.ceil(
        Radiosity.lightmapWidth / this.kAccumulationToLightmapWorkgroupSizeX
      ),
      Math.ceil(
        Radiosity.lightmapHeight / this.kAccumulationToLightmapWorkgroupSizeY
      ),
      this.lightmap.depthOrArrayLayers
    );
    passEncoder.end();
  }
}
