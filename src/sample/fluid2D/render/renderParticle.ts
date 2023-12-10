import { create3DRenderPipeline } from '../../normalMap/utils';
import { BindGroupCluster, createBindGroupCluster } from '../utils';

import particleWGSL from './particle.wgsl';

interface RenderArgs {
  particleRadius: number;
  canvasWidth: number;
  canvasHeight: number;
}

interface ConstructorArgs {
  device: GPUDevice;
  numParticles: number;
  presentationFormat: GPUTextureFormat;
  _renderPassDescriptor: GPURenderPassDescriptor;
  positionsBuffer: GPUBuffer;
  velocitiesBuffer: GPUBuffer;
}

export default class ParticleRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private renderPassDescriptor: GPURenderPassDescriptor;
  private renderPipeline: GPURenderPipeline;
  private renderUniforms: GPUBuffer;
  private storageBGCluster: BindGroupCluster;
  private uniformsBGCLuster: BindGroupCluster;
  private particlesToRender: number;

  constructor(args: ConstructorArgs) {
    const {
      device,
      numParticles,
      presentationFormat,
      _renderPassDescriptor,
      positionsBuffer,
      velocitiesBuffer,
    } = args;
    this.particlesToRender = numParticles;
    this.renderPassDescriptor = _renderPassDescriptor;

    // Passes particle_radius, canvasWidth, and canvasHeight as uniforms to vertex and fragment shaders
    this.renderUniforms = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Defines a bindGroup storing the positions and velocities storage buffers of the particle display shader.
    this.storageBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleStorage',
      bindings: [0, 1],
      visibilities: [GPUShaderStage.VERTEX],
      resourceTypes: ['buffer', 'buffer'],
      resourceLayouts: [
        { type: 'read-only-storage' },
        { type: 'read-only-storage' },
      ],
      resources: [[{ buffer: positionsBuffer }, { buffer: velocitiesBuffer }]],
    });

    // Defines a bindGroup storing the uniforms for the particle display shader.
    this.uniformsBGCLuster = createBindGroupCluster({
      device: device,
      label: 'ParticleUniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.VERTEX],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      resources: [[{ buffer: this.renderUniforms }]],
    });

    // Render pipeline using instancing to render each particle as an sdf circle
    this.renderPipeline = create3DRenderPipeline(
      device,
      'Particle',
      [
        this.storageBGCluster.bindGroupLayout,
        this.uniformsBGCLuster.bindGroupLayout,
      ],
      particleWGSL,
      [],
      particleWGSL,
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
        args.canvasWidth,
        args.canvasHeight,
      ])
    );
  }

  render(commandEncoder: GPUCommandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(
      this.renderPassDescriptor
    );
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.storageBGCluster.bindGroups[0]);
    passEncoder.setBindGroup(1, this.uniformsBGCLuster.bindGroups[0]);
    passEncoder.draw(6, this.particlesToRender, 0, 0);
    passEncoder.end();
  }
}
