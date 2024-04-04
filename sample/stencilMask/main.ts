import { mat4, vec3 } from 'wgpu-matrix';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

// Stencil Mask Shader
import fullscreenQuadWGSL from './fullscreenQuad.vert.wgsl';
import sdfWGSL from './sdf.frag.wgsl';

// Cube render shader
import instancedVertWGSL from '../instancedCube/instanced.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';
import { GUI } from 'dat.gui';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

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

enum SDFEnum {
  circle,
  triangle,
  coolS,
}

const settings = {
  sdf: 'circle',
  invertMask: false,
  // Offset mask in x direction
  offsetX: 0.0,
  // Offset mask in y direction
  offsetY: 0.0,
  scaleRadius: 200.0,
};

// Add wheel to change mask size
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const scaleFactor = 2.0;
  if (e.deltaY < 0) {
    settings.scaleRadius += scaleFactor;
  } else {
    settings.scaleRadius -= scaleFactor;
  }
  settings.scaleRadius = Math.max(50.0, Math.min(400.0, settings.scaleRadius));
});

canvas.addEventListener('mousemove', (e) => {
  const halfCanvasWidth = canvas.width / 2;
  const halfCanvasHeight = canvas.height / 2;

  settings.offsetX = e.offsetX - halfCanvasWidth; //-width / 2, width / 2
  settings.offsetY = e.offsetY - halfCanvasHeight; //-height / 2, height / 2
});

const gui = new GUI();
gui.add(settings, 'sdf', ['circle', 'triangle', 'coolS']);
gui.add(settings, 'invertMask');

// A good portion of this code is shared with the 'Instanced Cube' sample, but
// pay attention to the different ways in which pipelines and renderDescriptors
// are set up to account for the stencil component of our depth texture.
const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: 'depth24plus-stencil8',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

// Uniforms passed to stencilMask pass, which writes the mask to the depth texture's stencil buffer.
const maskUniformBuffer = device.createBuffer({
  label: 'StencilMask.uniformBuffer',
  // offsetX, offsetY, radius, SDF Enum, scaleToCanvasX, scaleToCanvasY
  size: Float32Array.BYTES_PER_ELEMENT * 6,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
});

const maskUniformBGLayout = device.createBindGroupLayout({
  label: 'StencilMask.bindGroupLayout',
  entries: [
    {
      binding: 0,
      buffer: {
        type: 'uniform',
      },
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    },
  ],
});

const maskUniformBindGroup = device.createBindGroup({
  label: 'StencilMask.bindGroup',
  layout: maskUniformBGLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: maskUniformBuffer,
      },
    },
  ],
});

// Create our mask shader, which will only write to the stencil buffer.
const stencilMaskPipeline = device.createRenderPipeline({
  layout: device.createPipelineLayout({
    label: 'StencilMask.pipelineLayout',
    bindGroupLayouts: [maskUniformBGLayout],
  }),
  label: 'StencilMask.renderPipeline',
  vertex: {
    module: device.createShaderModule({
      label: 'StencilMask.vertexShader',
      // Not the same as fullscreenTexturedQuad. Rather than rendering a texture to a quad that covers the whole screen
      // This shader takes a quad, then positions it within 2D space.
      code: fullscreenQuadWGSL,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      label: 'StencilMask.fragmentShader',
      code: sdfWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
        // Write mask specifices which color channel our shader will write to.
        // Since we only want to write to the stencil buffer, we set this value to 0,
        // indicating that we would not like to write to the color channel.
        writeMask: 0,
      },
    ],
  },
  // We will write to our depth-stencil texture, but only modify the stencil component.
  depthStencil: {
    format: 'depth24plus-stencil8',
    depthWriteEnabled: false,
    // Stencil front and stencil back define the state of stencil comparisons for
    // front-facing and back-facing primitives respectively. For this 2D mask,
    // both kinds of primitives can basically be treated the same way.
    stencilFront: {
      // 'Always': If we write to this pixel in our shader, the stencil test will always succeed
      // And the corresponding pixel will be written to in the stencil buffer.
      compare: 'always',
      // The value at this pixel in the stencil buffer will be replaced by a reference value
      // This value is set per frame via the a GPURenderPassEncoders setStencilReference() function
      passOp: 'replace',
    },
    stencilBack: {
      compare: 'always',
      passOp: 'replace',
    },
    stencilWriteMask: 0xff,
  },
});

