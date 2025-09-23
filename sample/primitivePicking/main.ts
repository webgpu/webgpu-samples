import { mat4, vec2, vec3, vec4 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';
import { mesh } from '../../meshes/teapot';

import computePickPrimitive from './computePickPrimitive.wgsl';
import vertexForwardRendering from './vertexForwardRendering.wgsl';
import fragmentForwardRendering from './fragmentForwardRendering.wgsl';
import vertexTextureQuad from './vertexTextureQuad.wgsl';
import fragmentPrimitivesDebugView from './fragmentPrimitivesDebugView.wgsl';
import { quitIfWebGPUNotAvailable, quitIfLimitLessThan } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const limits: Record<string, GPUSize32> = {};
//@ts-ignore This ignore is needed until primitive-index is added as a feature name to the WebGPU defines.
const features: Array<GPUFeatureName> = ['primitive-index'];
quitIfLimitLessThan(adapter, 'maxStorageBuffersInFragmentStage', 1, limits);
const device = await adapter?.requestDevice({
  requiredLimits: limits,
  requiredFeatures: features,
});
quitIfWebGPUNotAvailable(adapter, device);

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const aspect = canvas.width / canvas.height;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: presentationFormat,
});

// Create the model vertex buffer.
const kVertexStride = 8;
const vertexBuffer = device.createBuffer({
  // position: vec3, normal: vec3
  size: mesh.positions.length * kVertexStride * Float32Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
{
  const mapping = new Float32Array(vertexBuffer.getMappedRange());
  for (let i = 0; i < mesh.positions.length; ++i) {
    mapping.set(mesh.positions[i], kVertexStride * i);
    mapping.set(mesh.normals[i], kVertexStride * i + 3);
  }
  vertexBuffer.unmap();
}

// Create the model index buffer.
const indexCount = mesh.triangles.length * 3;
const indexBuffer = device.createBuffer({
  size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
  usage: GPUBufferUsage.INDEX,
  mappedAtCreation: true,
});
{
  const mapping = new Uint16Array(indexBuffer.getMappedRange());
  for (let i = 0; i < mesh.triangles.length; ++i) {
    mapping.set(mesh.triangles[i], 3 * i);
  }
  indexBuffer.unmap();
}

// Render targets
const primitiveIndexTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  format: 'r32uint',
});
const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
});

const vertexBuffers: Iterable<GPUVertexBufferLayout> = [
  {
    arrayStride: Float32Array.BYTES_PER_ELEMENT * 8,
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
        offset: Float32Array.BYTES_PER_ELEMENT * 3,
        format: 'float32x3',
      },
      {
        // uv
        shaderLocation: 2,
        offset: Float32Array.BYTES_PER_ELEMENT * 6,
        format: 'float32x2',
      },
    ],
  },
];

const primitive: GPUPrimitiveState = {
  topology: 'triangle-list',
  cullMode: 'back',
};

const forwardRenderingPipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: vertexForwardRendering,
    }),
    buffers: vertexBuffers,
  },
  fragment: {
    module: device.createShaderModule({
      code: fragmentForwardRendering,
    }),
    targets: [
      // color
      { format: presentationFormat },
      // primitive-id
      { format: 'r32uint' },
    ],
  },
  depthStencil: {
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus',
  },
  primitive,
});

const primitiveTextureBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      texture: {
        sampleType: 'uint',
      },
    },
  ],
});

const primitivesDebugViewPipeline = device.createRenderPipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [primitiveTextureBindGroupLayout],
  }),
  vertex: {
    module: device.createShaderModule({
      code: vertexTextureQuad,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      code: fragmentPrimitivesDebugView,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ]
  },
  primitive,
});

const pickBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'storage' }
    },
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      texture: {
        sampleType: 'uint',
      },
    },
  ],
});

const pickPipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [
      pickBindGroupLayout,
    ],
  }),
  compute: {
    module:  device.createShaderModule({
      code: computePickPrimitive,
    }),
  }
});

const forwardRenderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined,

      clearValue: [0.0, 0.0, 1.0, 1.0],
      loadOp: 'clear',
      storeOp: 'store',
    },
    {
      view: primitiveIndexTexture.createView(),

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

const textureQuadPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      // view is acquired and set in render loop.
      view: undefined,

      clearValue: [0, 0, 0, 1],
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
};

const settings = {
  mode: 'rendering',
  rotate: true,
};
const gui = new GUI();
gui.add(settings, 'mode', ['rendering', 'primitive indexes']);
gui.add(settings, 'rotate');

