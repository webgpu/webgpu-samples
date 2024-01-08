import { create3DRenderPipeline } from '../../normalMap/utils';
import { BindGroupCluster, createBindGroupCluster } from '../utils';

import renderParticleWGSL from './renderParticle.wgsl';
import renderDensityWGSL from './renderDensity.wgsl';

interface RenderArgs {
  particleRadius: number;
  zoomScaleX: number;
  zoomScaleY: number;
  targetDensity: number;
}

export type ParticleRenderMode = 'STANDARD' | 'DENSITY';

interface ConstructorArgs {
  device: GPUDevice;
  numParticles: number;
  presentationFormat: GPUTextureFormat;
  renderPassDescriptor: GPURenderPassDescriptor;
  positionsBuffer: GPUBuffer;
  velocitiesBuffer: GPUBuffer;
  densitiesBuffer: GPUBuffer;
}

export default class ParticleRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private renderPassDescriptor: GPURenderPassDescriptor;
  private renderStandardPipeline: GPURenderPipeline;
  private renderDensityPipeline: GPURenderPipeline;
  private renderUniforms: GPUBuffer;
  private storageBGCluster: BindGroupCluster;
  private uniformsBGCLuster: BindGroupCluster;
  private particlesToRender: number;

  constructor(args: ConstructorArgs) {
    const {
      device,
      numParticles,
      presentationFormat,
      renderPassDescriptor,
      positionsBuffer,
      velocitiesBuffer,
      densitiesBuffer,
    } = args;
    this.particlesToRender = numParticles;
    this.renderPassDescriptor = renderPassDescriptor;

    // Passes particle_radius, zoomScaleX, and zoomScaleY as uniforms to vertex and fragment shaders
    this.renderUniforms = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Defines a bindGroup storing the positions and velocities storage buffers of the particle display shader.
    this.storageBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleStorage',
      bindings: [0, 1, 2],
      visibilities: [GPUShaderStage.VERTEX],
      resourceTypes: ['buffer', 'buffer', 'buffer'],
      resourceLayouts: [
        { type: 'read-only-storage' },
        { type: 'read-only-storage' },
        { type: 'read-only-storage' },
      ],
      resources: [
        [
          { buffer: positionsBuffer },
          { buffer: velocitiesBuffer },
          { buffer: densitiesBuffer },
        ],
      ],
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
      'RenderParticle',
      [
        this.storageBGCluster.bindGroupLayout,
        this.uniformsBGCLuster.bindGroupLayout,
      ],
      renderParticleWGSL,
      [],
      renderParticleWGSL,
      presentationFormat,
      false,
      'triangle-list',
      'front'
    );

    this.renderDensityPipeline = create3DRenderPipeline(
      device,
      'RenderDensity',
      [
        this.storageBGCluster.bindGroupLayout,
        this.uniformsBGCLuster.bindGroupLayout,
      ],
      renderDensityWGSL,
      [],
      renderDensityWGSL,
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
        args.particleRadius,
        args.zoomScaleX,
        args.zoomScaleY,
        args.targetDensity,
      ])
    );
  }

  render(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.renderStandardPipeline);
    passEncoder.setBindGroup(0, this.storageBGCluster.bindGroups[0]);
    passEncoder.setBindGroup(1, this.uniformsBGCLuster.bindGroups[0]);
    passEncoder.draw(6, this.particlesToRender, 0, 0);
    passEncoder.end();
  }
}