const stencilMaskPassDescriptor: GPURenderPassDescriptor = {
  // Although we are not writing to color in the stencil mask pass, it's still necessary
  // to pass our stencil mask pipeline's renderDescriptor a color attachment.
  colorAttachments: [
    {
      view: undefined,
      clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    // Depth load and store ops still need to be defined with a 'depth24plus-stencil8' texture
    // With just 'stencil8', only the stencil ops are necessary
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    // Clear any extant stencil values within the depth-stencil texture.
    // When stencilLoadOp is set to clear, the values in the stencil buffer are cleared to stencilClearValue.
    stencilLoadOp: 'clear',
    stencilClearValue: 0,
    // Store the stencil values for the next pass
    stencilStoreOp: 'store',
  },
};

// Create a vertex buffer from the cube data.
const verticesBuffer = device.createBuffer({
  size: cubeVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
verticesBuffer.unmap();

// Create instanced cube uniforms
const xCount = 4;
const yCount = 4;
const numInstances = xCount * yCount;
const matrixFloatCount = 16; // 4x4 matrix
const matrixSize = 4 * matrixFloatCount;
const instancedCubeUniformBufferSize = numInstances * matrixSize;

const instancedCubeBGLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: {
        type: 'uniform',
      },
    },
  ],
});

const uniformBufferInfo: GPUBufferDescriptor = {
  size: instancedCubeUniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
};

const scene0UniformBuffer = device.createBuffer(uniformBufferInfo);
const scene1UniformBuffer = device.createBuffer(uniformBufferInfo);

const scene0BindGroup = device.createBindGroup({
  layout: instancedCubeBGLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: scene0UniformBuffer,
      },
    },
  ],
});

const scene1BindGroup = device.createBindGroup({
  layout: instancedCubeBGLayout,
  entries: [
    {
      binding: 0,
      resource: {
        buffer: scene1UniformBuffer,
      },
    },
  ],
});

const createRenderPipeline = (
  label: string,
  colorWrite: number,
  invertMask: boolean
) => {
  return device.createRenderPipeline({
    label: `${label}.renderPipeline`,
    layout: device.createPipelineLayout({
      label: `${label}.pipelineLayout`,
      bindGroupLayouts: [instancedCubeBGLayout],
    }),
    vertex: {
      module: device.createShaderModule({
        label: `${label}.vertexShader`,
        code: instancedVertWGSL,
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
        label: `${label}.fragmentShader`,
        code: vertexPositionColorWGSL,
      }),
      targets: [
        {
          format: presentationFormat,
          // Scene0 identified by full color, Scene1 by only blue color
          writeMask: colorWrite,
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
      format: 'depth24plus-stencil8',
      stencilFront: {
        // 'Equal': If the current value of the stencil is equal to the reference value set by setStencilReference(), keep the pixel.
        // 'not-equal': Opposite of equal.
        // If the comparison operation returns true, then the pixel will be written to the screen.
        compare: invertMask ? 'not-equal' : 'equal',
        // Pass and fail operation DO NOT determine whether a pixel is written to the color target.
        // Rather, it only specifies whether and how the stencil buffer should be modified, in the case that it either passes or fails.
        // Since we want our stencil mask to remain the same for both render passes, we maintain the values written to our stencil buffer in
        // the stencil mask pass, regardless of whether or not the stencil operation fails.
        passOp: 'keep',
        failOp: 'keep',
      },
      stencilBack: {
        compare: invertMask ? 'not-equal' : 'equal',
        passOp: 'keep',
        failOp: 'keep',
      },
      stencilReadMask: 0xff,
    },
  });
};

// Scene 0 and Scene 1 delineated by different cube transforms
// as well as different color outputs
const scene0MaskPipeline = createRenderPipeline(
  'Scene0Mask',
  GPUColorWrite.ALL,
  false
);
const scene0InverseMaskPipeline = createRenderPipeline(
  'Scene0InverseMask',
  GPUColorWrite.ALL,
  true
);
const scene1MaskPipeline = createRenderPipeline(
  'Scene0Mask',
  GPUColorWrite.BLUE,
  false
);
const scene1InverseMaskPipeline = createRenderPipeline(
  'Scene1InverseMask',
  GPUColorWrite.BLUE,
  true
);

const aspect = canvas.width / canvas.height;
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

type Mat4 = mat4.default;
const modelMatrices = new Array<Mat4>(numInstances);
const mvpMatricesDataScene0 = new Float32Array(matrixFloatCount * numInstances);
const mvpMatricesDataScene1 = new Float32Array(matrixFloatCount * numInstances);

const step = 4.0;

// Initialize the matrix data for every instance.
let m = 0;
for (let x = 0; x < xCount; x++) {
  for (let y = 0; y < yCount; y++) {
    modelMatrices[m] = mat4.translation(
      vec3.fromValues(
        step * (x - xCount / 2 + 0.5),
        step * (y - yCount / 2 + 0.5),
        0
      )
    );
    m++;
  }
}

const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -12));

const tmpMat4Scene0 = mat4.create();
const tmpMat4Scene1 = mat4.create();

