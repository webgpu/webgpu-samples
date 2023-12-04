import { makeSample, SampleInit } from '../../components/SampleLayout';
import { mat4, vec3 } from 'wgpu-matrix';

import vertexWGSL from './vertex.wgsl';
import fragmentWGSL from './fragment.wgsl';
import vertexDepthPrePassWGSL from './vertexDepthPrePass.wgsl';
import vertexTextureQuadWGSL from './vertexTextureQuad.wgsl';
import fragmentTextureQuadWGSL from './fragmentTextureQuad.wgsl';
import vertexPrecisionErrorPassWGSL from './vertexPrecisionErrorPass.wgsl';
import fragmentPrecisionErrorPassWGSL from './fragmentPrecisionErrorPass.wgsl';

// Two planes close to each other for depth precision test
const geometryVertexSize = 4 * 8; // Byte size of one geometry vertex.
const geometryPositionOffset = 0;
const geometryColorOffset = 4 * 4; // Byte offset of geometry vertex color attribute.
const geometryDrawCount = 6 * 2;

const d = 0.0001; // half distance between two planes
const o = 0.5; // half x offset to shift planes so they are only partially overlaping

// prettier-ignore
export const geometryVertexArray = new Float32Array([
  // float4 position, float4 color
  -1 - o, -1, d, 1, 1, 0, 0, 1,
  1 - o, -1, d, 1, 1, 0, 0, 1,
  -1 - o, 1, d, 1, 1, 0, 0, 1,
  1 - o, -1, d, 1, 1, 0, 0, 1,
  1 - o, 1, d, 1, 1, 0, 0, 1,
  -1 - o, 1, d, 1, 1, 0, 0, 1,

  -1 + o, -1, -d, 1, 0, 1, 0, 1,
  1 + o, -1, -d, 1, 0, 1, 0, 1,
  -1 + o, 1, -d, 1, 0, 1, 0, 1,
  1 + o, -1, -d, 1, 0, 1, 0, 1,
  1 + o, 1, -d, 1, 0, 1, 0, 1,
  -1 + o, 1, -d, 1, 0, 1, 0, 1,
]);

const xCount = 1;
const yCount = 5;
const numInstances = xCount * yCount;
const matrixFloatCount = 16; // 4x4 matrix
const matrixStride = 4 * matrixFloatCount; // 64;

const depthRangeRemapMatrix = mat4.identity();
depthRangeRemapMatrix[10] = -1;
depthRangeRemapMatrix[14] = 1;

enum DepthBufferMode {
  Default = 0,
  Reversed,
}

