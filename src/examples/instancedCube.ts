import { mat4, vec3 } from 'gl-matrix';
import { cubeVertexArray, cubeVertexSize, cubeColorOffset, cubePositionOffset } from '../cube';
import glslangModule from '../glslang';

export const title = 'Instanced Cube';
export const description = 'This example shows the use of instancing.';

export async function init(canvas: HTMLCanvasElement) {
  const vertexShaderGLSL = `#version 450
  #define MAX_NUM_INSTANCES 16
  layout(set = 0, binding = 0) uniform Uniforms {
    mat4 modelViewProjectionMatrix[MAX_NUM_INSTANCES];
  } uniforms;

  layout(location = 0) in vec4 position;
  layout(location = 1) in vec4 color;

  layout(location = 0) out vec4 fragColor;

  void main() {
    gl_Position = uniforms.modelViewProjectionMatrix[gl_InstanceIndex] * position;
    fragColor = color;
  }`;

  const fragmentShaderGLSL = `#version 450
  layout(location = 0) in vec4 fragColor;
  layout(location = 0) out vec4 outColor;

  void main() {
    outColor = fragColor;
  }`;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice({});
  const glslang = await glslangModule();

  const aspect = Math.abs(canvas.width / canvas.height);
  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, -aspect, 1, 100.0);

  const context = canvas.getContext('gpupresent');

  // @ts-ignore:
  const swapChain = context.configureSwapChain({
    device,
    format: "bgra8unorm"
  });

  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  verticesBuffer.setSubData(0, cubeVertexArray);

  const uniformsBindGroupLayout = device.createBindGroupLayout({
    bindings: [{
      binding: 0,
      visibility: 1,
      type: "uniform-buffer"
    }]
  });

  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [uniformsBindGroupLayout] });
  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,

    vertexStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),
      }),
      entryPoint: "main"
    },
    fragmentStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),
      }),
      entryPoint: "main"
    },

    primitiveTopology: "triangle-list",
    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
    vertexInput: {
      vertexBuffers: [{
        stride: cubeVertexSize,
        stepMode: "vertex",
        attributeSet: [{
          // position
          shaderLocation: 0,
          offset: cubePositionOffset,
          format: "float4"
        }, {
          // color
          shaderLocation: 1,
          offset: cubeColorOffset,
          format: "float4"
        }]
      }],
    },

    rasterizationState: {
      cullMode: 'back',
    },

    colorStates: [{
      format: "bgra8unorm",
    }],
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
      depth: 1
    },
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.OUTPUT_ATTACHMENT
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      // attachment is acquired in render loop.
      attachment: undefined,

      loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
    }],
    depthStencilAttachment: {
      attachment: depthTexture.createView(),

      depthLoadValue: 1.0,
      depthStoreOp: "store",
      stencilLoadValue: 0,
      stencilStoreOp: "store",
    }
  };

  const xCount = 4;
  const yCount = 4;
  const numInstances = xCount * yCount;
  const matrixFloatCount = 16; // 4x4 matrix
  const matrixSize = 4 * matrixFloatCount;
  const uniformBufferSize = numInstances * matrixSize;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup = device.createBindGroup({
    layout: uniformsBindGroupLayout,
    bindings: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      }
    }],
  });

  let modelMatrices = new Array(numInstances);
  let mvpMatricesData = new Float32Array(matrixFloatCount * numInstances);

  let step = 4.0;

  let m = 0;
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      modelMatrices[m] = mat4.create();
      mat4.translate(modelMatrices[m], modelMatrices[m], vec3.fromValues(
        step * (x - xCount / 2 + 0.5),
        step * (y - yCount / 2 + 0.5),
        0
      ));
      m++;
    }
  }

  let viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -12));

  let tmpMat4 = mat4.create();

  function updateTransformationMatrix() {

    let now = Date.now() / 1000;

    let m = 0, i = 0;
    for (let x = 0; x < xCount; x++) {
      for (let y = 0; y < yCount; y++) {
        mat4.rotate(tmpMat4, modelMatrices[i], 1, vec3.fromValues(Math.sin((x + 0.5) * now), Math.cos((y + 0.5) * now), 0));

        mat4.multiply(tmpMat4, viewMatrix, tmpMat4);
        mat4.multiply(tmpMat4, projectionMatrix, tmpMat4);

        mvpMatricesData.set(tmpMat4, m);

        i++;
        m += matrixFloatCount;
      }
    }
  }

  return function frame() {
    updateTransformationMatrix();

    renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder({});

    uniformBuffer.setSubData(0, mvpMatricesData);
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffers(0, [verticesBuffer], [0]);

    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(36, numInstances, 0, 0);

    passEncoder.endPass();

    device.getQueue().submit([commandEncoder.finish()]);
  }
}