// Update the transformation matrix data for each instance.
function updateTransformationMatrix() {
  const nowScene0 = Date.now() / 1000;
  const nowScene1 = nowScene0 * 2;

  let m = 0,
    i = 0;
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      // Update matrices for cubes in scene 0
      mat4.rotate(
        modelMatrices[i],
        vec3.fromValues(
          Math.sin((x + 0.5) * nowScene0),
          Math.cos((y + 0.5) * nowScene0),
          0
        ),
        1,
        tmpMat4Scene0
      );
      // Update matrices for cubes in scene 1
      mat4.rotate(
        modelMatrices[i],
        vec3.fromValues(
          Math.sin((x + 0.5) * nowScene1),
          Math.cos((y + 0.5) * nowScene1),
          0
        ),
        1,
        tmpMat4Scene1
      );

      mat4.scale(tmpMat4Scene1, vec3.create(1, 1, 1), tmpMat4Scene1);
      // Update with view and proj in both scenes
      // Scene 0
      mat4.multiply(viewMatrix, tmpMat4Scene0, tmpMat4Scene0);
      mat4.multiply(projectionMatrix, tmpMat4Scene0, tmpMat4Scene0);
      // Scene 1
      mat4.multiply(viewMatrix, tmpMat4Scene1, tmpMat4Scene1);
      mat4.multiply(projectionMatrix, tmpMat4Scene1, tmpMat4Scene1);

      mvpMatricesDataScene0.set(tmpMat4Scene0, m);
      mvpMatricesDataScene1.set(tmpMat4Scene1, m);

      i++;
      m += matrixFloatCount;
    }
  }
}

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later

      clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      loadOp: 'load',
      storeOp: 'store',
    },
  ],
  depthStencilAttachment: {
    view: depthTexture.createView(),

    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store',
    // Load the stencil values from the previous pass
    stencilLoadOp: 'load',
    stencilStoreOp: 'store',
  },
};

device.queue.writeBuffer(
  maskUniformBuffer,
  16,
  new Float32Array([1 / (canvas.width * 0.5), 1 / (canvas.height * 0.5)])
);

function frame() {
  // Update mask position and size
  device.queue.writeBuffer(
    maskUniformBuffer,
    0,
    new Float32Array([
      settings.offsetX,
      -settings.offsetY,
      settings.scaleRadius,
    ])
  );
  // Update mask shape
  device.queue.writeBuffer(
    maskUniformBuffer,
    12,
    new Uint32Array([SDFEnum[settings.sdf]])
  );
  // Update the cube matrix data in both scenes
  updateTransformationMatrix();
  device.queue.writeBuffer(
    scene0UniformBuffer,
    0,
    mvpMatricesDataScene0.buffer,
    mvpMatricesDataScene0.byteOffset,
    mvpMatricesDataScene0.byteLength
  );
  device.queue.writeBuffer(
    scene1UniformBuffer,
    0,
    mvpMatricesDataScene1.buffer,
    mvpMatricesDataScene1.byteOffset,
    mvpMatricesDataScene1.byteLength
  );

  // Does nothing but make the compiler happy
  stencilMaskPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();
  // Actually used as render target here
  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const stencilPassEncoder = commandEncoder.beginRenderPass(
    stencilMaskPassDescriptor
  );
  stencilPassEncoder.setPipeline(stencilMaskPipeline);
  stencilPassEncoder.setBindGroup(0, maskUniformBindGroup);
  // Value that will be placed at pixel in stencil buffer when comparison succeeds
  stencilPassEncoder.setStencilReference(1);
  stencilPassEncoder.draw(6, 1);
  stencilPassEncoder.end();

  // Render Scene 0
  const scene0PassEncoder =
    commandEncoder.beginRenderPass(renderPassDescriptor);
  if (settings.invertMask) {
    scene0PassEncoder.setPipeline(scene0InverseMaskPipeline);
  } else {
    scene0PassEncoder.setPipeline(scene0MaskPipeline);
  }
  scene0PassEncoder.setBindGroup(0, scene0BindGroup);
  scene0PassEncoder.setVertexBuffer(0, verticesBuffer);
  // Keep stencil buffer value if cube intersects with areas where stencil buffer equals 1.
  scene0PassEncoder.setStencilReference(1);
  scene0PassEncoder.draw(cubeVertexCount, numInstances, 0, 0);
  scene0PassEncoder.end();

  // Render Scene 1
  const scene1PassEncoder =
    commandEncoder.beginRenderPass(renderPassDescriptor);
  // Scene 1 will render inside the area opposite to what scene 0 is rendering
  if (settings.invertMask) {
    scene1PassEncoder.setPipeline(scene1MaskPipeline);
  } else {
    scene1PassEncoder.setPipeline(scene1InverseMaskPipeline);
  }
  scene1PassEncoder.setBindGroup(0, scene1BindGroup);
  scene1PassEncoder.setVertexBuffer(0, verticesBuffer);
  scene1PassEncoder.setStencilReference(1);
  scene1PassEncoder.draw(cubeVertexCount, numInstances, 0, 0);
  scene1PassEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
