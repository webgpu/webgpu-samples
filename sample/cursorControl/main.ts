import { mat4, vec3 } from 'wgpu-matrix';
import simpleLightingWGSL from './simple-lighting.wgsl';
import {
  createPlaneVertices,
  createSphereVertices,
  createTorusVertices,
  reorientInPlace,
  VertexData,
} from '../../meshes/primitives';
import { quitIfWebGPUNotAvailable } from '../util';

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

// Get a WebGPU context from the canvas and configure it
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

// Creates a buffer and puts data in it.
function createBufferWithData(
  device: GPUDevice,
  data: ArrayBufferView,
  usage: GPUBufferUsageFlags
) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

// Represents Geometry like a plane, a sphere, a torus
type Geometry = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexFormat: GPUIndexFormat;
  numVertices: number;
};

// Creates vertex and index buffers for the given data.
function createGeometry(
  device: GPUDevice,
  { vertices, indices }: VertexData
): Geometry {
  const vertexBuffer = createBufferWithData(
    device,
    vertices,
    GPUBufferUsage.VERTEX
  );
  const indexBuffer = createBufferWithData(
    device,
    indices,
    GPUBufferUsage.INDEX
  );
  return {
    vertexBuffer,
    indexBuffer,
    indexFormat: 'uint16',
    numVertices: indices.length,
  };
}

// Create Geometry for our scenes.
const planeVerts = reorientInPlace(
  createPlaneVertices(),
  mat4.multiply(mat4.rotationY(Math.PI), mat4.rotationX(-Math.PI / 2))
);
const planeGeo = createGeometry(device, planeVerts);
const sphereGeo = createGeometry(device, createSphereVertices());
const torusGeo = createGeometry(
  device,
  createTorusVertices({ radius: 0.7, thickness: 0.3 })
);

// Create a bind group layout and pipeline layout so we can
// share the bind groups with multiple pipelines.
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: {},
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: {},
    },
  ],
});
const layout = device.createPipelineLayout({
  bindGroupLayouts: [bindGroupLayout],
});

const module = device.createShaderModule({ code: simpleLightingWGSL });
const pipelineDesc: GPURenderPipelineDescriptor = {
  layout,
  vertex: {
    module,
    buffers: [
      {
        arrayStride: 32,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
          { shaderLocation: 2, offset: 24, format: 'float32x2' },
        ],
      },
    ],
  },
  fragment: {
    module,
    targets: [{ format: presentationFormat }],
  },
  primitive: {
    topology: 'triangle-list',
    cullMode: 'back',
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    // The stencilFront setting specifies what happens when a front facing
    // triangle is rasterized. passOp: 'replace' means, when the texel "pass"es
    // the depth and stencil tests, replace the value in the stencil texture
    // with the reference value. The depth test is specified above. The stencil
    // test defaults to "always". The reference value is specified in the
    // command buffer with setStencilReference.
    // Effectively we'll draw the reference value into the stencil texture
    // with the reference value anywhere we draw the plane controlled by a cursor.
    stencilFront: { passOp: 'replace' },
    format: 'depth24plus-stencil8',
  },
};

// Make two render pipelines. One to set the stencil and one to draw
// only where the stencil equals the stencil reference value.
const stencilSetPipeline = device.createRenderPipeline(pipelineDesc);
// passOp: 'keep' means, when the texel "pass"es the depth and stencil tests,
// keep the value in the stencil texture as is. We set the stencil
// test to 'equal' so the texel will only pass the stencil test when
// the reference value, set in the command buffer with setStencilReference,
// matches what's already in the stencil texture.
pipelineDesc.depthStencil.stencilFront.passOp = 'keep';
pipelineDesc.depthStencil.stencilFront.compare = 'equal';
const stencilMaskPipeline = device.createRenderPipeline(pipelineDesc);

