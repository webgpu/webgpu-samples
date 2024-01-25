import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import basicModVertWGSL from './basicMod.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const cubeVertexPositions = new Float32Array(
    (cubeVertexArray.length / 10) * 3
  );
  for (let i = 0, j = 0; i < cubeVertexArray.length; i += 10) {
    cubeVertexPositions[j++] = cubeVertexArray[i];
    cubeVertexPositions[j++] = cubeVertexArray[i + 1];
    cubeVertexPositions[j++] = cubeVertexArray[i + 2];
  }

  // Vertex positions that will be passed through our alligned and misalligned compute shaders
  const vertexPositionsBuffer = device.createBuffer({
    size: cubeVertexPositions.byteLength,
    // Applying storage attribute, making buffer accessible to compute shaders as a storage array
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  new Float32Array(vertexPositionsBuffer.getMappedRange()).set(
    cubeVertexPositions
  );
  vertexPositionsBuffer.unmap();

  // Create a vertex buffer from the cubeVertexArray data
  // Note: only accessing uvs from this buffer and ignoring rest of the data
  const vertexUVBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexUVBuffer.getMappedRange()).set(cubeVertexArray);
  vertexUVBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: basicModVertWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        // Separate vertex positions buffer
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x3',
            },
          ],
        },
        // Access only uvs from the usual cubeVertexArray data
        {
          arrayStride: cubeVertexSize,
          attributes: [
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
          format: presentationFormat,
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
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const uniformBufferSize = 4 * 16; // 4x4 matrix
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
    ],
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0
  );
  const modelViewProjectionMatrix = mat4.create();

  function getTransformationMatrix() {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -4), viewMatrix);
    const now = Date.now() / 1000;
    mat4.rotate(
      viewMatrix,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0),
      1,
      viewMatrix
    );

    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

    return modelViewProjectionMatrix as Float32Array;
  }

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const transformationMatrix = getTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      transformationMatrix.buffer,
      transformationMatrix.byteOffset,
      transformationMatrix.byteLength
    );
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, vertexPositionsBuffer);
    passEncoder.setVertexBuffer(1, vertexUVBuffer);
    passEncoder.draw(cubeVertexCount);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const VertComputeAllignment: () => JSX.Element = () =>
  makeSample({
    name: 'Compute Shader Vertex Attribute Allignment',
    description:
      'This example shows how to upload uniform data every frame to render a rotating object.',
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/basicMod.vert.wgsl',
        contents: basicModVertWGSL,
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

export default VertComputeAllignment;