const modelUniformBuffer = device.createBuffer({
  size: 4 * 16 * 2, // two 4x4 matrix
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const cameraUniformBuffer = device.createBuffer({
  size: (4 * 16 * 2) + (4 * 4), // two 4x4 matrix + a u32
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
});

const sceneUniformBindGroup = device.createBindGroup({
  layout: forwardRenderingPipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: modelUniformBuffer,
      },
    },
    {
      binding: 1,
      resource: {
        buffer: cameraUniformBuffer,
      },
    },
  ],
});

const primitiveTextureBindGroup = device.createBindGroup({
  layout: primitiveTextureBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: primitiveIndexTexture.createView(),
    }
  ],
});

const pickBindGroup = device.createBindGroup({
  layout: pickBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: cameraUniformBuffer,
    },
    {
      binding: 1,
      resource: primitiveIndexTexture.createView(),
    }
  ],
});

//--------------------

// Scene matrices
const eyePosition = vec3.fromValues(0, 12, -25);
const upVector = vec3.fromValues(0, 1, 0);
const origin = vec3.fromValues(0, 0, 0);
const pickCoord = vec2.fromValues(0, 0);

const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 2000.0);

// Move the model so it's centered.
const modelMatrix = mat4.translation([0, 0, 0]);
device.queue.writeBuffer(modelUniformBuffer, 0, modelMatrix);
const invertTransposeModelMatrix = mat4.invert(modelMatrix);
mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
const normalModelData = invertTransposeModelMatrix;
device.queue.writeBuffer(
  modelUniformBuffer,
  64,
  normalModelData.buffer,
  normalModelData.byteOffset,
  normalModelData.byteLength
);
// TODO: Write mouse/touch coords

function onPointerEvent(event: PointerEvent) {
  // Only track the primary pointer
  if (event.isPrimary) {
    let clientRect = (event.target as Element).getBoundingClientRect();
    pickCoord[0] = (event.clientX - clientRect.x) * devicePixelRatio;
    pickCoord[1] = (event.clientY - clientRect.y) * devicePixelRatio;
  }
}
canvas.addEventListener('pointerenter', onPointerEvent);
canvas.addEventListener('pointermove', onPointerEvent);

// Rotates the camera around the origin based on time.
let rad = 0;
function getCameraViewProjMatrix() {
  if (settings.rotate) {
    rad = Math.PI * (Date.now() / 10000);
  }
  const rotation = mat4.rotateY(mat4.translation(origin), rad);
  const rotatedEyePosition = vec3.transformMat4(eyePosition, rotation);

  const viewMatrix = mat4.lookAt(rotatedEyePosition, origin, upVector);

  return mat4.multiply(projectionMatrix, viewMatrix);
}

function frame() {
  const cameraViewProj = getCameraViewProjMatrix();
  device.queue.writeBuffer(
    cameraUniformBuffer,
    0,
    cameraViewProj.buffer,
    cameraViewProj.byteOffset,
    cameraViewProj.byteLength
  );
  const cameraInvViewProj = mat4.invert(cameraViewProj);
  device.queue.writeBuffer(
    cameraUniformBuffer,
    64,
    cameraInvViewProj.buffer,
    cameraInvViewProj.byteOffset,
    cameraInvViewProj.byteLength
  );
  device.queue.writeBuffer(
    cameraUniformBuffer,
    128,
    pickCoord.buffer,
    pickCoord.byteOffset,
    pickCoord.byteLength
  );

  const commandEncoder = device.createCommandEncoder();
  {
    // Forward rendering
    forwardRenderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();
    const forwardPass = commandEncoder.beginRenderPass(
      forwardRenderPassDescriptor
    );
    forwardPass.setPipeline(forwardRenderingPipeline);
    forwardPass.setBindGroup(0, sceneUniformBindGroup);
    forwardPass.setVertexBuffer(0, vertexBuffer);
    forwardPass.setIndexBuffer(indexBuffer, 'uint16');
    forwardPass.drawIndexed(indexCount);
    forwardPass.end();
  }
  {
    if (settings.mode === 'primitive indexes') {
      // Primitive Index debug view
      // Overwrites the canvas texture with a visualization of the primitive
      // index for each primitive
      textureQuadPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();
      const debugViewPass = commandEncoder.beginRenderPass(
        textureQuadPassDescriptor
      );
      debugViewPass.setPipeline(primitivesDebugViewPipeline);
      debugViewPass.setBindGroup(0, primitiveTextureBindGroup);
      debugViewPass.draw(6);
      debugViewPass.end();
    }
  }
  {
    const pickPass = commandEncoder.beginComputePass();
    pickPass.setPipeline(pickPipeline);
    pickPass.setBindGroup(0, pickBindGroup);
    pickPass.dispatchWorkgroups(1);
    pickPass.end();
  }
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
