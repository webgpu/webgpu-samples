import { mat4, vec3 } from 'gl-matrix';
import type { GUI } from 'dat.gui';
import {
  kDefaultCanvasWidth,
  kDefaultCanvasHeight,
  makeBasicExample,
} from '../../components/basicExample';

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
   1 - o, -1, d, 1,  1, 0, 0, 1,
  -1 - o, 1, d, 1,  1, 0, 0, 1,
   1 - o, -1,  d, 1, 1, 0, 0, 1,
   1 - o, 1,  d, 1,  1, 0, 0, 1,
  -1 - o, 1, d, 1,  1, 0, 0, 1,

  -1 + o, -1, -d, 1, 0, 1, 0, 1,
   1 + o, -1, -d, 1,  0, 1, 0, 1,
  -1 + o, 1, -d, 1,  0, 1, 0, 1,
   1 + o, -1,  -d, 1, 0, 1, 0, 1,
   1 + o, 1,  -d, 1,  0, 1, 0, 1,
  -1 + o, 1, -d, 1,  0, 1, 0, 1,
]);

const kViewportWidth = kDefaultCanvasWidth / 2;

const xCount = 1;
const yCount = 5;
const numInstances = xCount * yCount;
const matrixFloatCount = 16; // 4x4 matrix
const matrixStride = 4 * matrixFloatCount;

const depthRangeRemapMatrix = mat4.create();
depthRangeRemapMatrix[10] = -1;
depthRangeRemapMatrix[14] = 1;

// https://github.com/toji/gl-matrix/commit/e906eb7bb02822a81b1d197c6b5b33563c0403c0
function perspectiveZO(out, fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    const nf = 1 / (near - far);
    out[10] = far * nf;
    out[14] = far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -near;
  }
  return out;
}

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
const depthLoadValues = {
  [DepthBufferMode.Default]: 1.0,
  [DepthBufferMode.Reversed]: 0.0,
};

