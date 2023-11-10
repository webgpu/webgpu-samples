import { assert, makeSample, SampleInit } from '../../components/SampleLayout';

import spriteWGSL from './sprite.wgsl';
import updateSpritesWGSL from './updateSprites.wgsl';

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  assert(adapter, 'requestAdapter returned null');

  const hasTimestampQuery = adapter.features.has('timestamp-query');
  const device = await adapter.requestDevice({
    requiredFeatures: hasTimestampQuery ? ['timestamp-query'] : [],
  });

  const perfDisplayContainer = document.createElement('div');
  perfDisplayContainer.style.color = 'white';
  perfDisplayContainer.style.background = 'black';
  perfDisplayContainer.style.position = 'absolute';
  perfDisplayContainer.style.top = '10px';
  perfDisplayContainer.style.left = '10px';
  perfDisplayContainer.style.textAlign = 'left';

  const perfDisplay = document.createElement('pre');
  perfDisplayContainer.appendChild(perfDisplay);
  if (canvas.parentNode) {
    canvas.parentNode.appendChild(perfDisplayContainer);
  } else {
    console.error('canvas.parentNode is null');
  }

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const spriteShaderModule = device.createShaderModule({ code: spriteWGSL });
  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
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
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
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
        view: undefined as GPUTextureView, // Assigned later
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear' as const,
        storeOp: 'store' as const,
      },
    ],
  };

  const computePassDescriptor: GPUComputePassDescriptor = {};

  /** Storage for timestamp query results */
  let querySet: GPUQuerySet | undefined = undefined;
  /** Timestamps are resolved into this buffer */
  let resolveBuffer: GPUBuffer | undefined = undefined;
  /** Pool of spare buffers for MAP_READing the timestamps back to CPU. A buffer
   * is taken from the pool (if available) when a readback is needed, and placed
   * back into the pool once the readback is done and it's unmapped. */
  const spareResultBuffers = [];

  if (hasTimestampQuery) {
    querySet = device.createQuerySet({
      type: 'timestamp',
      count: 4,
    });
    resolveBuffer = device.createBuffer({
      size: 4 * BigInt64Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    computePassDescriptor.timestampWrites = {
      querySet,
      beginningOfPassWriteIndex: 0,
      endOfPassWriteIndex: 1,
    };
    renderPassDescriptor.timestampWrites = {
      querySet,
      beginningOfPassWriteIndex: 2,
      endOfPassWriteIndex: 3,
    };
  }

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

  const simParams = {
    deltaT: 0.04,
    rule1Distance: 0.1,
    rule2Distance: 0.025,
    rule3Distance: 0.025,
    rule1Scale: 0.02,
    rule2Scale: 0.05,
    rule3Scale: 0.005,
  };

  const simParamBufferSize = 7 * Float32Array.BYTES_PER_ELEMENT;
  const simParamBuffer = device.createBuffer({
    size: simParamBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  function updateSimParams() {
    device.queue.writeBuffer(
      simParamBuffer,
      0,
      new Float32Array([
        simParams.deltaT,
        simParams.rule1Distance,
        simParams.rule2Distance,
        simParams.rule3Distance,
        simParams.rule1Scale,
        simParams.rule2Scale,
        simParams.rule3Scale,
      ])
    );
  }

  updateSimParams();
  Object.keys(simParams).forEach((k) => {
    const key = k as keyof typeof simParams;
    if (gui === undefined) {
      console.error('GUI not initialized');
    } else {
      gui.add(simParams, key).onFinishChange(updateSimParams);
    }
  });

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
  let computePassDurationSum = 0;
  let renderPassDurationSum = 0;
  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const passEncoder = commandEncoder.beginComputePass(
        computePassDescriptor
      );
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, particleBindGroups[t % 2]);
      passEncoder.dispatchWorkgroups(Math.ceil(numParticles / 64));
      passEncoder.end();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setVertexBuffer(0, particleBuffers[(t + 1) % 2]);
      passEncoder.setVertexBuffer(1, spriteVertexBuffer);
      passEncoder.draw(3, numParticles, 0, 0);
      passEncoder.end();
    }

    let resultBuffer: GPUBuffer | undefined = undefined;
    if (hasTimestampQuery) {
      resultBuffer =
        spareResultBuffers.pop() ||
        device.createBuffer({
          size: 4 * BigInt64Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
      commandEncoder.resolveQuerySet(querySet, 0, 4, resolveBuffer, 0);
      commandEncoder.copyBufferToBuffer(
        resolveBuffer,
        0,
        resultBuffer,
        0,
        resultBuffer.size
      );
    }

    device.queue.submit([commandEncoder.finish()]);

    if (hasTimestampQuery) {
      resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const times = new BigInt64Array(resultBuffer.getMappedRange());
        computePassDurationSum += Number(times[1] - times[0]);
        renderPassDurationSum += Number(times[3] - times[2]);
        resultBuffer.unmap();

        // Periodically update the text for the timer stats
        const kNumTimerSamples = 100;
        if (t % kNumTimerSamples === 0) {
          const avgComputeMicroseconds = Math.round(
            computePassDurationSum / kNumTimerSamples / 1000
          );
          const avgRenderMicroseconds = Math.round(
            renderPassDurationSum / kNumTimerSamples / 1000
          );
          perfDisplay.textContent = `\
avg compute pass duration: ${avgComputeMicroseconds}µs
avg render pass duration: ${avgRenderMicroseconds}µs
spare readback buffers: ${spareResultBuffers.length}`;
          computePassDurationSum = 0;
          renderPassDurationSum = 0;
        }
        spareResultBuffers.push(resultBuffer);
      });
    }

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
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
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
