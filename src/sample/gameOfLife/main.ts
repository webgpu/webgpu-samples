import { makeSample, SampleInit } from '../../components/SampleLayout';
import computeWGSL from './compute.wgsl';
import vertWGSL from './vert.wgsl';
import fragWGSL from './frag.wgsl';

const init: SampleInit = async ({ canvasRef, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvasRef.current.width = canvasRef.current.clientWidth * pixelRatio;
  canvasRef.current.height = canvasRef.current.clientHeight * pixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const context = canvasRef.current.getContext('webgpu') as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const GameOptions = {
    width: 128,
    height: 128,
    speed: 4,
  };

  const computeShader = device.createShaderModule({ code: computeWGSL });
  const bindGroupLayoutCompute = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'read-only-storage',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage',
        },
      },
    ],
  });

  // compute pipeline
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayoutCompute],
    }),
    compute: {
      module: computeShader,
      entryPoint: 'main',
    },
  });

  const squareVertices = new Uint32Array([0, 0, 0, 1, 1, 0, 1, 1]);
  const squareBuffer = device.createBuffer({
    size: squareVertices.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Uint32Array(squareBuffer.getMappedRange()).set(squareVertices);
  squareBuffer.unmap();

  const squareStride: GPUVertexBufferLayout = {
    arrayStride: 2 * squareVertices.BYTES_PER_ELEMENT,
    stepMode: 'vertex',
    attributes: [
      {
        shaderLocation: 1,
        offset: 0,
        format: 'uint32x2',
      },
    ],
  };

  const vertexShader = device.createShaderModule({ code: vertWGSL });
  const fragmentShader = device.createShaderModule({ code: fragWGSL });
  let commandEncoder: GPUCommandEncoder;

  const bindGroupLayoutRender = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
    ],
  });

  const cellsStride: GPUVertexBufferLayout = {
    arrayStride: Uint32Array.BYTES_PER_ELEMENT,
    stepMode: 'instance',
    attributes: [
      {
        shaderLocation: 0,
        offset: 0,
        format: 'uint32',
      },
    ],
  };

  function addGUI() {
    gui.add(GameOptions, 'speed', 0, 60, 1);
    gui.add(GameOptions, 'width', 16, 1024, 16).onFinishChange(resetGameData);
    gui.add(GameOptions, 'height', 16, 1024, 16).onFinishChange(resetGameData);
  }

  let wholeTime = 0,
    loopTimes = 0,
    buffer0: GPUBuffer,
    buffer1: GPUBuffer;
  let render: () => void;
  function resetGameData() {
    const sizeBuffer = device.createBuffer({
      size: 2 * Uint32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.UNIFORM |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Uint32Array(sizeBuffer.getMappedRange()).set([
      GameOptions.width,
      GameOptions.height,
    ]);
    sizeBuffer.unmap();
    const length = GameOptions.width * GameOptions.height;
    const cells = new Uint32Array(length);
    for (let i = 0; i < length; i++) {
      cells[i] = Math.random() < 0.25 ? 1 : 0;
    }

    buffer0 = device.createBuffer({
      size: cells.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Uint32Array(buffer0.getMappedRange()).set(cells);
    buffer0.unmap();

    buffer1 = device.createBuffer({
      size: cells.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
    });

    const bindGroup0 = device.createBindGroup({
      layout: bindGroupLayoutCompute,
      entries: [
        { binding: 0, resource: { buffer: sizeBuffer } },
        { binding: 1, resource: { buffer: buffer0 } },
        { binding: 2, resource: { buffer: buffer1 } },
      ],
    });

    const bindGroup1 = device.createBindGroup({
      layout: bindGroupLayoutCompute,
      entries: [
        { binding: 0, resource: { buffer: sizeBuffer } },
        { binding: 1, resource: { buffer: buffer1 } },
        { binding: 2, resource: { buffer: buffer0 } },
      ],
    });

    const renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayoutRender],
      }),
      primitive: {
        topology: 'triangle-strip',
      },
      vertex: {
        module: vertexShader,
        entryPoint: 'main',
        buffers: [cellsStride, squareStride],
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'main',
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
    });

    const uniformBindGroup = device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: sizeBuffer,
            offset: 0,
            size: 2 * Uint32Array.BYTES_PER_ELEMENT,
          },
        },
      ],
    });

    loopTimes = 0;
    render = () => {
      const view = context.getCurrentTexture().createView();
      const renderPass: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      };
      commandEncoder = device.createCommandEncoder();

      // compute
      const passEncoderCompute = commandEncoder.beginComputePass();
      passEncoderCompute.setPipeline(computePipeline);
      passEncoderCompute.setBindGroup(
        0,
        loopTimes % 2 === 0 ? bindGroup0 : bindGroup1
      );
      passEncoderCompute.dispatchWorkgroups(
        GameOptions.width >> 4,
        GameOptions.height >> 4
      );
      passEncoderCompute.end();
      // render
      const passEncoderRender = commandEncoder.beginRenderPass(renderPass);
      passEncoderRender.setPipeline(renderPipeline);
      passEncoderRender.setVertexBuffer(
        0,
        loopTimes % 2 === 0 ? buffer1 : buffer0
      );
      passEncoderRender.setVertexBuffer(1, squareBuffer);
      passEncoderRender.setBindGroup(0, uniformBindGroup);
      passEncoderRender.draw(4, length);
      passEncoderRender.end();

      device.queue.submit([commandEncoder.finish()]);
    };
  }

  addGUI();
  resetGameData();

  (function loop() {
    if (GameOptions.speed) {
      wholeTime++;
      if (wholeTime >= GameOptions.speed) {
        render();
        wholeTime -= GameOptions.speed;
        loopTimes++;
      }
    }

    requestAnimationFrame(loop);
  })();
};

const GameOfLife: () => JSX.Element = () =>
  makeSample({
    name: "Conway's Game of Life",
    description:
      "This example shows how to make Conway's game of life by using compute pipeline and render pipeline.",
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './gameOfLife.compute.wgsl',
        contents: computeWGSL,
        editable: true,
      },
      {
        name: './gameOfLife.vert.wgsl',
        contents: vertWGSL,
        editable: true,
      },
      {
        name: './gameOfLife.frag.wgsl',
        contents: fragWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default GameOfLife;
