import { mat4, vec2, vec3 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';
import { mesh } from '../../meshes/teapot';

import computePickPrimitive from './computePickPrimitive.wgsl';
import vertexForwardRendering from './vertexForwardRendering.wgsl';
import fragmentForwardRendering from './fragmentForwardRendering.wgsl';
import vertexTextureQuad from './vertexTextureQuad.wgsl';
import fragmentPrimitivesDebugView from './fragmentPrimitivesDebugView.wgsl';
import { quitIfWebGPUNotAvailable, quitIfFeaturesNotAvailable } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});

const requiredFeatures: GPUFeatureName[] = ['primitive-index'];
quitIfFeaturesNotAvailable(adapter, requiredFeatures);

const device = await adapter.requestDevice({
  requiredFeatures,
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
const kVertexStride = 6;
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

// The primitive index for each triangle will be written out to this texture.
// Using a r32uint texture ensures we can store the full range of primitive indices.
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
    arrayStride: Float32Array.BYTES_PER_ELEMENT * kVertexStride,
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
    ],
  },
];

const primitive: GPUPrimitiveState = {
  topology: 'triangle-list',
  // Using `none` because the teapot has gaps that you can see the backfaces through.
  cullMode: 'none',
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
    ],
  },
  primitive,
});

const pickBindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: 'storage' },
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
    bindGroupLayouts: [pickBindGroupLayout],
  }),
  compute: {
    module: device.createShaderModule({
      code: computePickPrimitive,
    }),
  },
});

const forwardRenderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      // view is acquired and set in render loop.
      view: undefined,

      clearValue: [0.0, 0.0, 1.0, 1.0],
      loadOp: 'clear',
      storeOp: 'store',
    },
    {
      view: primitiveIndexTexture.createView(),

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

const kMatrixSizeBytes = Float32Array.BYTES_PER_ELEMENT * 16;
const kPickUniformsSizeBytes = Float32Array.BYTES_PER_ELEMENT * 4;

const modelUniformBuffer = device.createBuffer({
  size: kMatrixSizeBytes * 2, // two 4x4 matrix
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const frameUniformBuffer = device.createBuffer({
  size: kMatrixSizeBytes * 2 + kPickUniformsSizeBytes, // two 4x4 matrix + a vec4's worth of picking uniforms
  usage:
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
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
        buffer: frameUniformBuffer,
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
    },
  ],
});

const pickBindGroup = device.createBindGroup({
  layout: pickBindGroupLayout,
  entries: [
    {
      binding: 0,
      resource: frameUniformBuffer,
    },
    {
      binding: 1,
      resource: primitiveIndexTexture.createView(),
    },
  ],
});

//--------------------

// Scene matrices
const eyePosition = vec3.fromValues(0, 12, -25);
const upVector = vec3.fromValues(0, 1, 0);
const origin = vec3.fromValues(0, 0, 0);

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

// Pointer tracking
const pickCoord = vec2.fromValues(0, 0);
function onPointerEvent(event: PointerEvent) {
  // Only track the primary pointer
  if (event.isPrimary) {
    const clientRect = (event.target as Element).getBoundingClientRect();
    // Get the pixel offset from the top-left of the canvas element.
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
    frameUniformBuffer,
    0,
    cameraViewProj.buffer,
    cameraViewProj.byteOffset,
    cameraViewProj.byteLength
  );
  const cameraInvViewProj = mat4.invert(cameraViewProj);
  device.queue.writeBuffer(
    frameUniformBuffer,
    64,
    cameraInvViewProj.buffer,
    cameraInvViewProj.byteOffset,
    cameraInvViewProj.byteLength
  );
  device.queue.writeBuffer(
    frameUniformBuffer,
    128,
    pickCoord.buffer,
    pickCoord.byteOffset,
    pickCoord.byteLength
  );

  const commandEncoder = device.createCommandEncoder();
  {
    // Forward rendering pass
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
    // Picking pass. Executes a single instance of a compute shader that loads
    // the primitive index at the pointer coordinates from the primitive index
    // texture written in the forward pass. The selected primitive index is
    // saved in the frameUniformBuffer and used for highlighting on the next
    // render. This means that the highlighted primitive is always a frame behind.
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