const depthBufferModes: DepthBufferMode[] = [
  DepthBufferMode.Default,
  DepthBufferMode.Reversed,
];
const depthCompareFuncs = {
  [DepthBufferMode.Default]: 'less' as GPUCompareFunction,
  [DepthBufferMode.Reversed]: 'greater' as GPUCompareFunction,
};
const depthClearValues = {
  [DepthBufferMode.Default]: 1.0,
  [DepthBufferMode.Reversed]: 0.0,
};

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;

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

  const verticesBuffer = device.createBuffer({
    size: geometryVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(geometryVertexArray);
  verticesBuffer.unmap();

  const depthBufferFormat = 'depth32float';

  const depthTextureBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'depth',
        },
      },
    ],
  });

  // Model, view, projection matrices
  const uniformBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
    ],
  });

  const depthPrePassRenderPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout],
  });

  // depthPrePass is used to render scene to the depth texture
  // this is not needed if you just want to use reversed z to render a scene
  const depthPrePassRenderPipelineDescriptorBase = {
    layout: depthPrePassRenderPipelineLayout,
    vertex: {
      module: device.createShaderModule({
        code: vertexDepthPrePassWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: geometryVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: geometryPositionOffset,
              format: 'float32x4',
            },
          ],
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: depthBufferFormat,
    },
  } as GPURenderPipelineDescriptor;

  // we need the depthCompare to fit the depth buffer mode we are using.
  // this is the same for other passes
  const depthPrePassPipelines: GPURenderPipeline[] = [];
  depthPrePassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Default];
  depthPrePassPipelines[DepthBufferMode.Default] = device.createRenderPipeline(
    depthPrePassRenderPipelineDescriptorBase
  );
  depthPrePassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Reversed];
  depthPrePassPipelines[DepthBufferMode.Reversed] = device.createRenderPipeline(
    depthPrePassRenderPipelineDescriptorBase
  );

  // precisionPass is to draw precision error as color of depth value stored in depth buffer
  // compared to that directly calcualated in the shader
  const precisionPassRenderPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout, depthTextureBindGroupLayout],
  });
  const precisionPassRenderPipelineDescriptorBase = {
    layout: precisionPassRenderPipelineLayout,
    vertex: {
      module: device.createShaderModule({
        code: vertexPrecisionErrorPassWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: geometryVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: geometryPositionOffset,
              format: 'float32x4',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentPrecisionErrorPassWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: depthBufferFormat,
    },
  } as GPURenderPipelineDescriptor;
  const precisionPassPipelines: GPURenderPipeline[] = [];
  precisionPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Default];
  precisionPassPipelines[DepthBufferMode.Default] = device.createRenderPipeline(
    precisionPassRenderPipelineDescriptorBase
  );
  precisionPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Reversed];
  // prettier-ignore
  precisionPassPipelines[DepthBufferMode.Reversed] = device.createRenderPipeline(
    precisionPassRenderPipelineDescriptorBase
  );

  // colorPass is the regular render pass to render the scene
  const colorPassRenderPiplineLayout = device.createPipelineLayout({
    bindGroupLayouts: [uniformBindGroupLayout],
  });
  const colorPassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    layout: colorPassRenderPiplineLayout,
    vertex: {
      module: device.createShaderModule({
        code: vertexWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: geometryVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: geometryPositionOffset,
              format: 'float32x4',
            },
            {
              // color
              shaderLocation: 1,
              offset: geometryColorOffset,
              format: 'float32x4',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: depthBufferFormat,
    },
  };
  const colorPassPipelines: GPURenderPipeline[] = [];
  colorPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Default];
  colorPassPipelines[DepthBufferMode.Default] = device.createRenderPipeline(
    colorPassRenderPipelineDescriptorBase
  );
  colorPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Reversed];
  colorPassPipelines[DepthBufferMode.Reversed] = device.createRenderPipeline(
    colorPassRenderPipelineDescriptorBase
  );

  // textureQuadPass is draw a full screen quad of depth texture
  // to see the difference of depth value using reversed z compared to default depth buffer usage
  // 0.0 will be the furthest and 1.0 will be the closest
  const textureQuadPassPiplineLayout = device.createPipelineLayout({
    bindGroupLayouts: [depthTextureBindGroupLayout],
  });
  const textureQuadPassPipline = device.createRenderPipeline({
    layout: textureQuadPassPiplineLayout,
    vertex: {
      module: device.createShaderModule({
        code: vertexTextureQuadWGSL,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentTextureQuadWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: depthBufferFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
  });
  const depthTextureView = depthTexture.createView();

  const defaultDepthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: depthBufferFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const defaultDepthTextureView = defaultDepthTexture.createView();

  const depthPrePassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      view: depthTextureView,

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  // drawPassDescriptor and drawPassLoadDescriptor are used for drawing
  // the scene twice using different depth buffer mode on splitted viewport
  // of the same canvas
  // see the difference of the loadOp of the colorAttachments
  const drawPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: defaultDepthTextureView,

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
  const drawPassLoadDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        view: undefined,

        loadOp: 'load',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: defaultDepthTextureView,

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
  const drawPassDescriptors = [drawPassDescriptor, drawPassLoadDescriptor];

  const textureQuadPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        clearValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };
  const textureQuadPassLoadDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadOp: 'load',
        storeOp: 'store',
      },
    ],
  };
  const textureQuadPassDescriptors = [
    textureQuadPassDescriptor,
    textureQuadPassLoadDescriptor,
  ];

  const depthTextureBindGroup = device.createBindGroup({
    layout: depthTextureBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: depthTextureView,
      },
    ],
  });

  const uniformBufferSize = numInstances * matrixStride;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraMatrixBuffer = device.createBuffer({
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraMatrixReversedDepthBuffer = device.createBuffer({
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroups = [
    device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: cameraMatrixBuffer,
          },
        },
      ],
    }),
    device.createBindGroup({
      layout: uniformBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: cameraMatrixReversedDepthBuffer,
          },
        },
      ],
    }),
  ];

  type Mat4 = mat4.default;
  const modelMatrices = new Array<Mat4>(numInstances);
  const mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

  let m = 0;
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      const z = -800 * m;
      const s = 1 + 50 * m;

      modelMatrices[m] = mat4.translation(
        vec3.fromValues(
          x - xCount / 2 + 0.5,
          (4.0 - 0.2 * z) * (y - yCount / 2 + 1.0),
          z
        )
      );
      mat4.scale(modelMatrices[m], vec3.fromValues(s, s, s), modelMatrices[m]);

      m++;
    }
  }

  const viewMatrix = mat4.translation(vec3.fromValues(0, 0, -12));

  const aspect = (0.5 * canvas.width) / canvas.height;
  // wgpu-matrix perspective doesn't handle zFar === Infinity now.
  // https://github.com/greggman/wgpu-matrix/issues/9
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 5, 9999);

  const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);
  // to use 1/z we just multiple depthRangeRemapMatrix to our default camera view projection matrix
  const reversedRangeViewProjectionMatrix = mat4.multiply(
    depthRangeRemapMatrix,
    viewProjectionMatrix
  );

  let bufferData = viewProjectionMatrix as Float32Array;
  device.queue.writeBuffer(
    cameraMatrixBuffer,
    0,
    bufferData.buffer,
    bufferData.byteOffset,
    bufferData.byteLength
  );
  bufferData = reversedRangeViewProjectionMatrix as Float32Array;
  device.queue.writeBuffer(
    cameraMatrixReversedDepthBuffer,
    0,
    bufferData.buffer,
    bufferData.byteOffset,
    bufferData.byteLength
  );

  const tmpMat4 = mat4.create();
  function updateTransformationMatrix() {
    const now = Date.now() / 1000;

    for (let i = 0, m = 0; i < numInstances; i++, m += matrixFloatCount) {
      mat4.rotate(
        modelMatrices[i],
        vec3.fromValues(Math.sin(now), Math.cos(now), 0),
        (Math.PI / 180) * 30,
        tmpMat4
      );
      mvpMatricesData.set(tmpMat4, m);
    }
  }

  const settings = {
    mode: 'color',
  };
  gui.add(settings, 'mode', ['color', 'precision-error', 'depth-texture']);

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    updateTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      mvpMatricesData.buffer,
      mvpMatricesData.byteOffset,
      mvpMatricesData.byteLength
    );

    const attachment = context.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();
    if (settings.mode === 'color') {
      for (const m of depthBufferModes) {
        drawPassDescriptors[m].colorAttachments[0].view = attachment;
        drawPassDescriptors[m].depthStencilAttachment.depthClearValue =
          depthClearValues[m];
        const colorPass = commandEncoder.beginRenderPass(
          drawPassDescriptors[m]
        );
        colorPass.setPipeline(colorPassPipelines[m]);
        colorPass.setBindGroup(0, uniformBindGroups[m]);
        colorPass.setVertexBuffer(0, verticesBuffer);
        colorPass.setViewport(
          (canvas.width * m) / 2,
          0,
          canvas.width / 2,
          canvas.height,
          0,
          1
        );
        colorPass.draw(geometryDrawCount, numInstances, 0, 0);
        colorPass.end();
      }
    } else if (settings.mode === 'precision-error') {
      for (const m of depthBufferModes) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthClearValue =
            depthClearValues[m];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[m]);
          depthPrePass.setBindGroup(0, uniformBindGroups[m]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            (canvas.width * m) / 2,
            0,
            canvas.width / 2,
            canvas.height,
            0,
            1
          );
          depthPrePass.draw(geometryDrawCount, numInstances, 0, 0);
          depthPrePass.end();
        }
        {
          drawPassDescriptors[m].colorAttachments[0].view = attachment;
          drawPassDescriptors[m].depthStencilAttachment.depthClearValue =
            depthClearValues[m];
          const precisionErrorPass = commandEncoder.beginRenderPass(
            drawPassDescriptors[m]
          );
          precisionErrorPass.setPipeline(precisionPassPipelines[m]);
          precisionErrorPass.setBindGroup(0, uniformBindGroups[m]);
          precisionErrorPass.setBindGroup(1, depthTextureBindGroup);
          precisionErrorPass.setVertexBuffer(0, verticesBuffer);
          precisionErrorPass.setViewport(
            (canvas.width * m) / 2,
            0,
            canvas.width / 2,
            canvas.height,
            0,
            1
          );
          precisionErrorPass.draw(geometryDrawCount, numInstances, 0, 0);
          precisionErrorPass.end();
        }
      }
    } else {
      // depth texture quad
      for (const m of depthBufferModes) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthClearValue =
            depthClearValues[m];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[m]);
          depthPrePass.setBindGroup(0, uniformBindGroups[m]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            (canvas.width * m) / 2,
            0,
            canvas.width / 2,
            canvas.height,
            0,
            1
          );
          depthPrePass.draw(geometryDrawCount, numInstances, 0, 0);
          depthPrePass.end();
        }
        {
          textureQuadPassDescriptors[m].colorAttachments[0].view = attachment;
          const depthTextureQuadPass = commandEncoder.beginRenderPass(
            textureQuadPassDescriptors[m]
          );
          depthTextureQuadPass.setPipeline(textureQuadPassPipline);
          depthTextureQuadPass.setBindGroup(0, depthTextureBindGroup);
          depthTextureQuadPass.setViewport(
            (canvas.width * m) / 2,
            0,
            canvas.width / 2,
            canvas.height,
            0,
            1
          );
          depthTextureQuadPass.draw(6);
          depthTextureQuadPass.end();
        }
      }
    }
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const ReversedZ: () => JSX.Element = () =>
  makeSample({
    name: 'Reversed Z',
    description: `This example shows the use of reversed z technique for better utilization of depth buffer precision.
      The left column uses regular method, while the right one uses reversed z technique.
      Both are using depth32float as their depth buffer format. A set of red and green planes are positioned very close to each other.
      Higher sets are placed further from camera (and are scaled for better visual purpose).
      To use reversed z to render your scene, you will need depth store value to be 0.0, depth compare function to be greater,
      and remap depth range by multiplying an additional matrix to your projection matrix.
      Related reading:
      https://developer.nvidia.com/content/depth-precision-visualized
      https://web.archive.org/web/20220724174000/https://thxforthefish.com/posts/reverse_z/
      `,
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './vertex.wgsl',
        contents: vertexWGSL,
        editable: true,
      },
      {
        name: './fragment.wgsl',
        contents: fragmentWGSL,
        editable: true,
      },
      {
        name: './vertexDepthPrePass.wgsl',
        contents: vertexDepthPrePassWGSL,
        editable: true,
      },
      {
        name: './vertexTextureQuad.wgsl',
        contents: vertexTextureQuadWGSL,
        editable: true,
      },
      {
        name: './fragmentTextureQuad.wgsl',
        contents: fragmentTextureQuadWGSL,
        editable: true,
      },
      {
        name: './vertexPrecisionErrorPass.wgsl',
        contents: vertexPrecisionErrorPassWGSL,
        editable: true,
      },
      {
        name: './fragmentPrecisionErrorPass.wgsl',
        contents: fragmentPrecisionErrorPassWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default ReversedZ;
