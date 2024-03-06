import raytracerWGSL from './raytracer.wgsl';

import Common from './common';
import Radiosity from './radiosity';

/**
 * Raytracer renders the scene using a software ray-tracing compute pipeline.
 */
export default class Raytracer {
  private readonly common: Common;
  private readonly framebuffer: GPUTexture;
  private readonly pipeline: GPUComputePipeline;
  private readonly bindGroup: GPUBindGroup;

  private readonly kWorkgroupSizeX = 16;
  private readonly kWorkgroupSizeY = 16;

  constructor(
    device: GPUDevice,
    common: Common,
    radiosity: Radiosity,
    framebuffer: GPUTexture
  ) {
    this.common = common;
    this.framebuffer = framebuffer;
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Raytracer.bindGroupLayout',
      entries: [
        {
          // lightmap
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          texture: { viewDimension: '2d-array' },
        },
        {
          // sampler
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          sampler: {},
        },
        {
          // framebuffer
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: 'write-only',
            format: framebuffer.format,
            viewDimension: '2d',
          },
        },
      ],
    });

    this.bindGroup = device.createBindGroup({
      label: 'rendererBindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: radiosity.lightmap.createView(),
        },
        {
          binding: 1,
          resource: device.createSampler({
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            addressModeW: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear',
          }),
        },
        {
          binding: 2,
          resource: framebuffer.createView(),
        },
      ],
    });

    this.pipeline = device.createComputePipeline({
      label: 'raytracerPipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [common.uniforms.bindGroupLayout, bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: raytracerWGSL + common.wgsl,
        }),
        entryPoint: 'main',
        constants: {
          WorkgroupSizeX: this.kWorkgroupSizeX,
          WorkgroupSizeY: this.kWorkgroupSizeY,
        },
      },
    });
  }

  run(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.common.uniforms.bindGroup);
    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.dispatchWorkgroups(
      Math.ceil(this.framebuffer.width / this.kWorkgroupSizeX),
      Math.ceil(this.framebuffer.height / this.kWorkgroupSizeY)
    );
    passEncoder.end();
  }
}
