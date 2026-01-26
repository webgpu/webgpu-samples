import { mat4 } from 'wgpu-matrix';

import sampleCubemapWGSL from './sampleCubemap.wgsl';
import { quitIfWebGPUNotAvailableOrMissingFeatures } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);

const context = canvas.getContext('webgpu');

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const module = device.createShaderModule({ code: sampleCubemapWGSL });
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module },
  fragment: {
    module,
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
});

// Fetch the 6 separate images for negative/positive x, y, z axis of a cubemap
// and upload it into a GPUTexture.
let cubemapTexture: GPUTexture;
{
  // The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
  const imgSrcs = [
    '../../assets/img/cubemap/posx.jpg',
    '../../assets/img/cubemap/negx.jpg',
    '../../assets/img/cubemap/posy.jpg',
    '../../assets/img/cubemap/negy.jpg',
    '../../assets/img/cubemap/posz.jpg',
    '../../assets/img/cubemap/negz.jpg',
  ];
  const promises = imgSrcs.map(async (src) => {
    const response = await fetch(src);
    return createImageBitmap(await response.blob());
  });
  const imageBitmaps = await Promise.all(promises);

  cubemapTexture = device.createTexture({
    dimension: '2d',
    textureBindingViewDimension: 'cube',
    // Create a 2d array texture.
    // Assume each image has the same size.
    size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  for (let i = 0; i < imageBitmaps.length; i++) {
    const imageBitmap = imageBitmaps[i];
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: cubemapTexture, origin: [0, 0, i] },
      [imageBitmap.width, imageBitmap.height]
    );
  }
}

const uniformBufferSize = 4 * 16; // 4x4 matrix
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
});

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: uniformBuffer,
    },
    {
      binding: 1,
      resource: sampler,
    },
    {
      binding: 2,
      resource: cubemapTexture.createView({
        dimension: 'cube',
      }),
    },
  ],
});

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
};

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 3000);

const modelMatrix = mat4.identity();
const modelViewProjectionInverseMatrix = mat4.create();
const viewMatrix = mat4.identity();

const tmpMat4 = mat4.create();

// Compute camera movement:
// It rotates around Y axis with a slight pitch movement.
function updateTransformationMatrix() {
  const now = Date.now() / 800;

  mat4.rotate(viewMatrix, [1, 0, 0], (Math.PI / 10) * Math.sin(now), tmpMat4);
  mat4.rotate(tmpMat4, [0, 1, 0], now * 0.2, tmpMat4);

  mat4.multiply(tmpMat4, modelMatrix, modelViewProjectionInverseMatrix);
  mat4.multiply(
    projectionMatrix,
    modelViewProjectionInverseMatrix,
    modelViewProjectionInverseMatrix
  );
  mat4.inverse(
    modelViewProjectionInverseMatrix,
    modelViewProjectionInverseMatrix
  );
}

function frame() {
  updateTransformationMatrix();
  device.queue.writeBuffer(
    uniformBuffer,
    0,
    modelViewProjectionInverseMatrix.buffer,
    modelViewProjectionInverseMatrix.byteOffset,
    modelViewProjectionInverseMatrix.byteLength
  );

  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.draw(3);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
