import Common from './common';
import tonemapperWGSL from './tonemapper.wgsl';

/**
 * Tonemapper implements a tonemapper to convert a linear-light framebuffer to
 * a gamma-correct, tonemapped framebuffer used for presentation.
 */
export default class Tonemapper {
  private readonly device: GPUDevice;
  private readonly bindGroup: GPUBindGroup;
  private readonly pipeline: GPUComputePipeline;
  private readonly width: number;
  private readonly height: number;

  constructor(
    device: GPUDevice,
    common: Common,
    input: GPUTexture,
    output: GPUTexture
  ) {
    this.device = device;
    this.width = input.width;
    this.height = input.height;
    const bindGroupLayout = device.createBindGroupLayout({
      label: 'Tonemapper.bindGroupLayout',
      entries: [
        {
          // input
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          texture: {
            viewDimension: '2d',
          },
        },
        {
          // output
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: {
            access: 'write-only',
            format: output.format,
            viewDimension: '2d',
          },
        },
      ],
    });
    this.bindGroup = device.createBindGroup({
      label: 'Tonemapper.bindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          // input
          binding: 0,
          resource: input.createView(),
        },
        {
          // output
          binding: 1,
          resource: output.createView(),
        },
      ],
    });

    const mod = device.createShaderModule({
      code:
        tonemapperWGSL.replace('{OUTPUT_FORMAT}', output.format) + common.wgsl,
    });
    const pipelineLayout = device.createPipelineLayout({
      label: 'Tonemap.pipelineLayout',
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = device.createComputePipeline({
      label: 'Tonemap.pipeline',
      layout: pipelineLayout,
      compute: {
        module: mod,
        entryPoint: 'main',
      },
    });
  }

  run(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.dispatchWorkgroups(
      Math.ceil(this.width / 16),
      Math.ceil(this.height / 16)
    );
    passEncoder.end();
  }
}
