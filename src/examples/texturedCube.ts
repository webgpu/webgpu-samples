import { mat4, vec3 } from 'gl-matrix';
import { createTextureFromImage } from '../helpers';
import { cubeVertexArray, cubeVertexSize, cubeUVOffset, cubePositionOffset } from '../cube';
import glslangModule from '../glslang';

export const title = 'Textured Cube';
export const description = 'This example shows how to bind and sample textures.';

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
    format: "bgra8unorm",
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
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: "float2",
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
    size: { width: canvas.width, height: canvas.height, depth: 1 },
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.OUTPUT_ATTACHMENT
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      attachment: undefined, // Assigned later

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

  const cubeTexture = await createTextureFromImage(device, 'assets/img/Di-3d.png', GPUTextureUsage.SAMPLED);

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: uniformBuffer,
      },
    }, {
      binding: 1,
      resource: sampler,
    }, {
      binding: 2,
      resource: cubeTexture.createView(),
    }],
  });

  function getTransformationMatrix() {
    let viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -4));
    let now = Date.now() / 1000;
    mat4.rotate(viewMatrix, viewMatrix, 1, vec3.fromValues(Math.sin(now), Math.cos(now), 0));

    let modelViewProjectionMatrix = mat4.create();
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

    return modelViewProjectionMatrix as Float32Array;
  }

  return function frame() {
    const transformationMatrix = getTransformationMatrix();
    device.defaultQueue.writeBuffer(
      uniformBuffer,
      0,
      transformationMatrix.buffer,
      transformationMatrix.byteOffset,
      transformationMatrix.byteLength
    );
    renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
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
layout(location = 1) in vec2 uv;

layout(location = 0) out vec2 fragUV;
layout(location = 1) out vec4 fragPosition;

void main() {
  fragPosition = 0.5 * (position + vec4(1.0));
  gl_Position = uniforms.modelViewProjectionMatrix * position;
  fragUV = uv;
}
`,

  fragment: `#version 450
layout(set = 0, binding = 1) uniform sampler mySampler;
layout(set = 0, binding = 2) uniform texture2D myTexture;

layout(location = 0) in vec2 fragUV;
layout(location = 1) in vec4 fragPosition;
layout(location = 0) out vec4 outColor;

void main() {
  outColor =  texture(sampler2D(myTexture, mySampler), fragUV) * fragPosition;
}
`,
};

export const wgslShaders = {
  vertex: `
type Uniforms = [[block]] struct {
  [[offset 0]] modelViewProjectionMatrix : mat4x4<f32>;
};
[[binding 0, set 0]] var<uniform> uniforms : Uniforms;

[[location 0]] var<in> position : vec4<f32>;
[[location 1]] var<in> uv : vec2<f32>;

[[builtin position]] var<out> Position : vec4<f32>;
[[location 0]] var<out> fragUV : vec2<f32>;
[[location 1]] var<out> fragPosition: vec4<f32>;

fn vtx_main() -> void {
  fragPosition = 0.5 * (position + vec4<f32>(1.0));
  Position = uniforms.modelViewProjectionMatrix * position;
  fragUV = uv;
  return;
}
entry_point vertex as "main" = vtx_main;
`,
  fragment: `
[[binding 0, set 0]] var<uniform> mySampler: sampler;
[[binding 0, set 0]] var<uniform> myTexture: texture_sampled_2d<f32>;

[[location 0]] var<in> fragUV: vec2<f32>;
[[location 1]] var<in> fragPosition: vec4<f32>;
[[location 0]] var<out> outColor : vec4<f32>;

fn frag_main() -> void {
  outColor =  textureSample(myTexture, mySampler, fragUV) * fragPosition;
  return;
}
entry_point fragment as "main" = frag_main;
`,
};