async function init(canvas: HTMLCanvasElement, gui?: GUI) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: 'bgra8unorm',
  });

  const verticesBuffer = device.createBuffer({
    size: geometryVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(geometryVertexArray);
  verticesBuffer.unmap();

  const depthBufferFormat = 'depth32float';

  // depthPrePass is used to render scene to the depth texture
  // this is not needed if you just want to use reversed z to render a scene
  const depthPrePassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexDepthPrePass,
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
        code: wgslShaders.fragmentDepthPrePass,
      }),
      entryPoint: 'main',
      targets: [],
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
  const precisionPassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexPrecisionErrorPass,
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
        code: wgslShaders.fragmentPrecisionErrorPass,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
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
  const precisionPassPipelines: GPURenderPipeline[] = [];
  precisionPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Default];
  precisionPassPipelines[DepthBufferMode.Default] = device.createRenderPipeline(
    precisionPassRenderPipelineDescriptorBase
  );
  precisionPassRenderPipelineDescriptorBase.depthStencil.depthCompare =
    depthCompareFuncs[DepthBufferMode.Reversed];
  precisionPassPipelines[
    DepthBufferMode.Reversed
  ] = device.createRenderPipeline(precisionPassRenderPipelineDescriptorBase);

  // colorPass is the regular render pass to render the scene
  const colorPassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertex,
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
        code: wgslShaders.fragment,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
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
  const textureQuadPassPipline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexTextureQuad,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: wgslShaders.fragmentTextureQuad,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    format: depthBufferFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
  });
  const depthTextureView = depthTexture.createView();

  const defaultDepthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    format: depthBufferFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const defaultDepthTextureView = defaultDepthTexture.createView();

  const depthPrePassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      view: depthTextureView,

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  // drawPassDescriptor and drawPassLoadDescriptor are used for drawing
  // the scene twice using different depth buffer mode on splitted viewport
  // of the same canvas
  // see the difference of the loadValue of the colorAttachments
  const drawPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: defaultDepthTextureView,

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0.0,
      stencilStoreOp: 'store',
    },
  };
  const drawPassLoadDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        view: undefined,

        loadValue: 'load',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: defaultDepthTextureView,

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0.0,
      stencilStoreOp: 'store',
    },
  };
  const drawPassDescriptors = [drawPassDescriptor, drawPassLoadDescriptor];

  const textureQuadPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
        storeOp: 'store',
      },
    ],
  };
  const textureQuadPassLoadDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadValue: 'load',
        storeOp: 'store',
      },
    ],
  };
  const textureQuadPassDescriptors = [
    textureQuadPassDescriptor,
    textureQuadPassLoadDescriptor,
  ];

  const depthTextureBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: 'filtering',
        },
      },
    ],
  });
  const depthTextureBindGroup = device.createBindGroup({
    layout: depthTextureBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: depthTextureView,
      },
      {
        binding: 1,
        resource: device.createSampler(),
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
      layout: depthPrePassPipelines[DepthBufferMode.Default].getBindGroupLayout(
        0
      ),
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
      layout: depthPrePassPipelines[
        DepthBufferMode.Reversed
      ].getBindGroupLayout(0),
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

  const modelMatrices = new Array(numInstances);
  const mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

  let m = 0;
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      const z = -800 * m;
      const s = 1 + 50 * m;

      modelMatrices[m] = mat4.create();

      mat4.translate(
        modelMatrices[m],
        modelMatrices[m],
        vec3.fromValues(
          x - xCount / 2 + 0.5,
          (4.0 - 0.2 * z) * (y - yCount / 2 + 1.0),
          z
        )
      );
      mat4.scale(modelMatrices[m], modelMatrices[m], vec3.fromValues(s, s, s));

      m++;
    }
  }

  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -12));

  const aspect = Math.abs(canvas.width / canvas.height) * 0.5;
  const projectionMatrix = mat4.create();
  perspectiveZO(projectionMatrix, (2 * Math.PI) / 5, aspect, 5, Infinity);

  const viewProjectionMatrix = mat4.create();
  mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
  const reversedRangeViewProjectionMatrix = mat4.create();
  // to use 1/z we just multiple depthRangeRemapMatrix to our default camera view projection matrix
  mat4.multiply(
    reversedRangeViewProjectionMatrix,
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
        tmpMat4,
        modelMatrices[i],
        (Math.PI / 180) * 30,
        vec3.fromValues(Math.sin(now), Math.cos(now), 0)
      );
      mvpMatricesData.set(tmpMat4, m);
    }
  }

  const settings = {
    mode: 'color',
  };
  gui.add(settings, 'mode', ['color', 'precision-error', 'depth-texture']);

  return function frame() {
    updateTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      mvpMatricesData.buffer,
      mvpMatricesData.byteOffset,
      mvpMatricesData.byteLength
    );

    const attachment = swapChain.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();
    if (settings.mode === 'color') {
      for (const m of depthBufferModes) {
        drawPassDescriptors[m].colorAttachments[0].view = attachment;
        drawPassDescriptors[m].depthStencilAttachment.depthLoadValue =
          depthLoadValues[m];
        const colorPass = commandEncoder.beginRenderPass(
          drawPassDescriptors[m]
        );
        colorPass.setPipeline(colorPassPipelines[m]);
        colorPass.setBindGroup(0, uniformBindGroups[m]);
        colorPass.setVertexBuffer(0, verticesBuffer);
        colorPass.setViewport(
          kViewportWidth * m,
          0,
          kViewportWidth,
          kDefaultCanvasHeight,
          0,
          1
        );
        colorPass.draw(geometryDrawCount, numInstances, 0, 0);
        colorPass.endPass();
      }
    } else if (settings.mode === 'precision-error') {
      for (const m of depthBufferModes) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthLoadValue =
            depthLoadValues[m];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[m]);
          depthPrePass.setBindGroup(0, uniformBindGroups[m]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            kViewportWidth * m,
            0,
            kViewportWidth,
            kDefaultCanvasHeight,
            0,
            1
          );
          depthPrePass.draw(geometryDrawCount, numInstances, 0, 0);
          depthPrePass.endPass();
        }
        {
          drawPassDescriptors[m].colorAttachments[0].view = attachment;
          drawPassDescriptors[m].depthStencilAttachment.depthLoadValue =
            depthLoadValues[m];
          const precisionErrorPass = commandEncoder.beginRenderPass(
            drawPassDescriptors[m]
          );
          precisionErrorPass.setPipeline(precisionPassPipelines[m]);
          precisionErrorPass.setBindGroup(0, uniformBindGroups[m]);
          precisionErrorPass.setBindGroup(1, depthTextureBindGroup);
          precisionErrorPass.setVertexBuffer(0, verticesBuffer);
          precisionErrorPass.setViewport(
            kViewportWidth * m,
            0,
            kViewportWidth,
            kDefaultCanvasHeight,
            0,
            1
          );
          precisionErrorPass.draw(geometryDrawCount, numInstances, 0, 0);
          precisionErrorPass.endPass();
        }
      }
    } else {
      // depth texture quad
      for (const m of depthBufferModes) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthLoadValue =
            depthLoadValues[m];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[m]);
          depthPrePass.setBindGroup(0, uniformBindGroups[m]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            kViewportWidth * m,
            0,
            kViewportWidth,
            kDefaultCanvasHeight,
            0,
            1
          );
          depthPrePass.draw(geometryDrawCount, numInstances, 0, 0);
          depthPrePass.endPass();
        }
        {
          textureQuadPassDescriptors[m].colorAttachments[0].view = attachment;
          const depthTextureQuadPass = commandEncoder.beginRenderPass(
            textureQuadPassDescriptors[m]
          );
          depthTextureQuadPass.setPipeline(textureQuadPassPipline);
          depthTextureQuadPass.setBindGroup(0, depthTextureBindGroup);
          depthTextureQuadPass.setViewport(
            kViewportWidth * m,
            0,
            kViewportWidth,
            kDefaultCanvasHeight,
            0,
            1
          );
          depthTextureQuadPass.draw(6, 1, 0, 0);
          depthTextureQuadPass.endPass();
        }
      }
    }
    device.queue.submit([commandEncoder.finish()]);
  };
}