function r(min: number, max?: number) {
  if (typeof max === 'undefined') {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${(h * 360) | 0}, ${s * 100}%, ${(l * 100) | 0}%)`;

const cssColorToRGBA8 = (() => {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return (cssColor: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  };
})();

const cssColorToRGBA = (cssColor: string) =>
  cssColorToRGBA8(cssColor).map((v: number) => v / 255);
const hslToRGBA = (h: number, s: number, l: number) =>
  cssColorToRGBA(hsl(h, s, l));

const randElem = <T>(arr: T[]) => arr[r(arr.length) | 0];

// Per object data.
type ObjectInfo = {
  uniformValues: Float32Array;
  uniformBuffer: GPUBuffer;
  worldMatrix: Float32Array;
  bindGroup: GPUBindGroup;
  geometry: Geometry;
};

// Per scene data.
type Scene = {
  objectInfos: ObjectInfo[];
  sharedUniformBuffer: GPUBuffer;
  sharedUniformValues: Float32Array;
  viewProjectionMatrix: Float32Array;
  lightDirection: Float32Array;
};

/**
 * Make a scene with a bunch of semi-randomly colored objects/
 * Each scene has a shared uniform buffer for viewProjection and lightDirection
 * Each object has it's own uniform buffer for its color and its worldMatrix.
 */
function makeScene(
  numInstances: number,
  hue: number,
  geometries: Geometry[]
): Scene {
  const sharedUniformValues = new Float32Array(16 + 4); // mat4x4f, vec3f
  const viewProjectionMatrix = sharedUniformValues.subarray(0, 16);
  const lightDirection = sharedUniformValues.subarray(16, 19);
  const sharedUniformBuffer = device.createBuffer({
    size: sharedUniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const objectInfos: ObjectInfo[] = [];
  for (let i = 0; i < numInstances; ++i) {
    const uniformValues = new Float32Array(16 + 4); // mat4x4f, vec4f
    const worldMatrix = uniformValues.subarray(0, 16);
    const colorValue = uniformValues.subarray(16, 20);
    const uniformBuffer = device.createBuffer({
      size: uniformValues.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    colorValue.set(hslToRGBA(hue + r(0.2), r(0.7, 1), r(0.5, 0.8)));
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: sharedUniformBuffer } },
      ],
    });

    objectInfos.push({
      uniformValues,
      uniformBuffer,
      worldMatrix,
      bindGroup,
      geometry: randElem(geometries),
    });
  }
  return {
    objectInfos,
    sharedUniformBuffer,
    sharedUniformValues,
    viewProjectionMatrix,
    lightDirection,
  };
}

// Make our masking scenes, each with a single plane.
const maskScene = makeScene(1, 0.5, [planeGeo]);

// Make our object scenes, one for the background and one for the plane.
const sceneBg = makeScene(100, 0.5, [sphereGeo]);
const sceneMask = makeScene(100, 0.1, [torusGeo]);

let depthTexture: GPUTexture;
let canvasTexture: GPUTexture;

/**
 * Update the viewProject and light position of the scene
 * and world matrix of the plane
 */
function updateMask(
  time: number,
  {
    objectInfos,
    sharedUniformBuffer,
    sharedUniformValues,
    viewProjectionMatrix,
    lightDirection,
  }: Scene
) {
  const projection = mat4.perspective(
    (30 * Math.PI) / 180,
    canvas.clientWidth / canvas.clientHeight,
    0.5,
    100
  );
  const eye = [0, 0, 45];
  const target = [0, 0, 0];
  const up = [0, 1, 0];

  const view = mat4.lookAt(eye, target, up);
  mat4.multiply(projection, view, viewProjectionMatrix);

  lightDirection.set(vec3.normalize([1, 8, 10]));

  device.queue.writeBuffer(sharedUniformBuffer, 0, sharedUniformValues);

  objectInfos.forEach(({ uniformBuffer, uniformValues, worldMatrix }) => {
    mat4.identity(worldMatrix);
    mat4.scale(worldMatrix, [10, 10, 10], worldMatrix);
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
  });
}

/**
 * Update the viewProjection and light position.
 * and world matrix of the every object in the scene.
 * This update scene has a fixed position camera and
 * has objects orbiting and spinning around the origin.
 */
function updateScene(
  time: number,
  {
    objectInfos,
    sharedUniformBuffer,
    sharedUniformValues,
    viewProjectionMatrix,
    lightDirection,
  }: Scene
) {
  const projection = mat4.perspective(
    (30 * Math.PI) / 180,
    canvas.clientWidth / canvas.clientHeight,
    0.5,
    100
  );
  const eye = [0, 0, 35];
  const target = [0, 0, 0];
  const up = [0, 1, 0];

  const view = mat4.lookAt(eye, target, up);
  mat4.multiply(projection, view, viewProjectionMatrix);

  lightDirection.set(vec3.normalize([1, 8, 10]));

  device.queue.writeBuffer(sharedUniformBuffer, 0, sharedUniformValues);

  objectInfos.forEach(({ uniformBuffer, uniformValues, worldMatrix }, i) => {
    mat4.identity(worldMatrix);
    mat4.translate(
      worldMatrix,
      [0, 0, Math.sin(i * 3.721 + time * 0.1) * 10],
      worldMatrix
    );
    mat4.rotateX(worldMatrix, i * 4.567, worldMatrix);
    mat4.rotateY(worldMatrix, i * 2.967, worldMatrix);
    mat4.translate(
      worldMatrix,
      [0, 0, Math.sin(i * 9.721 + time * 0.1) * 10],
      worldMatrix
    );
    mat4.rotateX(worldMatrix, time * 0.53 + i, worldMatrix);
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
  });
}

/**
 * Draw a scene and every object in it with a specific stencilReference value
 */
function drawScene(
  encoder: GPUCommandEncoder,
  renderPassDescriptor: GPURenderPassDescriptor,
  pipeline: GPURenderPipeline,
  scene: Scene,
  stencilRef: number
) {
  const { objectInfos } = scene;

  renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
  renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);
  pass.setStencilReference(stencilRef);

  objectInfos.forEach(({ bindGroup, geometry }) => {
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, geometry.vertexBuffer);
    pass.setIndexBuffer(geometry.indexBuffer, geometry.indexFormat);
    pass.drawIndexed(geometry.numVertices);
  });

  pass.end();
}

const clearPassDesc: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later
      clearValue: [0.2, 0.2, 0.2, 1.0],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: undefined, // Assigned later
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    stencilLoadOp: 'clear',
    stencilStoreOp: 'store',
  },
};

const loadPassDesc: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later
      loadOp: 'load',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: undefined, // Assigned later
    depthClearValue: 1,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    stencilLoadOp: 'load',
    stencilStoreOp: 'store',
  },
};

function render(time: number) {
  time *= 0.001;

  canvasTexture = context.getCurrentTexture();
  // If we don't have a depth texture OR if its size is different
  // from the canvasTexture when make a new depth texture
  if (
    !depthTexture ||
    depthTexture.width !== canvasTexture.width ||
    depthTexture.height !== canvasTexture.height
  ) {
    depthTexture?.destroy();
    depthTexture = device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  updateMask(time, maskScene);

  updateScene(time, sceneBg);
  updateScene(time, sceneMask);

  const encoder = device.createCommandEncoder();

  // Draw the plane of the stencil buffer
  // each with a different stencil value.
  drawScene(encoder, clearPassDesc, stencilSetPipeline, maskScene, 1);

  // Draw each scene of moving objects but only where the stencil value
  // matches the stencil reference.
  drawScene(encoder, loadPassDesc, stencilMaskPipeline, sceneBg, 0);
  drawScene(encoder, loadPassDesc, stencilMaskPipeline, sceneMask, 1);

  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
