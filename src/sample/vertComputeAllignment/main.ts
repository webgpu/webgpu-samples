import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubeVertexCount,
} from '../../meshes/cube';

// Render shaders
import basicModVertWGSL from './basicMod.vert.wgsl';
import vertexPositionColorWGSL from '../../shaders/vertexPositionColor.frag.wgsl';

// Compute shaders
import misallignedWGSL from './misalligned.wgsl';
import allignedWGSL from './alligned.wgsl';

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

  type ComputeShaderList = 'Misalligned' | 'Alligned';
  const settings = {
    'Compute Vertex Allignment': 'Alligned',
  };

  const numVertices = cubeVertexArray.length / 10;
  const cubeVertexPositions = new Float32Array(numVertices * 3);
  for (let i = 0, j = 0; i < cubeVertexArray.length; i += 10) {
    cubeVertexPositions[j++] = cubeVertexArray[i];
    cubeVertexPositions[j++] = cubeVertexArray[i + 1];
    cubeVertexPositions[j++] = cubeVertexArray[i + 2];
  }

  // Vertex positions that will be passed through our alligned and misalligned compute shaders
  const vertexPositionsBuffer = device.createBuffer({
    size: cubeVertexPositions.byteLength,
    // Applying storage attribute, making buffer accessible to compute shaders as a storage array
    usage:
      GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Create read-only buffer used to reset our vertex positions after they have been
  // incorrectly accessed in our misalligned compute shader
  const correctPositionsBuffer = device.createBuffer({
    size: cubeVertexPositions.byteLength,
    // Applying storage attribute, making buffer accessible to compute shaders as a storage array
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  new Float32Array(correctPositionsBuffer.getMappedRange()).set(
    cubeVertexPositions
  );
  correctPositionsBuffer.unmap();

  // Create a vertex buffer from the cubeVertexArray data
  // Note: only accessing uvs from this buffer and ignoring rest of the data
  const vertexUVBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexUVBuffer.getMappedRange()).set(cubeVertexArray);
  vertexUVBuffer.unmap();

  const renderPipeline = device.createRenderPipeline({
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

  // Num verts, stride, scale, padding
  const passThroughUniformsBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const fixPositionsUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const passThroughBGLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'uniform',
        },
        visibility: GPUShaderStage.COMPUTE,
      },
      {
        binding: 1,
        buffer: {
          type: 'storage',
        },
        visibility: GPUShaderStage.COMPUTE,
      },
    ],
  });

  const passThroughBindGroup = device.createBindGroup({
    layout: passThroughBGLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: passThroughUniformsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: vertexPositionsBuffer,
        },
      },
    ],
  });

  const fixPositionsBGLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'uniform',
        },
        visibility: GPUShaderStage.COMPUTE,
      },
      {
        binding: 1,
        buffer: {
          type: 'read-only-storage',
        },
        visibility: GPUShaderStage.COMPUTE,
      },
    ],
  });

  const fixPositionsBindGroup = device.createBindGroup({
    layout: fixPositionsBGLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: fixPositionsUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: correctPositionsBuffer,
        },
      },
    ],
  });

  const misallignedPassThroughPipeline = device.createComputePipeline({
    label: 'MisallignedPassThrough.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [passThroughBGLayout, fixPositionsBGLayout],
    }),
    compute: {
      entryPoint: 'passThrough',
      module: device.createShaderModule({
        label: 'MisallignedPassThrough.compute',
        code: misallignedWGSL,
      }),
    },
  });

  const allignedPassThroughPipeline = device.createComputePipeline({
    label: 'AllignedPassThrough.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [passThroughBGLayout, fixPositionsBGLayout],
    }),
    compute: {
      entryPoint: 'passThrough',
      module: device.createShaderModule({
        label: 'AllignedPassThrough.compute',
        code: allignedWGSL,
      }),
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
    layout: renderPipeline.getBindGroupLayout(0),
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

  const vertexAllignmentController = gui.add(
    settings,
    'Compute Vertex Allignment'
  );

  // Vertex Count (i.e number of vertices) and stride per Vertex in elements
  device.queue.writeBuffer(
    passThroughUniformsBuffer,
    0,
    new Uint32Array([numVertices, 3])
  );

  // Total f32s in positions buffer
  device.queue.writeBuffer(
    fixPositionsUniformBuffer,
    0,
    new Uint32Array([numVertices * 3])
  );

  const toggleVertexComputeAllignment = () => {
    vertexAllignmentController.setValue(
      settings['Compute Vertex Allignment'] === 'Alligned'
        ? 'Misalligned'
        : 'Alligned'
    );
  };

  setInterval(toggleVertexComputeAllignment, 5000);

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;
    const now = Date.now();
    device.queue.writeBuffer(
      passThroughUniformsBuffer,
      8,
      new Float32Array([Math.sin(now * 0.001), 0])
    );

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

    const computePassEncoder = commandEncoder.beginComputePass();
    computePassEncoder.setBindGroup(0, passThroughBindGroup);
    computePassEncoder.setBindGroup(1, fixPositionsBindGroup);
    if (
      (settings['Compute Vertex Allignment'] as ComputeShaderList) ===
      'Alligned'
    ) {
      computePassEncoder.setPipeline(allignedPassThroughPipeline);
    } else {
      computePassEncoder.setPipeline(misallignedPassThroughPipeline);
    }
    computePassEncoder.dispatchWorkgroups(1);
    computePassEncoder.end();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
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
    name: 'Compute Shader Vertex Data Allignment',
    description:
      'This example demonstrates how a compute shader can fail to properly write to a tightly packed vertex buffers due to improper data allignment. Although render shaders will accurately parse tightly packed 12 byte vec3<f32>, compute accessible storage buffers containing 32 bit vec3s must be alligned to 16 byte offsets.',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './basicMod.vert.wgsl',
        contents: basicModVertWGSL,
        editable: true,
      },
      {
        name: '../../shaders/vertexPositionColor.frag.wgsl',
        contents: vertexPositionColorWGSL,
        editable: true,
      },
      {
        name: './alligned.wgsl',
        contents: allignedWGSL,
      },
      {
        name: './misalligned.wgsl',
        contents: misallignedWGSL,
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
