/* eslint-disable prettier/prettier */
import { mat4, mat3 } from 'wgpu-matrix';
import { modelData } from './models';
import solidColorLitWGSL from './solidColorLit.wgsl';
import wireframeWGSL from './wireframe.wgsl';

type TypedArrayView = Float32Array | Uint32Array;

function createBufferWithData(
  device: GPUDevice,
  data: TypedArrayView,
  usage: number
) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usage,
  });
  device.queue.writeBuffer(buffer, 0, data);
  return buffer;
}

type Model = {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexFormat: GPUIndexFormat;
  vertexCount: number;
};

function createVertexAndIndexBuffer(
  device: GPUDevice,
  { vertices, indices }: { vertices: Float32Array, indices: Uint32Array },
): Model {
  const vertexBuffer = createBufferWithData(
    device,
    vertices,
    GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  );
  const indexBuffer = createBufferWithData(
    device,
    indices,
    GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  );
  return {
    vertexBuffer,
    indexBuffer,
    indexFormat: 'uint32',
    vertexCount: indices.length,
  };
}

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.querySelector('canvas') as HTMLCanvasElement;
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
const depthFormat = 'depth24plus';


const models = Object.values(modelData).map(data => createVertexAndIndexBuffer(device, data));

function rand(min?: number, max?: number) {
  if (min === undefined) {
    max = 1;
    min = 0;
  } else if (max === undefined) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max?: number) {
  return Math.floor(rand(min, max));
}

function randColor() {
  return [rand(), rand(), rand(), 1];
}

const litModule = device.createShaderModule({
  code: solidColorLitWGSL,
});

const wireframeModule = device.createShaderModule({
  code: wireframeWGSL,
});

const litPipeline = device.createRenderPipeline({
  label: 'lit pipeline',
  layout: 'auto',
  vertex: {
    module: litModule,
    buffers: [
      {
        arrayStride: 6 * 4, // position, normal
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
          },
          {
            // normal
            shaderLocation: 1,
            offset: 3 * 4,
            format: 'float32x3',
          },
        ],
      },
    ],
  },
  fragment: {
    module: litModule,
    targets: [{ format: presentationFormat }],
  },
  primitive: {
    cullMode: 'back',
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: depthFormat,
  },
});

const wireframePipeline = device.createRenderPipeline({
  label: 'wireframe pipeline',
  layout: 'auto',
  vertex: {
    module: wireframeModule,
    entryPoint: 'vsIndexedU32',
  },
  fragment: {
    module: wireframeModule,
    targets: [{ format: presentationFormat }],
  },
  primitive: {
    topology: 'line-list',
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less-equal',
    format: depthFormat,
  },
});

type ObjectInfo = {
  worldViewProjectionMatrixValue: Float32Array;
  worldMatrixValue: Float32Array;
  uniformValues: Float32Array;
  uniformBuffer: GPUBuffer;
  litBindGroup: GPUBindGroup;
  wireframeBindGroup: GPUBindGroup;
  model: Model;
};

const objectInfos: ObjectInfo[] = [];

const numObjects = 200;
for (let i = 0; i < numObjects; ++i) {
  // Make a uniform buffer and type array views
  // for our uniforms.
  const uniformValues = new Float32Array(16 + 16 + 4);
  const uniformBuffer = device.createBuffer({
    size: uniformValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const kWorldViewProjectionMatrixOffset = 0;
  const kWorldMatrixOffset = 16;
  const kColorOffset = 32;
  const worldViewProjectionMatrixValue = uniformValues.subarray(
    kWorldViewProjectionMatrixOffset,
    kWorldViewProjectionMatrixOffset + 16);
  const worldMatrixValue = uniformValues.subarray(
    kWorldMatrixOffset,
    kWorldMatrixOffset + 15
  );
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  colorValue.set(randColor());

  const model = models[randInt(models.length)];

  // Make a bind group for this uniform
  const litBindGroup = device.createBindGroup({
    layout: litPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  const strideValues = new Uint32Array(1 + 3);
  const strideBuffer = device.createBuffer({
    size: strideValues.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  strideValues[0] = 6;
  device.queue.writeBuffer(strideBuffer, 0, strideValues);

  const wireframeBindGroup = device.createBindGroup({
    layout: wireframePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: model.vertexBuffer } },
      { binding: 2, resource: { buffer: model.indexBuffer } },
      { binding: 3, resource: { buffer: strideBuffer } },
    ],
  });

  objectInfos.push({
    worldViewProjectionMatrixValue,
    worldMatrixValue,
    uniformValues,
    uniformBuffer,
    litBindGroup,
    wireframeBindGroup,
    model,
  });
}

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
  depthStencilAttachment: {
    view: undefined, // <- to be filled out when we render
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
  },
};

let depthTexture;

function render(time: number) {
  time *= 0.001; // convert to seconds;

  // Get the current texture from the canvas context and
  // set it as the texture to render to.
  const canvasTexture = context.getCurrentTexture();
  renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

  // If we don't have a depth texture OR if its size is different
  // from the canvasTexture when make a new depth texture
  if (
    !depthTexture ||
    depthTexture.width !== canvasTexture.width ||
    depthTexture.height !== canvasTexture.height
  ) {
    if (depthTexture) {
      depthTexture.destroy();
    }
    depthTexture = device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
  renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

  const fov = (60 * Math.PI) / 180;
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const projection = mat4.perspective(fov, aspect, 0.1, 1000);

  const view = mat4.lookAt(
    [-300, 0, 300], // eye
    [0, 0, 0], // target
    [0, 1, 0] // up
  );

  const viewProjection = mat4.multiply(projection, view);

  // make a command encoder to start encoding commands
  const encoder = device.createCommandEncoder();

  // make a render pass encoder to encode render specific commands
  const pass = encoder.beginRenderPass(renderPassDescriptor);
  pass.setPipeline(litPipeline);

  objectInfos.forEach(({
      uniformBuffer,
      uniformValues,
      worldViewProjectionMatrixValue,
      worldMatrixValue,
      litBindGroup,
      model: { vertexBuffer, indexBuffer, indexFormat, vertexCount },
    }, i) => {

    const world = mat4.identity();
    mat4.translate(world, [0, 0, Math.sin(i * 3.721 + time * 0.1) * 200], world);
    mat4.rotateX(world, i * 4.567, world);
    mat4.rotateY(world, i * 2.967, world);
    mat4.translate(world, [0, 0, Math.sin(i * 9.721 + time * 0.1) * 200], world);
    mat4.rotateX(world, time * 0.53 + i, world);

    mat4.multiply(viewProjection, world, worldViewProjectionMatrixValue);
    mat3.fromMat4(world, worldMatrixValue);

    // Upload our uniform values.
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, indexFormat);
    pass.setBindGroup(0, litBindGroup);
    pass.drawIndexed(vertexCount);
  });

  objectInfos.forEach(({
      wireframeBindGroup,
      model: { vertexCount },
    }) => {
    pass.setPipeline(wireframePipeline);
    pass.setBindGroup(0, wireframeBindGroup)
    pass.draw(vertexCount * 2);
  });

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
