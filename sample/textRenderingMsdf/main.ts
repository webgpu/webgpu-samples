import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';
import { MsdfTextRenderer } from './msdfText';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const depthFormat = 'depth24plus';

context.configure({
  device,
  format: presentationFormat,
});

const textRenderer = new MsdfTextRenderer(
  device,
  presentationFormat,
  depthFormat
);
const font = await textRenderer.createFont(
  new URL(
    '../../assets/font/ya-hei-ascii-msdf.json',
    import.meta.url
  ).toString()
);

function getTextTransform(
  position: [number, number, number],
  rotation?: [number, number, number]
) {
  const textTransform = mat4.create();
  mat4.identity(textTransform);
  mat4.translate(textTransform, position, textTransform);
  if (rotation && rotation[0] != 0) {
    mat4.rotateX(textTransform, rotation[0], textTransform);
  }
  if (rotation && rotation[1] != 0) {
    mat4.rotateY(textTransform, rotation[1], textTransform);
  }
  if (rotation && rotation[2] != 0) {
    mat4.rotateZ(textTransform, rotation[2], textTransform);
  }
  return textTransform;
}

const textTransforms = [
  getTextTransform([0, 0, 1.1]),
  getTextTransform([0, 0, -1.1], [0, Math.PI, 0]),
  getTextTransform([1.1, 0, 0], [0, Math.PI / 2, 0]),
  getTextTransform([-1.1, 0, 0], [0, -Math.PI / 2, 0]),
  getTextTransform([0, 1.1, 0], [-Math.PI / 2, 0, 0]),
  getTextTransform([0, -1.1, 0], [Math.PI / 2, 0, 0]),
];

const titleText = textRenderer.formatText(font, `WebGPU`, {
  centered: true,
  pixelScale: 1 / 128,
});
const largeText = textRenderer.formatText(
  font,
  `
WebGPU exposes an API for performing operations, such as rendering
and computation, on a Graphics Processing Unit.

Graphics Processing Units, or GPUs for short, have been essential
in enabling rich rendering and computational applications in personal
computing. WebGPU is an API that exposes the capabilities of GPU
hardware for the Web. The API is designed from the ground up to
efficiently map to (post-2014) native GPU APIs. WebGPU is not related
to WebGL and does not explicitly target OpenGL ES.

WebGPU sees physical GPU hardware as GPUAdapters. It provides a
connection to an adapter via GPUDevice, which manages resources, and
the device’s GPUQueues, which execute commands. GPUDevice may have
its own memory with high-speed access to the processing units.
GPUBuffer and GPUTexture are the physical resources backed by GPU
memory. GPUCommandBuffer and GPURenderBundle are containers for
user-recorded commands. GPUShaderModule contains shader code. The
other resources, such as GPUSampler or GPUBindGroup, configure the
way physical resources are used by the GPU.

GPUs execute commands encoded in GPUCommandBuffers by feeding data
through a pipeline, which is a mix of fixed-function and programmable
stages. Programmable stages execute shaders, which are special
programs designed to run on GPU hardware. Most of the state of a
pipeline is defined by a GPURenderPipeline or a GPUComputePipeline
object. The state not included in these pipeline objects is set
during encoding with commands, such as beginRenderPass() or
setBlendConstant().`,
  { pixelScale: 1 / 256 }
);

const text = [
  textRenderer.formatText(font, 'Front', {
    centered: true,
    pixelScale: 1 / 128,
    color: [1, 0, 0, 1],
  }),
  textRenderer.formatText(font, 'Back', {
    centered: true,
    pixelScale: 1 / 128,
    color: [0, 1, 1, 1],
  }),
  textRenderer.formatText(font, 'Right', {
    centered: true,
    pixelScale: 1 / 128,
    color: [0, 1, 0, 1],
  }),
  textRenderer.formatText(font, 'Left', {
    centered: true,
    pixelScale: 1 / 128,
    color: [1, 0, 1, 1],
  }),
  textRenderer.formatText(font, 'Top', {
    centered: true,
    pixelScale: 1 / 128,
    color: [0, 0, 1, 1],
  }),
  textRenderer.formatText(font, 'Bottom', {
    centered: true,
    pixelScale: 1 / 128,
    color: [1, 1, 0, 1],
  }),

  titleText,
  largeText,
];

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
      code: vertexPositionColorWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
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
    format: depthFormat,
  },
});

const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: depthFormat,
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

      clearValue: [0, 0, 0, 1],
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
};

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
const modelViewProjectionMatrix = mat4.create();

const start = Date.now();
function getTransformationMatrix() {
  const now = Date.now() / 5000;
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -5), viewMatrix);

  const modelMatrix = mat4.identity();
  mat4.translate(modelMatrix, vec3.fromValues(0, 2, -3), modelMatrix);
  mat4.rotate(
    modelMatrix,
    vec3.fromValues(Math.sin(now), Math.cos(now), 0),
    1,
    modelMatrix
  );

  // Update the matrix for the cube
  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
  mat4.multiply(
    modelViewProjectionMatrix,
    modelMatrix,
    modelViewProjectionMatrix
  );

  // Update the projection and view matrices for the text
  textRenderer.updateCamera(projectionMatrix, viewMatrix);

  // Update the transform of all the text surrounding the cube
  const textMatrix = mat4.create();
  for (const [index, transform] of textTransforms.entries()) {
    mat4.multiply(modelMatrix, transform, textMatrix);
    text[index].setTransform(textMatrix);
  }

  // Update the transform of the larger block of text
  const crawl = ((Date.now() - start) / 2500) % 14;
  mat4.identity(textMatrix);
  mat4.rotateX(textMatrix, -Math.PI / 8, textMatrix);
  mat4.translate(textMatrix, [0, crawl - 3, 0], textMatrix);
  titleText.setTransform(textMatrix);
  mat4.translate(textMatrix, [-3, -0.1, 0], textMatrix);
  largeText.setTransform(textMatrix);

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
  passEncoder.draw(cubeVertexCount, 1, 0, 0);

  textRenderer.render(passEncoder, ...text);

  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
