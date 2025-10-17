import { mat4 } from 'wgpu-matrix';
import { generateMips } from './generateMipmap';
import { quitIfWebGPUNotAvailable } from '../util';
import { makeCanvasImage } from './makeCanvasImage';
import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import textureGeometryWGSL from './texturedGeometry.wgsl';

const hsl = (h: number, s: number, l: number) =>
  `hsl(${h * 360} ${s * 100}% ${l * 100}%)`;

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter.requestDevice({
  requiredFeatures: adapter.features.has('core-features-and-limits')
    ? ['core-features-and-limits']
    : [],
});
quitIfWebGPUNotAvailable(adapter, device);

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('webgpu');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: presentationFormat,
});

const textures: {
  texture: GPUTexture;
  viewDimension: GPUTextureViewDimension;
}[] = [];

// make a 2d texture, put an image in it, generate mips
{
  const texture = device.createTexture({
    size: [256, 256],
    mipLevelCount: 9,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  putDataInTexture2d(device, texture);
  generateMips(device, texture);
  textures.push({ texture, viewDimension: '2d' });
}

// Make a 2d array texture, put an image in each layer, generate mips
{
  const texture = device.createTexture({
    size: [256, 256, 10],
    mipLevelCount: 9,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  putDataInTexture2dArray(device, texture);
  generateMips(device, texture);
  textures.push({ texture, viewDimension: '2d-array' });
}

// Make a cube texture, put an image in each face, generate mips
{
  const texture = device.createTexture({
    size: [256, 256, 6],
    textureBindingViewDimension: 'cube',
    mipLevelCount: 9,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  putDataInTextureCube(device, texture);
  generateMips(device, texture, 'cube');
  textures.push({ texture, viewDimension: 'cube' });
}

// Compatibility mode might not support 'core-features-and-limits'
// Note: Checking for maxColorAttachments > 4 is not required by the spec
// but some browsers have not implemented 'core-features-and-limits'.
// We'll remove this once they do.
if (
  device.features.has('core-features-and-limits') ||
  device.limits.maxColorAttachments > 4
) {
  // Make a cube array texture, put a different image in each layer, generate mips
  const texture = device.createTexture({
    size: [256, 256, 24],
    mipLevelCount: 9,
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  putDataInTextureCubeArray(device, texture);
  generateMips(device, texture);
  textures.push({ texture, viewDimension: 'cube-array' });
} else {
  // Make a cube texture as a fallback since we can't make a cube-array,
  // put a different image in each face, generate mips
  const texture = device.createTexture({
    size: [256, 256, 6],
    mipLevelCount: 9,
    format: 'rgba8unorm',
    textureBindingViewDimension: 'cube',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  putDataInTextureCubeFallback(device, texture);
  generateMips(device, texture, 'cube');
  textures.push({ texture, viewDimension: 'cube' });
  document.querySelector('#cube-array').textContent = 'cube(fallback)';
}

const module = device.createShaderModule({
  code: textureGeometryWGSL,
});

const sampler = device.createSampler({
  minFilter: 'linear',
  magFilter: 'linear',
  mipmapFilter: 'linear',
});

const uniformBuffer = device.createBuffer({
  size: 16 * 4,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
});
const uniformValues = new ArrayBuffer(uniformBuffer.size);
const matrix = new Float32Array(uniformValues);

// Make pipelines using shaders for each type of texture (2d, 2d-array, cube, cube-array) and,
// make a bindGroup that uses that texture.
const objects = textures.map(({ texture, viewDimension }) => {
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: `vs_${viewDimension.replace('-', '_')}`,
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
      module,
      entryPoint: `fs_${viewDimension.replace('-', '_')}`,
      targets: [{ format: presentationFormat }],
    },
    primitive: {
      cullMode: 'back',
    },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      {
        binding: 2,
        resource: texture.createView({ dimension: viewDimension }),
      },
    ],
  });
  return { pipeline, bindGroup };
});

// Create a vertex buffer from the cube data.
const verticesBuffer = device.createBuffer({
  size: cubeVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
verticesBuffer.unmap();

const renderPassDescriptor: GPURenderPassDescriptor = {
  label: 'our basic canvas renderPass',
  colorAttachments: [
    {
      view: undefined, // <- to be filled out when we render
      clearValue: [0.3, 0.3, 0.3, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
};

function render(time: number) {
  time *= 0.001;

  const canvasTexture = context.getCurrentTexture();
  renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const projection = mat4.perspective((90 * Math.PI) / 180, aspect, 0.1, 20);
  const view = mat4.lookAt(
    [0, 4 + 2.5 * Math.sin(time), 2], // eye
    [0, 0, 0], // target
    [0, 1, 0] // up
  );
  const viewProjection = mat4.multiply(projection, view);
  mat4.rotateX(viewProjection, time, matrix);
  mat4.rotateY(matrix, time * 0.7, matrix);

  device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setVertexBuffer(0, verticesBuffer);

  // draw each cube in a different quadrant of the canvas texture
  // by using setViewport to select an area.
  objects.forEach(({ pipeline, bindGroup }, i) => {
    const x = i % 2;
    const y = (i / 2) | 0;
    const w = canvasTexture.width;
    const h = canvasTexture.height;
    pass.setViewport((x * w) / 2, (y * h) / 2, w / 2, h / 2, 0, 1);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(cubeVertexCount, 1, 0, time | 0);
  });

  pass.end();
  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ---

function putDataInTexture2d(device: GPUDevice, texture: GPUTexture) {
  const canvas = makeCanvasImage({
    width: 256,
    height: 256,
    backgroundColor: '#f00',
    borderColor: '#ff0',
    foregroundColor: '#fff',
    text: ['😅'],
  });
  device.queue.copyExternalImageToTexture(
    { source: canvas },
    { texture: texture },
    [256, 256]
  );
}

function putDataInTexture2dArray(device: GPUDevice, texture: GPUTexture) {
  // prettier-ignore
  const faces = ['🐵', '🐶', '🦊', '🐱', '🐷', '🐮', '🐸', '🐙', '🐹', '🐼', '🐨', '🐭', '🦁', '🐯'];
  for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
    const h = layer / texture.depthOrArrayLayers;
    const canvas = makeCanvasImage({
      width: 256,
      height: 256,
      backgroundColor: hsl(h, 0.5, 0.5),
      borderColor: hsl(h + 0.5, 1, 0.75),
      foregroundColor: '#fff',
      text: [faces[layer]],
    });
    device.queue.copyExternalImageToTexture(
      { source: canvas },
      { texture: texture, origin: [0, 0, layer] },
      [256, 256]
    );
  }
}

function putDataInTextureCube(device: GPUDevice, texture: GPUTexture) {
  const kFaces = ['+x', '-x', '+y', '-y', '+z', '-z'];
  for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
    const h = layer / texture.depthOrArrayLayers;
    const canvas = makeCanvasImage({
      width: 256,
      height: 256,
      backgroundColor: hsl(h, 0.5, 0.5),
      borderColor: hsl(h + 0.5, 1, 0.75),
      foregroundColor: '#f00',
      text: ['🌞', kFaces[layer]],
    });
    device.queue.copyExternalImageToTexture(
      { source: canvas },
      { texture: texture, origin: [0, 0, layer] },
      [256, 256]
    );
  }
}

function putDataInTextureCubeArray(device: GPUDevice, texture: GPUTexture) {
  const kFaces = ['+x', '-x', '+y', '-y', '+z', '-z'];
  const kLayers = ['💐', '🌸', '🪷', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼'];
  const cubeLayers = texture.depthOrArrayLayers / 6;
  for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
    const cubeLayer = (layer / 6) | 0;
    const face = layer % 6;
    const h = cubeLayer / cubeLayers;
    const canvas = makeCanvasImage({
      width: 256,
      height: 256,
      backgroundColor: hsl(h, 0.5, 0.5),
      borderColor: hsl(h + 0.5, 1, 0.75),
      foregroundColor: '#fff',
      text: [kLayers[cubeLayer], kFaces[face]],
    });
    device.queue.copyExternalImageToTexture(
      { source: canvas },
      { texture: texture, origin: [0, 0, layer] },
      [256, 256]
    );
  }
}

// Used when cube-array does not exist.
function putDataInTextureCubeFallback(device: GPUDevice, texture: GPUTexture) {
  const kFaces = ['+x', '-x', '+y', '-y', '+z', '-z'];
  const kNo = ['⛔️', '🚫', '❌', '👎', '🤬', '😱'];
  for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
    const canvas = makeCanvasImage({
      width: 256,
      height: 256,
      backgroundColor: '#400',
      borderColor: '#f00',
      foregroundColor: '#8ff',
      text: [kNo[layer], kFaces[layer]],
    });
    device.queue.copyExternalImageToTexture(
      { source: canvas },
      { texture: texture, origin: [0, 0, layer] },
      [256, 256]
    );
  }
}
