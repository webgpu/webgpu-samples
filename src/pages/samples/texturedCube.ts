import { mat4, vec3 } from 'gl-matrix';
import { makeBasicExample } from '../../components/basicExample';
import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

async function init(canvas: HTMLCanvasElement) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const aspect = Math.abs(canvas.width / canvas.height);
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: 'bgra8unorm',
  });

  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        // Transform
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
      {
        // Sampler
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: 'filtering',
        },
      },
      {
        // Texture view
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: 'float',
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,

    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertex,
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
        attachment: undefined, // Assigned later

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

  let cubeTexture: GPUTexture;
  {
    const img = document.createElement('img');
    img.src = require('../../../assets/img/Di-3d.png');
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    cubeTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST,
    });
    device.queue.copyImageBitmapToTexture(
      { imageBitmap },
      { texture: cubeTexture },
      [imageBitmap.width, imageBitmap.height, 1]
    );
  }

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
    renderPassDescriptor.colorAttachments[0].attachment = swapChain
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);
    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);
  };
}

const wgslShaders = {
  vertex: `
[[block]] struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>;
};
[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragUV : vec2<f32>;
  [[location(1)]] fragPosition: vec4<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec4<f32>,
        [[location(1)]] uv : vec2<f32> ) -> VertexOutput {
  var output : VertexOutput;
  output.fragPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  return output;
}
`,
  fragment: `
[[binding(1), group(0)]] var mySampler: sampler;
[[binding(2), group(0)]] var myTexture: texture_2d<f32>;

[[stage(fragment)]]
fn main([[location(0)]] fragUV: vec2<f32>,
        [[location(1)]] fragPosition: vec4<f32>) -> [[location(0)]] vec4<f32> {
  return textureSample(myTexture, mySampler, fragUV) * fragPosition;
}
`,
};

export default makeBasicExample({
  name: 'Textured Cube',
  description: 'This example shows how to bind and sample textures.',
  slug: 'texturedCube',
  init,
  source: __SOURCE__,
});
