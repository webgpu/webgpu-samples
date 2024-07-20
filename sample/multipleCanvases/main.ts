import { mat4, mat3 } from 'wgpu-matrix';
import { modelData } from './models';
import { quitIfWebGPUNotAvailable } from '../util';

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
  { vertices, indices }: { vertices: Float32Array; indices: Uint32Array }
): Model {
  const vertexBuffer = createBufferWithData(
    device,
    vertices,
    GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  );
  const indexBuffer = createBufferWithData(
    device,
    indices,
    GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  );
  return {
    vertexBuffer,
    indexBuffer,
    indexFormat: 'uint32',
    vertexCount: indices.length,
  };
}

const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const models = Object.values(modelData).map((data) =>
  createVertexAndIndexBuffer(device, data)
);

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

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const depthFormat = 'depth24plus';

const module = device.createShaderModule({
  code: `
    struct Uniforms {
      worldViewProjectionMatrix: mat4x4f,
      worldMatrix: mat4x4f,
      color: vec4f,
    };

    struct Vertex {
      @location(0) position: vec4f,
      @location(1) normal: vec3f,
    };

    struct VSOut {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
    };

    @group(0) @binding(0) var<uniform> uni: Uniforms;

    @vertex fn vs(vin: Vertex) -> VSOut {
      var vOut: VSOut;
      vOut.position = uni.worldViewProjectionMatrix * vin.position;
      vOut.normal = (uni.worldMatrix * vec4f(vin.normal, 0)).xyz;
      return vOut;
    }

    @fragment fn fs(vin: VSOut) -> @location(0) vec4f {
      let lightDirection = normalize(vec3f(4, 10, 6));
      let light = dot(normalize(vin.normal), lightDirection) * 0.5 + 0.5;
      return vec4f(uni.color.rgb * light, uni.color.a);
    }
  `,
});

const pipeline = device.createRenderPipeline({
  label: 'our hardcoded red triangle pipeline',
  layout: 'auto',
  vertex: {
    module,
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
    module,
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

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const canvas = entry.target as HTMLCanvasElement;
    const width = entry.contentBoxSize[0].inlineSize;
    const height = entry.contentBoxSize[0].blockSize;
    canvas.width = Math.max(
      1,
      Math.min(width, device.limits.maxTextureDimension2D)
    );
    canvas.height = Math.max(
      1,
      Math.min(height, device.limits.maxTextureDimension2D)
    );
  }
});

const visibleCanvasSet = new Set<HTMLCanvasElement>();
const intersectionObserver = new IntersectionObserver((entries) => {
  for (const { target, isIntersecting } of entries) {
    const canvas = target as HTMLCanvasElement;
    if (isIntersecting) {
      visibleCanvasSet.add(canvas);
    } else {
      visibleCanvasSet.delete(canvas);
    }
  }
});

type CanvasInfo = {
  context: GPUCanvasContext;
  depthTexture?: GPUTexture;
  clearValue: number[];
  worldViewProjectionMatrixValue: Float32Array;
  worldMatrixValue: Float32Array;
  uniformValues: Float32Array;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  rotation: number;
  model: Model;
};

const outerElem = document.querySelector('#outer');
const canvasToInfoMap = new Map<HTMLCanvasElement, CanvasInfo>();
const numProducts = 200;
for (let i = 0; i < numProducts; ++i) {
  // making this
  // <div class="product size?">
  //   <canvas></canvas>
  //   <div>Product#: ?</div>
  // </div>
  const canvas = document.createElement('canvas');
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);

  const container = document.createElement('div');
  container.className = `product size${randInt(4)}`;

  const description = document.createElement('div');
  description.textContent = `product#: ${i + 1}`;

  container.appendChild(canvas);
  container.appendChild(description);
  outerElem.appendChild(container);

  // Get a WebGPU context and configure it.
  const context = canvas.getContext('webgpu');
  context.configure({
    device,
    format: presentationFormat,
  });

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
    kWorldViewProjectionMatrixOffset + 16
  );
  const worldMatrixValue = uniformValues.subarray(
    kWorldMatrixOffset,
    kWorldMatrixOffset + 15
  );
  const colorValue = uniformValues.subarray(kColorOffset, kColorOffset + 4);
  colorValue.set(randColor());

  // Make a bind group for this uniform
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  canvasToInfoMap.set(canvas, {
    context,
    clearValue: randColor(),
    worldViewProjectionMatrixValue,
    worldMatrixValue,
    uniformValues,
    uniformBuffer,
    bindGroup,
    rotation: rand(Math.PI * 2),
    model: models[randInt(models.length)],
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

function render(time: number) {
  time *= 0.001; // convert to seconds;

  // make a command encoder to start encoding commands
  const encoder = device.createCommandEncoder();

  visibleCanvasSet.forEach((canvas) => {
    const canvasInfo = canvasToInfoMap.get(canvas);
    const {
      context,
      uniformBuffer,
      uniformValues,
      worldViewProjectionMatrixValue,
      worldMatrixValue,
      bindGroup,
      clearValue,
      rotation,
      model: { vertexBuffer, indexBuffer, indexFormat, vertexCount },
    } = canvasInfo;
    let { depthTexture } = canvasInfo;

    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();
    renderPassDescriptor.colorAttachments[0].clearValue = clearValue;

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
      canvasInfo.depthTexture = depthTexture;
    }
    renderPassDescriptor.depthStencilAttachment.view =
      depthTexture.createView();

    const fov = (60 * Math.PI) / 180;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const projection = mat4.perspective(fov, aspect, 0.1, 100);

    const view = mat4.lookAt(
      [0, 30, 50], // eye
      [0, 0, 0], // target
      [0, 1, 0] // up
    );

    const viewProjection = mat4.multiply(projection, view);

    const world = mat4.rotationY(time * 0.1 + rotation);
    mat4.multiply(viewProjection, world, worldViewProjectionMatrixValue);
    mat3.fromMat4(world, worldMatrixValue);

    // Upload our uniform values.
    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    // make a render pass encoder to encode render specific commands
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, indexFormat);
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(vertexCount);
    pass.end();
  });

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