const wgslShaders = {
  vertex: `
[[block]] struct Uniforms {
  modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  viewProjectionMatrix : mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragColor : vec4<f32>;
};

[[stage(vertex)]]
fn main([[builtin(instance_index)]] instanceIdx : u32,
        [[location(0)]] position : vec4<f32>,
        [[location(1)]] color : vec4<f32>) -> VertexOutput {
  var output : VertexOutput;
  output.Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  output.fragColor = color;
  return output;
}
`,
  fragment: `
[[stage(fragment)]]
fn main([[location(0)]] fragColor : vec4<f32>) -> [[location(0)]] vec4<f32> {
  return fragColor;
}
`,
  vertexDepthPrePass: `
[[block]] struct Uniforms {
  modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  viewProjectionMatrix : mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

[[stage(vertex)]]
fn main([[builtin(instance_index)]] instanceIdx : u32,
        [[location(0)]] position : vec4<f32>)
     -> [[builtin(position)]] vec4<f32> {
  return camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
}
`,
  fragmentDepthPrePass: `
[[stage(fragment)]]
fn main() {
}
`,
  vertexPrecisionErrorPass: `
[[block]] struct Uniforms {
  modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  viewProjectionMatrix : mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] clipPos : vec4<f32>;
};

[[stage(vertex)]]
fn main([[builtin(instance_index)]] instanceIdx : u32,
        [[location(0)]] position : vec4<f32>) -> VertexOutput {
  var output : VertexOutput;
  output.Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  output.clipPos = output.Position;
  return output;
}
`,
  fragmentPrecisionErrorPass: `
[[group(1), binding(0)]] var depthTexture: texture_2d<f32>;
[[group(1), binding(1)]] var depthSampler: sampler;

[[stage(fragment)]]
fn main([[builtin(position)]] coord : vec4<f32>,
        [[location(0)]] clipPos : vec4<f32>)
     -> [[location(0)]] vec4<f32> {
  let depthValue : f32 = textureSample(depthTexture, depthSampler, coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)})).r;
  let v : f32 = abs(clipPos.z / clipPos.w - depthValue) * 2000000.0;
  return vec4<f32>(v, v, v, 1.0) ;
}
`,
  vertexTextureQuad: `
let pos : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
  vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

[[stage(vertex)]]
fn main([[builtin(vertex_index)]] VertexIndex : u32)
     -> [[builtin(position)]] vec4<f32> {
  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`,
  fragmentTextureQuad: `
[[group(0), binding(0)]] var depthTexture: texture_2d<f32>;
[[group(0), binding(1)]] var depthSampler: sampler;

[[stage(fragment)]]
fn main([[builtin(position)]] coord : vec4<f32>)
     -> [[location(0)]] vec4<f32> {
  let depthValue : f32 = textureSample(depthTexture, depthSampler, coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)})).r;
  return vec4<f32>(depthValue, depthValue, depthValue, 1.0);
}
`,
};

export default makeBasicExample({
  name: 'Reversed Z',
  description: `This example shows the use of reversed z technique for better utilization of depth buffer precision.
    The left column uses regular method, while the right one uses reversed z technique.
    Both are using depth32float as their depth buffer format. A set of red and green planes are positioned very close to each other.
    Higher sets are placed further from camera (and are scaled for better visual purpose).
    To use reversed z to render your scene, you will need depth store value to be 0.0, depth compare function to be greater,
    and remap depth range by multiplying an additional matrix to your projection matrix.
    Related reading:
    https://developer.nvidia.com/content/depth-precision-visualized
    https://thxforthefish.com/posts/reverse_z/
    `,
  slug: 'reversedZ',
  init,
  source: __SOURCE__,
  gui: true,
});
