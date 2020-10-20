import { mat4, vec3 } from 'gl-matrix';
import { cubeVertexArray, cubeVertexSize, cubeColorOffset, cubePositionOffset } from '../cube';
import glslangModule from '../glslang';

export const title = 'Two Cubes';
export const description = 'This example shows some of the alignment requirements \
                            involved when updating and binding multiple slices of a \
                            uniform buffer.';

export async function init(canvas: HTMLCanvasElement, useWGSL: boolean) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const aspect = Math.abs(canvas.width / canvas.height);
  let projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: "bgra8unorm"
  });

  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    vertexStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertex,
          })
        : device.createShaderModule({
            code: glslShaders.vertex,
            transform: (glsl) => glslang.compileGLSL(glsl, "vertex"),
          }),
      entryPoint: "main",
    },
    fragmentStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragment,
          })
        : device.createShaderModule({
            code: glslShaders.fragment,
            transform: (glsl) => glslang.compileGLSL(glsl, "fragment"),
          }),
      entryPoint: "main",
    },

    primitiveTopology: "triangle-list",
    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },
    vertexState: {
      vertexBuffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: "float4",
            },
            {
              // color
              shaderLocation: 1,
              offset: cubeColorOffset,
              format: "float4",
            },
          ],
        },
      ],
    },

    rasterizationState: {
      cullMode: "back",
    },

    colorStates: [
      {
        format: "bgra8unorm",
      },
    ],
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

  const matrixSize = 4 * 16;  // 4x4 matrix
  const offset = 256; // uniformBindGroup offset must be 256-byte aligned
  const uniformBufferSize = offset + matrixSize;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
        offset: 0,
        size: matrixSize
      }
    }],
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
        offset: offset,
        size: matrixSize
      }
    }]
  });

  let modelMatrix1 = mat4.create();
  mat4.translate(modelMatrix1, modelMatrix1, vec3.fromValues(-2, 0, 0));
  let modelMatrix2 = mat4.create();
  mat4.translate(modelMatrix2, modelMatrix2, vec3.fromValues(2, 0, 0));
  let modelViewProjectionMatrix1 = mat4.create() as Float32Array;
  let modelViewProjectionMatrix2 = mat4.create() as Float32Array;
  let viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -7));

  let tmpMat41 = mat4.create();
  let tmpMat42 = mat4.create();

  function updateTransformationMatrix() {

    let now = Date.now() / 1000;

    mat4.rotate(tmpMat41, modelMatrix1, 1, vec3.fromValues(Math.sin(now), Math.cos(now), 0));
    mat4.rotate(tmpMat42, modelMatrix2, 1, vec3.fromValues(Math.cos(now), Math.sin(now), 0));

    mat4.multiply(modelViewProjectionMatrix1, viewMatrix, tmpMat41);
    mat4.multiply(modelViewProjectionMatrix1, projectionMatrix, modelViewProjectionMatrix1);
    mat4.multiply(modelViewProjectionMatrix2, viewMatrix, tmpMat42);
    mat4.multiply(modelViewProjectionMatrix2, projectionMatrix, modelViewProjectionMatrix2);
  }

  return function frame() {
    updateTransformationMatrix();

    device.defaultQueue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjectionMatrix1.buffer,
      modelViewProjectionMatrix1.byteOffset,
      modelViewProjectionMatrix1.byteLength
    );
    device.defaultQueue.writeBuffer(
      uniformBuffer,
      offset,
      modelViewProjectionMatrix2.buffer,
      modelViewProjectionMatrix2.byteOffset,
      modelViewProjectionMatrix2.byteLength
    );

    renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);

    passEncoder.setBindGroup(0, uniformBindGroup1);
    passEncoder.draw(36, 1, 0, 0);

    passEncoder.setBindGroup(0, uniformBindGroup2);
    passEncoder.draw(36, 1, 0, 0);

    passEncoder.endPass();

    device.defaultQueue.submit([commandEncoder.finish()]);
  }
}

export const glslShaders = {
  vertex: `#version 450
layout(set = 0, binding = 0) uniform Uniforms {
  mat4 modelViewProjectionMatrix;
} uniforms;

layout(location = 0) in vec4 position;
layout(location = 1) in vec4 color;

layout(location = 0) out vec4 fragColor;

void main() {
  gl_Position = uniforms.modelViewProjectionMatrix * position;
  fragColor = color;
}`,

  fragment: `#version 450
layout(location = 0) in vec4 fragColor;
layout(location = 0) out vec4 outColor;

void main() {
  outColor = fragColor;
}`,
};

export const wgslShaders = {
  vertex: `
[[block]] struct Uniforms {
  [[offset(0)]] modelViewProjectionMatrix : mat4x4<f32>;
};

[[binding(0), set(0)]] var<uniform> uniforms : Uniforms;

[[location(0)]] var<in> position : vec4<f32>;
[[location(1)]] var<in> color : vec4<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;
[[location(0)]] var<out> fragColor : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = uniforms.modelViewProjectionMatrix * position;
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
};
