import { mat4, vec3 } from 'gl-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';

const init: SampleInit = async ({ canvasRef }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;
  const context = canvasRef.current.getContext('gpupresent');

  const swapChainFormat = 'bgra8unorm';

  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
  });

  // Create a vertex buffer from the cube data.
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
        code: basicVertWGSL,
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
        code: vertexPositionColorWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: swapChainFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: 'back',
    },

    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  const depthTexture = device.createTexture({
    size: { width: canvasRef.current.width, height: canvasRef.current.width },
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

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

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  const aspect = Math.abs(canvasRef.current.width / canvasRef.current.height);
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

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

  function frame() {
    // Sample is no longer the active page.
    if (!canvasRef.current) return;

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

    renderPassDescriptor.colorAttachments[0].view = swapChain
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);

    // Bind the bind group (with the transformation matrix) for
    // each cube, and draw.
    passEncoder.setBindGroup(0, uniformBindGroup1);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);

    passEncoder.setBindGroup(0, uniformBindGroup2);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);

    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const TwoCubes: () => JSX.Element = () =>
  makeSample({
    name: 'Two Cubes',
    description:
      'This example shows some of the alignment requirements \
       involved when updating and binding multiple slices of a \
       uniform buffer. It renders two rotating cubes which have transform \
       matrices at different offsets in a uniform buffer.',
    init,
    sources: [
      {
        name: __filename.substr(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/basic.vert.wgsl',
        contents: basicVertWGSL,
        editable: true,
      },
      {
        name: '../../shaders/vertexPositionColor.frag.wgsl',
        contents: vertexPositionColorWGSL,
        editable: true,
      },
      {
        name: '../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default TwoCubes;
