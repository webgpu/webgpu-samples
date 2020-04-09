import { mat4, vec3 } from 'gl-matrix';
import { cubeVertexArray, cubeVertexSize, cubeColorOffset, cubePositionOffset } from '../cube';
import glslangModule from '../glslang';
import { updateBufferData } from '../helpers';

export const title = 'Rotating Cube';
export const description = 'The rotating cube demonstrates vertex input \
              and update of uniform data every frame.';

export async function init(canvas: HTMLCanvasElement) {
  const vertexShaderGLSL = `#version 450
  layout(set = 0, binding = 0) uniform Uniforms {
    mat4 modelViewProjectionMatrix;
  } uniforms;

  layout(location = 0) in vec4 position;
  layout(location = 1) in vec4 color;

  layout(location = 0) out vec4 fragColor;

  void main() {
    gl_Position = uniforms.modelViewProjectionMatrix * position;
    fragColor = color;
  }
  `;

  const fragmentShaderGLSL = `#version 450
  layout(location = 0) in vec4 fragColor;
  layout(location = 0) out vec4 outColor;

  void main() {
    outColor = fragColor;
  }
  `;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const aspect = Math.abs(canvas.width / canvas.height);
  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

  const context = canvas.getContext('gpupresent');

  // @ts-ignore:
  const swapChain = context.configureSwapChain({
    device,
    format: "bgra8unorm"
  });

  const [verticesBuffer, vertexMapping] = device.createBufferMapped({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX
  });
  new Float32Array(vertexMapping).set(cubeVertexArray);
  verticesBuffer.unmap();

  const uniformsBindGroupLayout = device.createBindGroupLayout({
    entries: [{
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

        // @ts-ignore
        source: vertexShaderGLSL,
        transform: source => glslang.compileGLSL(source, "vertex"),
      }),
      entryPoint: "main"
    },
    fragmentStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),

        // @ts-ignore
        source: fragmentShaderGLSL,
        transform: source => glslang.compileGLSL(source, "fragment"),
      }),
      entryPoint: "main"
    },

    primitiveTopology: "triangle-list",
    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
    vertexState: {
      vertexBuffers: [{
        arrayStride: cubeVertexSize,
        attributes: [{
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
      // attachment is acquired and set in render loop.
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

  const uniformBufferSize = 4 * 16; // 4x4 matrix

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup = device.createBindGroup({
    layout: uniformsBindGroupLayout,
    entries: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    }],
  });

  function getTransformationMatrix() {
    let viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -5));
    let now = Date.now() / 1000;
    mat4.rotate(viewMatrix, viewMatrix, 1, vec3.fromValues(Math.sin(now), Math.cos(now), 0));

    let modelViewProjectionMatrix = mat4.create();
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

    return modelViewProjectionMatrix as Float32Array;
  }

  return function frame() {
    renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder();
    const { uploadBuffer } = updateBufferData(device, uniformBuffer, 0, getTransformationMatrix(), commandEncoder);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.draw(36, 1, 0, 0);
    passEncoder.endPass();

    device.defaultQueue.submit([commandEncoder.finish()]);
    uploadBuffer.destroy();
  }
}
