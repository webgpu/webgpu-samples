import { create3DRenderPipeline } from '../../normalMap/utils';
import { BindGroupCluster, createBindGroupCluster } from '../utils';

import renderGridWGSL from './renderGrid.wgsl';

interface RenderArgs {
  boundingBoxWidth: number;
  boundingBoxHeight: number;
  zoomScaleX: number;
  zoomScaleY: number;
  cellSize: number;
}

interface ConstructorArgs {
  device: GPUDevice;
  presentationFormat: GPUTextureFormat;
  renderPassDescriptor: GPURenderPassDescriptor;
}

export default class HashGridRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private renderPassDescriptor: GPURenderPassDescriptor;
  private renderStandardPipeline: GPURenderPipeline;
  private renderUniforms: GPUBuffer;
  private uniformsBGCLuster: BindGroupCluster;

  constructor(args: ConstructorArgs) {
    const { device, presentationFormat, renderPassDescriptor } = args;
    this.renderPassDescriptor = renderPassDescriptor;

    // Passes particle_radius, zoomScaleX, and zoomScaleY as uniforms to vertex and fragment shaders
    this.renderUniforms = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 5,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Defines a bindGroup storing the uniforms for the particle display shader.
    this.uniformsBGCLuster = createBindGroupCluster({
      device: device,
      label: 'ParticleUniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      resources: [[{ buffer: this.renderUniforms }]],
    });

    // Render pipeline using instancing to render each particle as an sdf circle
    this.renderStandardPipeline = create3DRenderPipeline(
      device,
      'RenderGrid',
      [this.uniformsBGCLuster.bindGroupLayout],
      renderGridWGSL,
      [],
      renderGridWGSL,
      presentationFormat,
      false,
      'triangle-list',
      'front'
    );
  }

  writeUniforms(device: GPUDevice, args: RenderArgs) {
    device.queue.writeBuffer(
      this.renderUniforms,
      0,
      new Float32Array([
        args.boundingBoxWidth,
        args.boundingBoxHeight,
        args.zoomScaleX,
        args.zoomScaleY,
        args.cellSize,
      ])
    );
  }

  render(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.renderStandardPipeline);
    passEncoder.setBindGroup(0, this.uniformsBGCLuster.bindGroups[0]);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }
}
