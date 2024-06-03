import { GUI } from 'dat.gui';
import computeWGSL from './compute.wgsl';
import vertWGSL from './vert.wgsl';
import fragWGSL from './frag.wgsl';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

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

const GameOptions = {
  width: 128,
  height: 128,
  timestep: 4,
  workgroupSize: 8,
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
  const gui = new GUI();
  gui.add(GameOptions, 'timestep', 1, 60, 1);
  gui.add(GameOptions, 'width', 16, 1024, 16).onFinishChange(resetGameData);
  gui.add(GameOptions, 'height', 16, 1024, 16).onFinishChange(resetGameData);
  gui
    .add(GameOptions, 'workgroupSize', [4, 8, 16])
    .onFinishChange(resetGameData);
}

let wholeTime = 0,
  loopTimes = 0,
  buffer0: GPUBuffer,
  buffer1: GPUBuffer;
let render: () => void;
function resetGameData() {
  // compute pipeline
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayoutCompute],
    }),
    compute: {
      module: computeShader,
      entryPoint: 'main',
      constants: {
        blockSize: GameOptions.workgroupSize,
      },
    },
  });
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
    passEncoderCompute.setBindGroup(0, loopTimes ? bindGroup1 : bindGroup0);
    passEncoderCompute.dispatchWorkgroups(
      GameOptions.width / GameOptions.workgroupSize,
      GameOptions.height / GameOptions.workgroupSize
    );
    passEncoderCompute.end();
    // render
    const passEncoderRender = commandEncoder.beginRenderPass(renderPass);
    passEncoderRender.setPipeline(renderPipeline);
    passEncoderRender.setVertexBuffer(0, loopTimes ? buffer1 : buffer0);
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
  if (GameOptions.timestep) {
    wholeTime++;
    if (wholeTime >= GameOptions.timestep) {
      render();
      wholeTime -= GameOptions.timestep;
      loopTimes = 1 - loopTimes;
    }
  }

  requestAnimationFrame(loop);
})();
