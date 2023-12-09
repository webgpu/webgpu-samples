import { BindGroupCluster, createBindGroupCluster } from '../utils';

import bitonicDisplay from './bitonicDisplay.frag.wgsl';

interface BitonicDisplayRenderArgs {
  highlight: number;
}

export default class ParticleDisplayRenderer {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  private renderPassDescriptor: GPURenderPassDescriptor;

  constructor(
    _device: GPUDevice,
    label: string,
    _presentationFormat: GPUTextureFormat,
    _renderPassDescriptor: GPURenderPassDescriptor,
    _positionsBuffer: GPUBuffer,
    _velocitiesBuffer: GPUBuffer,
  ) {
    this.renderPassDescriptor = rpd;

    const uniformBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Passes particle_radius, canvasWidth, and canvasHeight as uniforms to vertex and fragment shaders
    const particleDisplayUniformsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Defines a bindGroup storing the positions and velocities storage buffers of the particle display shader.
    const particleDisplayStorageBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleStorage',
      bindings: [0, 1],
      visibilities: [GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer'],
      resourceLayouts: [
        { type: 'read-only-storage' },
        { type: 'read-only-storage' },
      ],
      resources: [
        [
          { buffer: particlePositionsBuffer },
          { buffer: particleVelocitiesBuffer },
        ],
      ],
    });

    // Defines a bindGroup storing the uniforms for the particle display shader.
    const particleDisplayUniformsBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleUniforms',
      bindings: [0],
      visibilities: [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      resources: [[{ buffer: particleDisplayUniformsBuffer }]],
    });

    // Render pipeline using instancing to render each particle as an sdf circle
    const particleRenderPipeline = create3DRenderPipeline(
      device,
      'Particle',
      [
        particleDisplayStorageBGCluster.bindGroupLayout,
        particleDisplayUniformsBGCluster.bindGroupLayout,
      ],
      particleWGSL,
      [],
      particleWGSL,
      presentationFormat,
      false,
      'triangle-list',
      'front'
    );

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const bgCluster = createBindGroupCluster(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
      label,
      device
    );

    this.currentBindGroup = bgCluster.bindGroups[0];

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [this.computeBGDescript.bindGroupLayout, bgCluster.bindGroupLayout],
      bitonicDisplay,
      presentationFormat
    );

    this.setArguments = (args: BitonicDisplayRenderArgs) => {
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        new Uint32Array([args.highlight])
      );
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: BitonicDisplayRenderArgs) {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.computeBGDescript.bindGroups[0],
      this.currentBindGroup,
    ]);
  }
}
