import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import sampleTextureMixColorWGSL from '../../shaders/red.frag.wgsl';
import { quitIfWebGPUNotAvailable, fail } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();
if (!adapter.features.has("timestamp-query")) {
  fail('WebGPU timestamp queries are not supported on this system');
}
const device = await adapter?.requestDevice({
  // We request a device that has support for timestamp queries
  requiredFeatures: [ "timestamp-query" ],
});
quitIfWebGPUNotAvailable(adapter, device);

const perfDisplayContainer = document.createElement('div');
perfDisplayContainer.style.color = 'white';
perfDisplayContainer.style.background = 'black';
perfDisplayContainer.style.position = 'absolute';
perfDisplayContainer.style.top = '10px';
perfDisplayContainer.style.left = '10px';

const perfDisplay = document.createElement('pre');
perfDisplayContainer.appendChild(perfDisplay);
if (canvas.parentNode) {
  canvas.parentNode.appendChild(perfDisplayContainer);
} else {
  console.error('canvas.parentNode is null');
}

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

// Create timestamp queries
const timestampQuerySet = device.createQuerySet({
  type: "timestamp",
  count: 2, // begin and end
});

// Create a buffer where to store the result of GPU queries
const timestampBufferSize = 2 * 8; // timestamps are uint64
const timestampBuffer = device.createBuffer({
  size: timestampBufferSize,
  usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
});

// Create a buffer to map the result back to the CPU
const timestampMapBuffer = device.createBuffer({
  size: timestampBufferSize,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});

// Create a vertex buffer from the cube data.
const verticesBuffer = device.createBuffer({
  size: cubeVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
verticesBuffer.unmap();

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: basicVertWGSL,
    }),
    buffers: [
      {
        arrayStride: cubeVertexSize,
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: cubePositionOffset,
            format: 'float32x4',
          },
          {
            // uv
            shaderLocation: 1,
            offset: cubeUVOffset,
            format: 'float32x2',
          },
        ],
      },
    ],
  },
  fragment: {
    module: device.createShaderModule({
      code: sampleTextureMixColorWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',

    // Backface culling since the cube is solid piece of geometry.
    // Faces pointing away from the camera will be occluded by faces
    // pointing toward the camera.
    cullMode: 'back',
  },

  // Enable depth testing so that the fragment closest to the camera
  // is rendered in front.
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
});

const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const uniformBufferSize = 4 * 16; // 4x4 matrix
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    },
  ],
});

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later

      clearValue: [0.5, 0.5, 0.5, 1.0],
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
  // We instruct the render pass to write to the timestamp query before/after
  timestampWrites: {
    querySet: timestampQuerySet,
    beginningOfPassWriteIndex: 0,
    endOfPassWriteIndex: 1,
  }
};

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
const modelViewProjectionMatrix = mat4.create();

function getTransformationMatrix() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
  const now = Date.now() / 1000;
  mat4.rotate(
    viewMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    viewMatrix
  );

  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

  return modelViewProjectionMatrix;
}

// State used to avoid firing concurrent readback of timestamp values
let hasOngoingTimestampReadback = false;

// A minimalistic perf timer class that computes mean + stddev online
class PerfCounter {
  sampleCount: number;
  accumulated: number;
  accumulatedSq: number;

  constructor() {
    this.sampleCount = 0;
    this.accumulated = 0;
    this.accumulatedSq = 0;
  }

  addSample(value: number) {
    this.sampleCount += 1;
    this.accumulated += value;
    this.accumulatedSq += value * value;
  }

  getAverage(): number {
    return this.sampleCount === 0 ? 0 : this.accumulated / this.sampleCount;
  }

  getStddev(): number {
    if (this.sampleCount === 0) return 0;
    const avg = this.getAverage();
    const variance = this.accumulatedSq / this.sampleCount - avg * avg;
    return Math.sqrt(Math.max(0.0, variance));
  }
}

const renderPassDurationCounter = new PerfCounter();

function frame() {
  const transformationMatrix = getTransformationMatrix();
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    transformationMatrix.buffer,
    transformationMatrix.byteOffset,
    transformationMatrix.byteLength
  );
  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.draw(cubeVertexCount);
  passEncoder.end();

  // After the end of the measured render pass, we resolve queries into a
  // dedicated buffer.
  commandEncoder.resolveQuerySet(
    timestampQuerySet,
    0 /* firstQuery */,
    2 /* queryCount */,
    timestampBuffer,
    0, /* destinationOffset */
  );

  if (!hasOngoingTimestampReadback) {
    // Copy values to the mapped buffer
    commandEncoder.copyBufferToBuffer(
      timestampBuffer, 0,
      timestampMapBuffer, 0,
      timestampBufferSize,
    );
  }

  device.queue.submit([commandEncoder.finish()]);

  // Read timestamp value back from GPU buffers
  if (!hasOngoingTimestampReadback) {
    hasOngoingTimestampReadback = true;
    timestampMapBuffer
      .mapAsync(GPUMapMode.READ, 0, timestampBufferSize)
      .then(() => {
        const buffer = timestampMapBuffer.getMappedRange(0, timestampBufferSize);
        const timestamps = new BigUint64Array(buffer);

        // Measure difference (in bigints)
        const elapsedNs = timestamps[1] - timestamps[0];
        // Cast into regular int (ok because value is small after difference)
        // and convert from nanoseconds to milliseconds:
        const elapsedMs = Number(elapsedNs) * 1e-6;
        renderPassDurationCounter.addSample(elapsedMs);
        console.log("timestamps (ms): elapsed", elapsedMs, "avg", renderPassDurationCounter.getAverage());
        perfDisplay.innerHTML = `Render Pass duration: ${renderPassDurationCounter.getAverage().toFixed(3)} ms ± ${renderPassDurationCounter.getStddev().toFixed(3)} ms`;

        timestampMapBuffer.unmap();
        hasOngoingTimestampReadback = false;
      })
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
