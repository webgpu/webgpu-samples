import { GUI } from 'dat.gui';
import { mat4 } from 'wgpu-matrix';
import solidColorLitWGSL from './solidColorLit.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

const settings = {
  animate: true,
};
const gui = new GUI();
gui.add(settings, 'animate');

type TypedArrayView =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

const info = document.querySelector('#info');

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('webgpu') as GPUCanvasContext;
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: presentationFormat,
});
const depthFormat = 'depth24plus';

const module = device.createShaderModule({
  code: solidColorLitWGSL,
});

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module,
    buffers: [
      {
        arrayStride: 6 * 4, // 3x2 floats, 4 bytes each
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
          { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
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
    format: depthFormat,
  },
});

// prettier-ignore
const cubePositions = [
  { position: [-1,  0,  0], id: '🟥', color: [1, 0, 0, 1] },
  { position: [ 1,  0,  0], id: '🟨', color: [1, 1, 0, 1] },
  { position: [ 0, -1,  0], id: '🟩', color: [0, 0.5, 0, 1] },
  { position: [ 0,  1,  0], id: '🟧', color: [1, 0.6, 0, 1] },
  { position: [ 0,  0, -1], id: '🟦', color: [0, 0, 1, 1] },
  { position: [ 0,  0,  1], id: '🟪', color: [0.5, 0, 0.5, 1] },
];

const objectInfos = cubePositions.map(({ position, id, color }) => {
  const uniformBufferSize = (2 * 16 + 3 + 1 + 4) * 4;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformValues = new Float32Array(uniformBufferSize / 4);
  const worldViewProjection = uniformValues.subarray(0, 16);
  const worldInverseTranspose = uniformValues.subarray(16, 32);
  const colorValue = uniformValues.subarray(32, 36);

  colorValue.set(color);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  return {
    id,
    position: position.map((v) => v * 10),
    bindGroup,
    uniformBuffer,
    uniformValues,
    worldInverseTranspose,
    worldViewProjection,
  };
});

const querySet = device.createQuerySet({
  type: 'occlusion',
  count: objectInfos.length,
});

const resolveBuf = device.createBuffer({
  label: 'resolveBuffer',
  // Query results are 64bit unsigned integers.
  size: objectInfos.length * BigUint64Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
});

const resultBuf = device.createBuffer({
  label: 'resultBuffer',
  size: resolveBuf.size,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});

function createBufferWithData(
  device: GPUDevice,
  data: TypedArrayView,
  usage: GPUBufferUsageFlags,
  label: string
) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  const Ctor = data.constructor as TypedArrayConstructor;
  const dst = new Ctor(buffer.getMappedRange());
  dst.set(data);
  buffer.unmap();
  return buffer;
}

// prettier-ignore
const vertexData = new Float32Array([
// position       normal
   1,  1, -1,     1,  0,  0,
   1,  1,  1,     1,  0,  0,
   1, -1,  1,     1,  0,  0,
   1, -1, -1,     1,  0,  0,
  -1,  1,  1,    -1,  0,  0,
  -1,  1, -1,    -1,  0,  0,
  -1, -1, -1,    -1,  0,  0,
  -1, -1,  1,    -1,  0,  0,
  -1,  1,  1,     0,  1,  0,
   1,  1,  1,     0,  1,  0,
   1,  1, -1,     0,  1,  0,
  -1,  1, -1,     0,  1,  0,
  -1, -1, -1,     0, -1,  0,
   1, -1, -1,     0, -1,  0,
   1, -1,  1,     0, -1,  0,
  -1, -1,  1,     0, -1,  0,
   1,  1,  1,     0,  0,  1,
  -1,  1,  1,     0,  0,  1,
  -1, -1,  1,     0,  0,  1,
   1, -1,  1,     0,  0,  1,
  -1,  1, -1,     0,  0, -1,
   1,  1, -1,     0,  0, -1,
   1, -1, -1,     0,  0, -1,
  -1, -1, -1,     0,  0, -1,
]);
// prettier-ignore
const indices = new Uint16Array([
   0,  1,  2,  0,  2,  3, // +x face
   4,  5,  6,  4,  6,  7, // -x face
   8,  9, 10,  8, 10, 11, // +y face
  12, 13, 14, 12, 14, 15, // -y face
  16, 17, 18, 16, 18, 19, // +z face
  20, 21, 22, 20, 22, 23, // -z face
]);

const vertexBuf = createBufferWithData(
  device,
  vertexData,
  GPUBufferUsage.VERTEX,
  'vertexBuffer'
);
const indicesBuf = createBufferWithData(
  device,
  indices,
  GPUBufferUsage.INDEX,
  'indexBuffer'
);

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
    view: undefined, // Assigned later
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
  occlusionQuerySet: querySet,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: number[], b: number[], t: number) =>
  a.map((v, i) => lerp(v, b[i], t));
const pingPongSine = (t: number) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

let depthTexture: GPUTexture | undefined;

let time = 0;
let then = 0;
function render(now: number) {
  now *= 0.001; // convert to seconds
  const deltaTime = now - then;
  then = now;

  if (settings.animate) {
    time += deltaTime;
  }

  const projection = mat4.perspective(
    (30 * Math.PI) / 180,
    canvas.clientWidth / canvas.clientHeight,
    0.5,
    100
  );

  const m = mat4.identity();
  mat4.rotateX(m, time, m);
  mat4.rotateY(m, time * 0.7, m);
  mat4.translate(m, lerpV([0, 0, 5], [0, 0, 40], pingPongSine(time * 0.2)), m);
  const view = mat4.inverse(m);
  const viewProjection = mat4.multiply(projection, view);

  const canvasTexture = context.getCurrentTexture();
  if (
    !depthTexture ||
    depthTexture.width !== canvasTexture.width ||
    depthTexture.height !== canvasTexture.height
  ) {
    depthTexture?.destroy();
    depthTexture = device.createTexture({
      size: canvasTexture, // canvasTexture has width, height, and depthOrArrayLayers properties
      format: depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  const colorTexture = context.getCurrentTexture();
  renderPassDescriptor.colorAttachments[0].view = colorTexture.createView();
  renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuf);
  pass.setIndexBuffer(indicesBuf, 'uint16');

  objectInfos.forEach(
    (
      {
        bindGroup,
        uniformBuffer,
        uniformValues,
        worldViewProjection,
        worldInverseTranspose,
        position,
      },
      i
    ) => {
      const world = mat4.translation(position);
      mat4.transpose(mat4.inverse(world), worldInverseTranspose);
      mat4.multiply(viewProjection, world, worldViewProjection);

      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

      pass.setBindGroup(0, bindGroup);
      pass.beginOcclusionQuery(i);
      pass.drawIndexed(indices.length);
      pass.endOcclusionQuery();
    }
  );

  pass.end();
  encoder.resolveQuerySet(querySet, 0, objectInfos.length, resolveBuf, 0);
  if (resultBuf.mapState === 'unmapped') {
    encoder.copyBufferToBuffer(resolveBuf, 0, resultBuf, 0, resultBuf.size);
  }

  device.queue.submit([encoder.finish()]);

  if (resultBuf.mapState === 'unmapped') {
    resultBuf.mapAsync(GPUMapMode.READ).then(() => {
      const results = new BigUint64Array(resultBuf.getMappedRange());

      const visible = objectInfos
        .filter((_, i) => results[i])
        .map(({ id }) => id)
        .join('');
      info.textContent = `visible: ${visible}`;

      resultBuf.unmap();
    });
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
