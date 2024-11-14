import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import fragmentWGSL from '../../shaders/black.frag.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

import PerfCounter from './PerfCounter';
import TimestampQueryManager from './TimestampQueryManager';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();

// The use of timestamps require a dedicated adapter feature:
// The adapter may or may not support timestamp queries. If not, we simply
// don't measure timestamps and deactivate the timer display.
const supportsTimestampQueries = adapter?.features.has('timestamp-query');

const device = await adapter?.requestDevice({
  // We request a device that has support for timestamp queries
  requiredFeatures: supportsTimestampQueries ? ['timestamp-query'] : [],
});
quitIfWebGPUNotAvailable(adapter, device);

// GPU-side timer and the CPU-side counter where we accumulate statistics:
// NB: Look for 'timestampQueryManager' in this file to locate parts of this
// snippets that are related to timestamps. Most of the logic is in
// TimestampQueryManager.ts.
const timestampQueryManager = new TimestampQueryManager(device, 2);
const renderPassDurationCounter = new PerfCounter();

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

// UI for perf counter
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

if (!supportsTimestampQueries) {
  perfDisplay.innerHTML = 'Timestamp queries are not supported';
}

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
      code: fragmentWGSL,
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

      clearValue: [0.95, 0.95, 0.95, 1.0],
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
    querySet: timestampQueryManager.timestampQuerySet,
    beginningOfPassWriteIndex: 0,
    endOfPassWriteIndex: 1,
  },
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

  // Resolve timestamp queries, so that their result is available in
  // a GPU-sude buffer.
  timestampQueryManager.resolveAll(commandEncoder);

  device.queue.submit([commandEncoder.finish()]);

  // Read timestamp value back from GPU buffers
  timestampQueryManager.readAsync((timestamps) => {
    // This may happen (see spec https://gpuweb.github.io/gpuweb/#timestamp)
    if (timestamps[1] < timestamps[0]) return;

    // Measure difference (in bigints)
    const elapsedNs = timestamps[1] - timestamps[0];
    // Cast into regular int (ok because value is small after difference)
    // and convert from nanoseconds to milliseconds:
    const elapsedMs = Number(elapsedNs) * 1e-6;
    renderPassDurationCounter.addSample(elapsedMs);
    console.log(
      'timestamps (ms): elapsed',
      elapsedMs,
      'avg',
      renderPassDurationCounter.getAverage()
    );
    perfDisplay.innerHTML = `Render Pass duration: ${renderPassDurationCounter
      .getAverage()
      .toFixed(3)} ms ± ${renderPassDurationCounter.getStddev().toFixed(3)} ms`;
  });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
