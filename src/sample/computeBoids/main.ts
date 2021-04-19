import { makeSample, SampleInit } from '../../components/SampleLayout';

import spriteWGSL from './sprite.wgsl';
import updateSpritesWGSL from './updateSprites.wgsl';

const init: SampleInit = async ({ canvasRef }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;
  const context = canvasRef.current.getContext('gpupresent');

  const swapChainFormat = 'bgra8unorm';
  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
  });

  const spriteShaderModule = device.createShaderModule({ code: spriteWGSL });
  const renderPipeline = device.createRenderPipeline({
    vertex: {
      module: spriteShaderModule,
      entryPoint: 'vert_main',
      buffers: [
        {
          // instanced particles buffer
          arrayStride: 4 * 4,
          stepMode: 'instance',
          attributes: [
            {
              // instance position
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
            {
              // instance velocity
              shaderLocation: 1,
              offset: 2 * 4,
              format: 'float32x2',
            },
          ],
        },
        {
          // vertex buffer
          arrayStride: 2 * 4,
          stepMode: 'vertex',
          attributes: [
            {
              // vertex positions
              shaderLocation: 2,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: spriteShaderModule,
      entryPoint: 'frag_main',
      targets: [
        {
          format: swapChainFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const computePipeline = device.createComputePipeline({
    compute: {
      module: device.createShaderModule({
        code: updateSpritesWGSL,
      }),
      entryPoint: 'main',
    },
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later
        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        storeOp: 'store',
      },
    ],
  };

  // prettier-ignore
  const vertexBufferData = new Float32Array([
    -0.01, -0.02, 0.01,
    -0.02, 0.0, 0.02,
  ]);

  const spriteVertexBuffer = device.createBuffer({
    size: vertexBufferData.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(spriteVertexBuffer.getMappedRange()).set(vertexBufferData);
  spriteVertexBuffer.unmap();

  const simParamData = new Float32Array([
    0.04, // deltaT;
    0.1, // rule1Distance;
    0.025, // rule2Distance;
    0.025, // rule3Distance;
    0.02, // rule1Scale;
    0.05, // rule2Scale;
    0.005, // rule3Scale;
  ]);
  const simParamBuffer = device.createBuffer({
    size: simParamData.byteLength,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Float32Array(simParamBuffer.getMappedRange()).set(simParamData);
  simParamBuffer.unmap();

  const numParticles = 1500;
  const initialParticleData = new Float32Array(numParticles * 4);
  for (let i = 0; i < numParticles; ++i) {
    initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
    initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
  }

  const particleBuffers: GPUBuffer[] = new Array(2);
  const particleBindGroups: GPUBindGroup[] = new Array(2);
  for (let i = 0; i < 2; ++i) {
    particleBuffers[i] = device.createBuffer({
      size: initialParticleData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(particleBuffers[i].getMappedRange()).set(
      initialParticleData
    );
    particleBuffers[i].unmap();
  }

  for (let i = 0; i < 2; ++i) {
    particleBindGroups[i] = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: simParamBuffer,
            offset: 0,
            size: simParamData.byteLength,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: particleBuffers[i],
            offset: 0,
            size: initialParticleData.byteLength,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: particleBuffers[(i + 1) % 2],
            offset: 0,
            size: initialParticleData.byteLength,
          },
        },
      ],
    });
  }

  let t = 0;
  function frame() {
    const backbuffer = swapChain.getCurrentTexture();
    if (!backbuffer) return;

    renderPassDescriptor.colorAttachments[0].view = backbuffer.createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, particleBindGroups[t % 2]);
      passEncoder.dispatch(numParticles);
      passEncoder.endPass();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setVertexBuffer(0, particleBuffers[(t + 1) % 2]);
      passEncoder.setVertexBuffer(1, spriteVertexBuffer);
      passEncoder.draw(3, numParticles, 0, 0);
      passEncoder.endPass();
    }
    device.queue.submit([commandEncoder.finish()]);

    ++t;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const ComputeBoids: () => JSX.Element = () =>
  makeSample({
    name: 'Compute Boids',
    description:
      'A GPU compute particle simulation that mimics \
the flocking behavior of birds. A compute shader updates \
two ping-pong buffers which store particle data. The data \
is used to draw instanced particles.',
    init,
    sources: [
      {
        name: __filename.substr(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: 'updateSprites.wgsl',
        contents: updateSpritesWGSL,
        editable: true,
      },
      {
        name: 'sprite.wgsl',
        contents: spriteWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default ComputeBoids;
