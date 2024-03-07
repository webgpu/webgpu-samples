import rasterizerWGSL from './rasterizer.wgsl';

import Common from './common';
import Radiosity from './radiosity';
import Scene from './scene';

/**
 * Rasterizer renders the scene using a regular raserization graphics pipeline.
 */
export default class Rasterizer {
  private readonly common: Common;
  private readonly scene: Scene;
  private readonly renderPassDescriptor: GPURenderPassDescriptor;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    common: Common,
    scene: Scene,
    radiosity: Radiosity,
    framebuffer: GPUTexture
  ) {
    this.common = common;
    this.scene = scene;

    const depthTexture = device.createTexture({
      label: 'RasterizerRenderer.depthTexture',
      size: [framebuffer.width, framebuffer.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.renderPassDescriptor = {
      label: 'RasterizerRenderer.renderPassDescriptor',
      colorAttachments: [
        {
          view: framebuffer.createView(),
          clearValue: [0.1, 0.2, 0.3, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    const bindGroupLayout = device.createBindGroupLayout({
      label: 'RasterizerRenderer.bindGroupLayout',
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
      ],
    });

    this.bindGroup = device.createBindGroup({
      label: 'RasterizerRenderer.bindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          // lightmap
          binding: 0,
          resource: radiosity.lightmap.createView(),
        },
        {
          // sampler
          binding: 1,
          resource: device.createSampler({
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            magFilter: 'linear',
            minFilter: 'linear',
          }),
        },
      ],
    });

    const mod = device.createShaderModule({
      label: 'RasterizerRenderer.module',
      code: rasterizerWGSL + common.wgsl,
    });

    this.pipeline = device.createRenderPipeline({
      label: 'RasterizerRenderer.pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [common.uniforms.bindGroupLayout, bindGroupLayout],
      }),
      vertex: {
        module: mod,
        entryPoint: 'vs_main',
        buffers: scene.vertexBufferLayout,
      },
      fragment: {
        module: mod,
        entryPoint: 'fs_main',
        targets: [{ format: framebuffer.format }],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });
  }

  run(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.scene.vertices);
    passEncoder.setIndexBuffer(this.scene.indices, 'uint16');
    passEncoder.setBindGroup(0, this.common.uniforms.bindGroup);
    passEncoder.setBindGroup(1, this.bindGroup);
    passEncoder.drawIndexed(this.scene.indexCount);
    passEncoder.end();
  }
}
