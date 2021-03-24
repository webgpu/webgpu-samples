import { mat4, vec3 } from 'gl-matrix';
import type { GUI } from 'dat.gui';
import {
  kDefaultCanvasWidth,
  kDefaultCanvasHeight,
  makeBasicExample,
} from '../../components/basicExample';
import {
  geometryVertexArray,
  geometryVertexSize,
  geometryColorOffset,
  geometryPositionOffset,
  geometryDrawCount,
} from '../../meshes/depthTestGeometry';
import glslangModule from '../../glslang';

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

  COUNT,
}

const depthCompareFuncs: GPUCompareFunction[] = ['less', 'greater'];
const depthLoadValues = [1.0, 0.0];

async function init(canvas: HTMLCanvasElement, useWGSL: boolean, gui?: GUI) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

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

  const depthBufferFormat = 'depth24plus';

  const depthPrePassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertexDepthPrePass,
          })
        : device.createShaderModule({
            code: glslShaders.vertexDepthPrePass,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
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
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragmentDepthPrePass,
          })
        : device.createShaderModule({
            code: glslShaders.fragmentDepthPrePass,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
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

  const precisionPassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertexPrecisionErrorPass,
          })
        : device.createShaderModule({
            code: glslShaders.vertexPrecisionErrorPass,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
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
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragmentPrecisionErrorPass,
          })
        : device.createShaderModule({
            code: glslShaders.fragmentPrecisionErrorPass,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
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

  const colorPassRenderPipelineDescriptorBase: GPURenderPipelineDescriptor = {
    vertex: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertex,
          })
        : device.createShaderModule({
            code: glslShaders.vertex,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
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
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragment,
          })
        : device.createShaderModule({
            code: glslShaders.fragment,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
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

  const textureQuadPassPipline = device.createRenderPipeline({
    vertex: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertexTextureQuad,
          })
        : device.createShaderModule({
            code: glslShaders.vertexTextureQuad,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
          }),
      entryPoint: 'main',
    },
    fragment: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragmentTextureQuad,
          })
        : device.createShaderModule({
            code: glslShaders.fragmentTextureQuad,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
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
      attachment: depthTextureView,

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  const drawPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        attachment: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
      },
    ],
    depthStencilAttachment: {
      attachment: defaultDepthTextureView,

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
        attachment: undefined,

        loadValue: 'load',
      },
    ],
    depthStencilAttachment: {
      attachment: defaultDepthTextureView,

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
        // attachment is acquired and set in render loop.
        attachment: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.5, a: 1.0 },
      },
    ],
  };
  const textureQuadPassLoadDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        attachment: undefined,

        loadValue: 'load',
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
      for (let i = 0; i < DepthBufferMode.COUNT; i++) {
        drawPassDescriptors[i].colorAttachments[0].attachment = attachment;
        drawPassDescriptors[i].depthStencilAttachment.depthLoadValue =
          depthLoadValues[i];
        const colorPass = commandEncoder.beginRenderPass(
          drawPassDescriptors[i]
        );
        colorPass.setPipeline(colorPassPipelines[i]);
        colorPass.setBindGroup(0, uniformBindGroups[i]);
        colorPass.setVertexBuffer(0, verticesBuffer);
        colorPass.setViewport(
          kViewportWidth * i,
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
      for (let i = 0; i < DepthBufferMode.COUNT; i++) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthLoadValue =
            depthLoadValues[i];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[i]);
          depthPrePass.setBindGroup(0, uniformBindGroups[i]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            kViewportWidth * i,
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
          drawPassDescriptors[i].colorAttachments[0].attachment = attachment;
          drawPassDescriptors[i].depthStencilAttachment.depthLoadValue =
            depthLoadValues[i];
          const precisionErrorPass = commandEncoder.beginRenderPass(
            drawPassDescriptors[i]
          );
          precisionErrorPass.setPipeline(precisionPassPipelines[i]);
          precisionErrorPass.setBindGroup(0, uniformBindGroups[i]);
          precisionErrorPass.setBindGroup(1, depthTextureBindGroup);
          precisionErrorPass.setVertexBuffer(0, verticesBuffer);
          precisionErrorPass.setViewport(
            kViewportWidth * i,
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
      for (let i = 0; i < DepthBufferMode.COUNT; i++) {
        {
          depthPrePassDescriptor.depthStencilAttachment.depthLoadValue =
            depthLoadValues[i];
          const depthPrePass = commandEncoder.beginRenderPass(
            depthPrePassDescriptor
          );
          depthPrePass.setPipeline(depthPrePassPipelines[i]);
          depthPrePass.setBindGroup(0, uniformBindGroups[i]);
          depthPrePass.setVertexBuffer(0, verticesBuffer);
          depthPrePass.setViewport(
            kViewportWidth * i,
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
          textureQuadPassDescriptors[
            i
          ].colorAttachments[0].attachment = attachment;
          const depthTextureQuadPass = commandEncoder.beginRenderPass(
            textureQuadPassDescriptors[i]
          );
          depthTextureQuadPass.setPipeline(textureQuadPassPipline);
          depthTextureQuadPass.setBindGroup(0, depthTextureBindGroup);
          depthTextureQuadPass.setViewport(
            kViewportWidth * i,
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

const glslShaders = {
  vertex: `#version 450
#define MAX_NUM_INSTANCES ${numInstances}
layout(set = 0, binding = 0) uniform Uniforms {
  mat4 modelMatrix[MAX_NUM_INSTANCES];
} uniforms;

layout(set = 0, binding = 1) uniform CameraMatrix {
  mat4 viewProjectionMatrix;
} camera;

layout(location = 0) in vec4 position;
layout(location = 1) in vec4 color;

layout(location = 0) out vec4 fragColor;

void main() {
  gl_Position = camera.viewProjectionMatrix * uniforms.modelMatrix[gl_InstanceIndex] * position;
  fragColor = color;
}
`,

  fragment: `#version 450
layout(location = 0) in vec4 fragColor;
layout(location = 0) out vec4 outColor;

void main() {
  outColor = fragColor;
}
  `,

  vertexDepthPrePass: `#version 450
#define MAX_NUM_INSTANCES ${numInstances}
layout(set = 0, binding = 0) uniform Uniforms {
  mat4 modelMatrix[MAX_NUM_INSTANCES];
} uniforms;

layout(set = 0, binding = 1) uniform CameraMatrix {
  mat4 viewProjectionMatrix;
} camera;

layout(location = 0) in vec4 position;

void main() {
  gl_Position = camera.viewProjectionMatrix * uniforms.modelMatrix[gl_InstanceIndex] * position;
}
`,

  fragmentDepthPrePass: `#version 450
void main() {
}
`,

  vertexPrecisionErrorPass: `#version 450
#define MAX_NUM_INSTANCES ${numInstances}
layout(set = 0, binding = 0) uniform Uniforms {
  mat4 modelMatrix[MAX_NUM_INSTANCES];
} uniforms;

layout(set = 0, binding = 1) uniform CameraMatrix {
  mat4 viewProjectionMatrix;
} camera;


layout(location = 0) in vec4 position;

layout(location = 0) out vec4 clipPos;

void main() {
  gl_Position = camera.viewProjectionMatrix * uniforms.modelMatrix[gl_InstanceIndex] * position;
  clipPos = gl_Position;
}
`,

  fragmentPrecisionErrorPass: `#version 450
layout(location = 0) in vec4 clipPos;
layout(location = 0) out vec4 outColor;

layout(set = 1, binding = 0) uniform texture2D depthMap;
layout(set = 1, binding = 1) uniform sampler depthSampler;

void main() {
  vec2 fragUV = gl_FragCoord.xy / vec2(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)});
  float depthValue = texture(sampler2D(depthMap, depthSampler), fragUV).r;
  float error = abs(clipPos.z / clipPos.w - depthValue);
  outColor = vec4(vec3(error * 2000000.0), 1.0);
}
`,

  vertexTextureQuad: `#version 450
const vec2 pos[6] = vec2[6](
  vec2(-1.0f, -1.0f), vec2(1.0f, -1.0f), vec2(-1.0f, 1.0f),
  vec2(-1.0f, 1.0f), vec2(1.0f, -1.0f), vec2(1.0f, 1.0f)
);
void main() {
  gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
}
  `,
  fragmentTextureQuad: `#version 450
layout(set = 0, binding = 0) uniform texture2D map;
layout(set = 0, binding = 1) uniform sampler mapSampler;

layout(location = 0) out vec4 outColor;

void main() {
  vec2 fragUV = gl_FragCoord.xy / vec2(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)});
  float value = texture(sampler2D(map, mapSampler), fragUV).r;
  outColor = vec4(vec3(value), 1.0);
}
  `,
};

const wgslShaders = {
  vertex: `
[[block]] struct Uniforms {
  [[offset(0)]] modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  [[offset(0)]] viewProjectionMatrix : mat4x4<f32>;
};

[[builtin(instance_index)]] var<in> instanceIdx : i32;
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

[[location(0)]] var<in> position : vec4<f32>;
[[location(1)]] var<in> color : vec4<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;
[[location(0)]] var<out> fragColor : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  fragColor = color;
  return;
}
`,
  fragment: `
[[location(0)]] var<in> fragColor : vec4<f32>;
[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  outColor = fragColor;
  return;
}
`,
  vertexDepthPrePass: `
[[block]] struct Uniforms {
  [[offset(0)]] modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  [[offset(0)]] viewProjectionMatrix : mat4x4<f32>;
};

[[builtin(instance_index)]] var<in> instanceIdx : i32;
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

[[location(0)]] var<in> position : vec4<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  return;
}
`,
  fragmentDepthPrePass: `
[[stage(fragment)]]
fn main() -> void {
  return;
}
`,
  vertexPrecisionErrorPass: `
[[block]] struct Uniforms {
  [[offset(0)]] modelMatrix : [[stride(${matrixStride})]] array<mat4x4<f32>, ${numInstances}>;
};
[[block]] struct Camera {
  [[offset(0)]] viewProjectionMatrix : mat4x4<f32>;
};

[[builtin(instance_index)]] var<in> instanceIdx : i32;
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;
[[binding(1), group(0)]] var<uniform> camera : Camera;

[[location(0)]] var<in> position : vec4<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;
[[location(0)]] var<out> clipPos : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  clipPos = Position;
  return;
}
`,
  fragmentPrecisionErrorPass: `
[[group(1), binding(0)]] var depthTexture: texture_2d<f32>;
[[group(1), binding(1)]] var depthSampler: sampler;

[[location(0)]] var<in> clipPos : vec4<f32>;
[[builtin(frag_coord)]] var<in> coord : vec4<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  const depthValue : f32 = textureSample(depthTexture, depthSampler, coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)})).r;
  const v : f32 = abs(clipPos.z / clipPos.w - depthValue) * 2000000.0;
  outColor = vec4<f32>(v, v, v, 1.0) ;
  return;
}
`,
  vertexTextureQuad: `
const pos : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
  vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

[[builtin(position)]] var<out> Position : vec4<f32>;
[[builtin(vertex_index)]] var<in> VertexIndex : i32;

[[stage(vertex)]]
fn main() -> void {
  Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  return;
}
`,
  fragmentTextureQuad: `
[[group(0), binding(0)]] var depthTexture: texture_2d<f32>;
[[group(0), binding(1)]] var depthSampler: sampler;

[[builtin(frag_coord)]] var<in> coord : vec4<f32>;
[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  const depthValue : f32 = textureSample(depthTexture, depthSampler, coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)})).r;
  outColor = vec4<f32>(depthValue, depthValue, depthValue, 1.0);
  return;
}
`,
};

export default makeBasicExample({
  name: 'Reversed Z',
  description: `This example shows the use of reversed z technique for better utilization of depth buffer precision. The left column uses regular method, while the right one uses reversed z technique.
    Both are using depth24plus as their depth buffer format. A set of red and green planes are positioned very close to each other.
    Higher sets are placed further from camera (and are scaled for better visual purpose).
    Related reading:
    https://developer.nvidia.com/content/depth-precision-visualized
    https://thxforthefish.com/posts/reverse_z/
    `,
  slug: 'reversedZ',
  init,
  wgslShaders,
  glslShaders,
  source: __SOURCE__,
  gui: true,
});
