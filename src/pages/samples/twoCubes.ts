import { mat4, vec3 } from 'gl-matrix';
import { makeBasicExample } from '../../components/basicExample';
import {
  cubeVertexArray,
  cubeVertexSize,
  cubeColorOffset,
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

  const pipeline = device.createRenderPipeline({
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
              // color
              shaderLocation: 1,
              offset: cubeColorOffset,
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
      format: 'depth24plus-stencil8',
    },
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired in render loop.
        attachment: undefined,

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

  const matrixSize = 4 * 16; // 4x4 matrix
  const offset = 256; // uniformBindGroup offset must be 256-byte aligned
  const uniformBufferSize = offset + matrixSize;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
    ],
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: offset,
          size: matrixSize,
        },
      },
    ],
  });

  const modelMatrix1 = mat4.create();
  mat4.translate(modelMatrix1, modelMatrix1, vec3.fromValues(-2, 0, 0));
  const modelMatrix2 = mat4.create();
  mat4.translate(modelMatrix2, modelMatrix2, vec3.fromValues(2, 0, 0));
  const modelViewProjectionMatrix1 = mat4.create() as Float32Array;
  const modelViewProjectionMatrix2 = mat4.create() as Float32Array;
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -7));

  const tmpMat41 = mat4.create();
  const tmpMat42 = mat4.create();

  function updateTransformationMatrix() {
    const now = Date.now() / 1000;

    mat4.rotate(
      tmpMat41,
      modelMatrix1,
      1,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0)
    );
    mat4.rotate(
      tmpMat42,
      modelMatrix2,
      1,
      vec3.fromValues(Math.cos(now), Math.sin(now), 0)
    );

    mat4.multiply(modelViewProjectionMatrix1, viewMatrix, tmpMat41);
    mat4.multiply(
      modelViewProjectionMatrix1,
      projectionMatrix,
      modelViewProjectionMatrix1
    );
    mat4.multiply(modelViewProjectionMatrix2, viewMatrix, tmpMat42);
    mat4.multiply(
      modelViewProjectionMatrix2,
      projectionMatrix,
      modelViewProjectionMatrix2
    );
  }

  return function frame() {
    updateTransformationMatrix();

    device.queue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjectionMatrix1.buffer,
      modelViewProjectionMatrix1.byteOffset,
      modelViewProjectionMatrix1.byteLength
    );
    device.queue.writeBuffer(
      uniformBuffer,
      offset,
      modelViewProjectionMatrix2.buffer,
      modelViewProjectionMatrix2.byteOffset,
      modelViewProjectionMatrix2.byteLength
    );

    renderPassDescriptor.colorAttachments[0].attachment = swapChain
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);

    passEncoder.setBindGroup(0, uniformBindGroup1);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);

    passEncoder.setBindGroup(0, uniformBindGroup2);
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
  [[location(0)]] fragColor : vec4<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec4<f32>,
        [[location(1)]] color : vec4<f32>) -> VertexOutput {
  return VertexOutput(uniforms.modelViewProjectionMatrix * position, color);
}
`,
  fragment: `
[[stage(fragment)]]
fn main([[location(0)]] fragColor : vec4<f32>) -> [[location(0)]] vec4<f32> {
  return fragColor;
}
`,
};

export default makeBasicExample({
  name: 'Two Cubes',
  description:
    'This example shows some of the alignment requirements \
                involved when updating and binding multiple slices of a \
                uniform buffer.',
  slug: 'twoCubes',
  init,
  source: __SOURCE__,
});
