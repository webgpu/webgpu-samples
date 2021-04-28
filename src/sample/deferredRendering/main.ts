import { makeSample, SampleInit } from '../../components/SampleLayout';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { mesh } from '../../meshes/stanfordDragon';

import lightUpdate from './lightUpdate.wgsl';
import vertexWriteGBuffers from './vertexWriteGBuffers.wgsl';
import fragmentWriteGBuffers from './fragmentWriteGBuffers.wgsl';
import vertexTextureQuad from './vertexTextureQuad.wgsl';
import fragmentGBuffersDebugView from './fragmentGBuffersDebugView.wgsl';
import fragmentDeferredRendering from './fragmentDeferredRendering.wgsl';

const kMaxNumLights = 1024;
const lightExtentMin = vec3.fromValues(-50, -30, -50);
const lightExtentMax = vec3.fromValues(50, 50, 50);

const init: SampleInit = async ({ canvasRef, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;
  const context = canvasRef.current.getContext('gpupresent');

  const aspect = Math.abs(canvasRef.current.width / canvasRef.current.height);

  const swapChainFormat = 'bgra8unorm';
  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
  });

  // Create the model vertex buffer.
  const kVertexStride = 8;
  const vertexBuffer = device.createBuffer({
    // position: vec3, normal: vec3, uv: vec2
    size:
      mesh.positions.length * kVertexStride * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], kVertexStride * i);
      mapping.set(mesh.normals[i], kVertexStride * i + 3);
      mapping.set(mesh.uvs[i], kVertexStride * i + 6);
    }
    vertexBuffer.unmap();
  }

  // Create the model index buffer.
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer = device.createBuffer({
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
      mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }

  // GBuffer texture render targets
  const gBufferTexture2DFloat = device.createTexture({
    size: [canvasRef.current.width, canvasRef.current.height, 3],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
    format: 'rgba32float',
  });
  const gBufferTextureAlbedo = device.createTexture({
    size: [canvasRef.current.width, canvasRef.current.height, 1],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
    format: 'bgra8unorm',
  });
  const gBufferTextureViews = [
    gBufferTexture2DFloat.createView({ baseArrayLayer: 0, arrayLayerCount: 1 }),
    gBufferTexture2DFloat.createView({ baseArrayLayer: 1, arrayLayerCount: 1 }),
    gBufferTextureAlbedo.createView(),
  ];

  const vertexBuffers: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 8,
      attributes: [
        {
          // position
          shaderLocation: 0,
          offset: 0,
          format: 'float32x3',
        },
        {
          // normal
          shaderLocation: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 3,
          format: 'float32x3',
        },
        {
          // uv
          shaderLocation: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 6,
          format: 'float32x2',
        },
      ],
    },
  ];

  const primitive: GPUPrimitiveState = {
    topology: 'triangle-list',
    cullMode: 'back',
  };

  const writeGBuffersPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: vertexWriteGBuffers,
      }),
      entryPoint: 'main',
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentWriteGBuffers,
      }),
      entryPoint: 'main',
      targets: [
        // position
        { format: 'rgba32float' },
        // normal
        { format: 'rgba32float' },
        // albedo
        { format: 'bgra8unorm' },
      ],
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
    primitive,
  });

  const gBuffersDebugViewPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: vertexTextureQuad,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentGBuffersDebugView,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: swapChainFormat,
        },
      ],
    },
    primitive,
  });

  const deferredRenderPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: vertexTextureQuad,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentDeferredRendering,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
        },
      ],
    },
    primitive,
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvasRef.current.width,
      height: canvasRef.current.height,
    },
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const writeGBufferPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: gBufferTextureViews[0],

        loadValue: {
          r: Number.MAX_VALUE,
          g: Number.MAX_VALUE,
          b: Number.MAX_VALUE,
          a: 1.0,
        },
        storeOp: 'store',
      },
      {
        view: gBufferTextureViews[1],

        loadValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
        storeOp: 'store',
      },
      {
        view: gBufferTextureViews[2],

        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
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

  const textureQuadPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        storeOp: 'store',
      },
    ],
  };

  const settings = {
    mode: 'rendering',
    numLights: 128,
  };
  const configUniformBuffer = (() => {
    const buffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    new Uint32Array(buffer.getMappedRange())[0] = settings.numLights;
    buffer.unmap();
    return buffer;
  })();

  gui.add(settings, 'mode', ['rendering', 'gBuffers view']);
  gui
    .add(settings, 'numLights', 1, kMaxNumLights)
    .step(1)
    .onChange(() => {
      device.queue.writeBuffer(
        configUniformBuffer,
        0,
        new Uint32Array([settings.numLights])
      );
    });

  const modelUniformBuffer = device.createBuffer({
    size: 4 * 16 * 2, // two 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraUniformBuffer = device.createBuffer({
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sceneUniformBindGroup = device.createBindGroup({
    layout: writeGBuffersPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: modelUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: cameraUniformBuffer,
        },
      },
    ],
  });

  const canvasSizeUniformBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const canvasSizeUniformBindGroup = device.createBindGroup({
    layout: gBuffersDebugViewPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: canvasSizeUniformBuffer,
        },
      },
    ],
  });

  const gBufferTexturesBindGroup = device.createBindGroup({
    layout: gBuffersDebugViewPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: device.createSampler(),
      },
      {
        binding: 1,
        resource: gBufferTextureViews[0],
      },
      {
        binding: 2,
        resource: gBufferTextureViews[1],
      },
      {
        binding: 3,
        resource: gBufferTextureViews[2],
      },
    ],
  });

  // Lights data are uploaded in a storage buffer
  // which could be updated/culled/etc. with a compute shader
  const extent = vec3.create();
  vec3.sub(extent, lightExtentMax, lightExtentMin);
  const lightDataStride = 8;
  const bufferSizeInByte =
    Float32Array.BYTES_PER_ELEMENT * lightDataStride * kMaxNumLights;
  const lightsBuffer = device.createBuffer({
    size: bufferSizeInByte,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });

  // We randomaly populate lights randomly in a box range
  // And simply move them along y-axis per frame to show they are
  // dynamic lightings
  const lightData = new Float32Array(lightsBuffer.getMappedRange());
  const tmpVec4 = vec4.create();
  let offset = 0;
  for (let i = 0; i < kMaxNumLights; i++) {
    offset = lightDataStride * i;
    // position
    for (let i = 0; i < 3; i++) {
      tmpVec4[i] = Math.random() * extent[i] + lightExtentMin[i];
    }
    tmpVec4[3] = 1;
    lightData.set(tmpVec4, offset);
    // color
    tmpVec4[0] = Math.random() * 2;
    tmpVec4[1] = Math.random() * 2;
    tmpVec4[2] = Math.random() * 2;
    // radius
    tmpVec4[3] = 20.0;
    lightData.set(tmpVec4, offset + 4);
  }
  lightsBuffer.unmap();

  const lightExtentBuffer = device.createBuffer({
    size: 4 * 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const lightExtentData = new Float32Array(8);
  lightExtentData.set(lightExtentMin, 0);
  lightExtentData.set(lightExtentMax, 4);
  device.queue.writeBuffer(
    lightExtentBuffer,
    0,
    lightExtentData.buffer,
    lightExtentData.byteOffset,
    lightExtentData.byteLength
  );

  const lightUpdateComputePipeline = device.createComputePipeline({
    compute: {
      module: device.createShaderModule({
        code: lightUpdate,
      }),
      entryPoint: 'main',
    },
  });
  const lightsBufferBindGroup = device.createBindGroup({
    layout: deferredRenderPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: lightsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: configUniformBuffer,
        },
      },
    ],
  });
  const lightsBufferComputeBindGroup = device.createBindGroup({
    layout: lightUpdateComputePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: lightsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: configUniformBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: lightExtentBuffer,
        },
      },
    ],
  });
  //--------------------

  // Scene matrices
  const eyePosition = vec3.fromValues(0, 50, -100);
  const upVector = vec3.fromValues(0, 1, 0);
  const origin = vec3.fromValues(0, 0, 0);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 2000.0);

  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

  const viewProjMatrix = mat4.create();
  mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);

  // Move the model so it's centered.
  const modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -5, 0));
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -40, 0));

  const cameraMatrixData = viewProjMatrix as Float32Array;
  device.queue.writeBuffer(
    cameraUniformBuffer,
    0,
    cameraMatrixData.buffer,
    cameraMatrixData.byteOffset,
    cameraMatrixData.byteLength
  );
  const modelData = modelMatrix as Float32Array;
  device.queue.writeBuffer(
    modelUniformBuffer,
    0,
    modelData.buffer,
    modelData.byteOffset,
    modelData.byteLength
  );
  const invertTransposeModelMatrix = mat4.create();
  mat4.invert(invertTransposeModelMatrix, modelMatrix);
  mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
  const normalModelData = invertTransposeModelMatrix as Float32Array;
  device.queue.writeBuffer(
    modelUniformBuffer,
    64,
    normalModelData.buffer,
    normalModelData.byteOffset,
    normalModelData.byteLength
  );
  // Pass the canvas size to shader to help sample from gBuffer textures using coord
  const canvasSizeData = new Float32Array([
    canvasRef.current.width,
    canvasRef.current.height,
  ]);
  device.queue.writeBuffer(
    canvasSizeUniformBuffer,
    0,
    canvasSizeData.buffer,
    canvasSizeData.byteOffset,
    canvasSizeData.byteLength
  );

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix() {
    const eyePosition = vec3.fromValues(0, 50, -100);

    const rad = Math.PI * (Date.now() / 5000);
    vec3.rotateY(eyePosition, eyePosition, origin, rad);

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);
    return viewProjMatrix as Float32Array;
  }

  function frame() {
    // Sample is no longer the active page.
    if (!canvasRef.current) return;

    const cameraViewProj = getCameraViewProjMatrix();
    device.queue.writeBuffer(
      cameraUniformBuffer,
      0,
      cameraViewProj.buffer,
      cameraViewProj.byteOffset,
      cameraViewProj.byteLength
    );

    const commandEncoder = device.createCommandEncoder();
    {
      // Write position, normal, albedo etc. data to gBuffers
      const gBufferPass = commandEncoder.beginRenderPass(
        writeGBufferPassDescriptor
      );
      gBufferPass.setPipeline(writeGBuffersPipeline);
      gBufferPass.setBindGroup(0, sceneUniformBindGroup);
      gBufferPass.setVertexBuffer(0, vertexBuffer);
      gBufferPass.setIndexBuffer(indexBuffer, 'uint16');
      gBufferPass.drawIndexed(indexCount);
      gBufferPass.endPass();
    }
    {
      // Update lights position
      const lightPass = commandEncoder.beginComputePass();
      lightPass.setPipeline(lightUpdateComputePipeline);
      lightPass.setBindGroup(0, lightsBufferComputeBindGroup);
      lightPass.dispatch(kMaxNumLights);
      lightPass.endPass();
    }
    {
      if (settings.mode === 'gBuffers view') {
        // GBuffers debug view
        // Left: position
        // Middle: normal
        // Right: albedo (use uv to mimic a checkerboard texture)
        textureQuadPassDescriptor.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();
        const debugViewPass = commandEncoder.beginRenderPass(
          textureQuadPassDescriptor
        );
        debugViewPass.setPipeline(gBuffersDebugViewPipeline);
        debugViewPass.setBindGroup(0, gBufferTexturesBindGroup);
        debugViewPass.setBindGroup(1, canvasSizeUniformBindGroup);
        debugViewPass.draw(6);
        debugViewPass.endPass();
      } else {
        // Deferred rendering
        textureQuadPassDescriptor.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();
        const deferredRenderingPass = commandEncoder.beginRenderPass(
          textureQuadPassDescriptor
        );
        deferredRenderingPass.setPipeline(deferredRenderPipeline);
        deferredRenderingPass.setBindGroup(0, gBufferTexturesBindGroup);
        deferredRenderingPass.setBindGroup(1, lightsBufferBindGroup);
        deferredRenderingPass.setBindGroup(2, canvasSizeUniformBindGroup);
        deferredRenderingPass.draw(6);
        deferredRenderingPass.endPass();
      }
    }
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const DeferredRendering: () => JSX.Element = () =>
  makeSample({
    name: 'Deferred Rendering',
    description: `This example shows how to do deferred rendering with webgpu.
      Render geometry info to multiple targets in the gBuffers in the first pass.
      In this sample we have 3 gBuffers for positions, normals, and albedo.
      And then do the lighting in a second pass with per fragment data read from gBuffers so it's independent of scene complexity.
      We also update light position in a compute shader, where further operations like tile/cluster culling could happen.`,
    gui: true,
    init,
    sources: [
      {
        name: __filename.substr(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: 'vertexWriteGBuffers.wgsl',
        contents: vertexWriteGBuffers,
        editable: true,
      },
      {
        name: 'fragmentWriteGBuffers.wgsl',
        contents: fragmentWriteGBuffers,
        editable: true,
      },
      {
        name: 'vertexTextureQuad.wgsl',
        contents: vertexTextureQuad,
        editable: true,
      },
      {
        name: 'fragmentGBuffersDebugView.wgsl',
        contents: fragmentGBuffersDebugView,
        editable: true,
      },
      {
        name: 'fragmentDeferredRendering.wgsl',
        contents: fragmentDeferredRendering,
        editable: true,
      },
      {
        name: 'lightUpdate.wgsl',
        contents: lightUpdate,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default DeferredRendering;
