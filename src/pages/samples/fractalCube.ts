import { mat4, vec3 } from 'gl-matrix';
import {
  cubeVertexArray,
  cubeVertexSize,
  cubeColorOffset,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';
import glslangModule from '../../glslang';
import { makeBasicExample } from '../../components/basicExample';

async function init(canvas: HTMLCanvasElement) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const aspect = Math.abs(canvas.width / canvas.height);
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });

  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: glslShaders.vertex,
        transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
      }),
      entryPoint: 'main',
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
              // color
              shaderLocation: 1,
              offset: cubeColorOffset,
              format: 'float32x4',
            },
            {
              // uv
              shaderLocation: 2,
              offset: cubeUVOffset,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
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
      format: 'depth24plus-stencil8',
    },
  });

  const depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        attachment: undefined, // Attachment is set later
        loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      },
    ],
    depthStencilAttachment: {
      attachment: depthTexture.createView(),

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  const uniformBufferSize = 4 * 16; // 4x4 matrix
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cubeTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: 'bgra8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED,
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: cubeTexture.createView(),
      },
    ],
  });

  function getTransformationMatrix() {
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -4));
    const now = Date.now() / 1000;
    mat4.rotate(
      viewMatrix,
      viewMatrix,
      1,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0)
    );

    const modelViewProjectionMatrix = mat4.create();
    mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

    return modelViewProjectionMatrix as Float32Array;
  }

  return function frame() {
    const transformationMatrix = getTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      transformationMatrix.buffer,
      transformationMatrix.byteOffset,
      transformationMatrix.byteLength
    );

    const swapChainTexture = swapChain.getCurrentTexture();
    renderPassDescriptor.colorAttachments[0].attachment = swapChainTexture.createView();

    const commandEncoder = device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);
    passEncoder.endPass();

    commandEncoder.copyTextureToTexture(
      {
        texture: swapChainTexture,
      },
      {
        texture: cubeTexture,
      },
      {
        width: canvas.width,
        height: canvas.height,
      }
    );

    device.queue.submit([commandEncoder.finish()]);
  };
}

const glslShaders = {
  vertex: `#version 450
layout(set = 0, binding = 0) uniform Uniforms {
  mat4 modelViewProjectionMatrix;
} uniforms;

layout(location = 0) in vec4 position;
layout(location = 1) in vec4 color;
layout(location = 2) in vec2 uv;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec2 fragUV;

void main() {
  gl_Position = uniforms.modelViewProjectionMatrix * position;
  fragColor = color;
  fragUV = uv;
}`,

  fragment: `#version 450
layout(set = 0, binding = 1) uniform sampler mySampler;
layout(set = 0, binding = 2) uniform texture2D myTexture;

layout(location = 0) in vec4 fragColor;
layout(location = 1) in vec2 fragUV;
layout(location = 0) out vec4 outColor;

void main() {
  vec4 texColor = texture(sampler2D(myTexture, mySampler), fragUV * 0.8 + 0.1);

  // 1.0 if we're sampling the background
  float f = float(length(texColor.rgb - vec3(0.5, 0.5, 0.5)) < 0.01);

  outColor = mix(texColor, fragColor, f);
}`,
};

const wgslShaders = {
  vertex: `
[[block]] struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

struct VertexInput {
  [[location(0)]] position : vec4<f32>;
  [[location(1)]] color : vec4<f32>;
  [[location(2)]] uv : vec2<f32>;
};

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragColor : vec4<f32>;
  [[location(1)]] fragUV: vec2<f32>;
};

[[stage(vertex)]]
fn main(input : VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * input.position;
  output.fragColor = input.color;
  output.fragUV = input.uv;
  return output;
}
`,

  fragment: `
[[binding(1), group(0)]] var mySampler: sampler;
[[binding(2), group(0)]] var myTexture: texture_2d<f32>;

struct FragmentInput {
  [[location(0)]] fragColor: vec4<f32>;
  [[location(1)]] fragUV: vec2<f32>;
};

[[stage(fragment)]]
fn main(input : FragmentInput) -> [[location(0)]] vec4<f32> {
  var texColor : vec4<f32> = textureSample(myTexture, mySampler, input.fragUV * 0.8 + 0.1) * fragPosition;
  var f : f32 = f32(length(texColor.rgb - vec3(0.5, 0.5, 0.5)) < 0.01);
  return mix(texColor, input.fragColor, f);
}
`,
};

export default makeBasicExample({
  name: 'Fractal Cube',
  description:
    "This example uses the previous frame's rendering result \
                as the source texture for the next frame.",
  slug: 'fractalCube',
  init,
  wgslShaders,
  glslShaders,
  source: __SOURCE__,
});
