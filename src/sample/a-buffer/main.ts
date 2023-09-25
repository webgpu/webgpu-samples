import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import { mesh } from '../../meshes/teapot';

import opaqueWGSL from './opaque.wgsl';
import translucentWGSL from './translucent.wgsl';
import compositeWGSL from './composite.wgsl';

function roundUp(n: number, k: number): number {
  return Math.ceil(n / k) * k;
}

const init: SampleInit = async ({ canvas, pageState }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  // The devicePixelRatio is clamped here because the linkedListBuffer size will
  // be computed based on the canvas size, but if the devicePixelRatio is too
  // high then it will cause that buffer to exceed the default
  // maxStorageBufferBindingSize (128Mib).
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    label: 'depthTexture',
  });

  const depthTextureView = depthTexture.createView({
    label: 'depthTextureView',
  });

  // Create the model vertex buffer
  const vertexBuffer = device.createBuffer({
    size: 3 * mesh.positions.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
    label: 'vertexBuffer',
  });
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], 3 * i);
    }
    vertexBuffer.unmap();
  }

  // Create the model index buffer
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer = device.createBuffer({
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
    label: 'indexBuffer',
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
      mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }

  // `Heads` struct contains the start index of the linked-list of translucent fragments
  // for a given pixel.
  // * numFragments : u32
  // * data : array<u32>
  const headsBuffer = device.createBuffer({
    size: (1 + canvas.width * canvas.height) * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'headsBuffer',
  });

  const headsInitBuffer = device.createBuffer({
    size: (1 + canvas.width * canvas.height) * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
    label: 'headsInitBuffer',
  });
  {
    const buffer = new Uint32Array(headsInitBuffer.getMappedRange());

    for (let i = 0; i < buffer.length; ++i) {
      buffer[i] = 0xffffffff;
    }

    headsInitBuffer.unmap();
  }

  // Determines how much memory is allocated to store linked-list elements
  const averageLayersPerFragment = 4;

  // Each element stores
  // * color : vec4<f32>
  // * depth : f32
  // * index of next element in the list : u32
  const linkedListElementSize =
    5 * Float32Array.BYTES_PER_ELEMENT + 1 * Uint32Array.BYTES_PER_ELEMENT;

  const linkedListBuffer = device.createBuffer({
    size:
      averageLayersPerFragment *
      linkedListElementSize *
      canvas.width *
      canvas.height,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: 'linkedListBuffer',
  });

  // Uniforms contains:
  // * modelViewProjectionMatrix: mat4x4<f32>
  // * maxStorableFragments: u32
  // * targetWidth: u32
  const uniformsSize = roundUp(
    16 * Float32Array.BYTES_PER_ELEMENT + 2 * Uint32Array.BYTES_PER_ELEMENT,
    16
  );

  const uniformBuffer = device.createBuffer({
    size: uniformsSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'uniformBuffer',
  });

  const opaqueModule = device.createShaderModule({
    code: opaqueWGSL,
    label: 'opaqueModule',
  });

  const opaquePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: opaqueModule,
      entryPoint: 'main_vs',
      buffers: [
        {
          arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            {
              // position
              format: 'float32x3',
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: opaqueModule,
      entryPoint: 'main_fs',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: depthTexture.format,
    },
    label: 'opaquePipeline',
  });

  const opaquePassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTextureView,
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
    label: 'opaquePassDescriptor',
  };

  const opaqueBindGroup = device.createBindGroup({
    layout: opaquePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          size: 16 * Float32Array.BYTES_PER_ELEMENT,
          label: 'modelViewProjection',
        },
      },
    ],
    label: 'opaquePipeline',
  });

  const translucentModule = device.createShaderModule({
    code: translucentWGSL,
    label: 'translucentModule',
  });

  const translucentPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: translucentModule,
      entryPoint: 'main_vs',
      buffers: [
        {
          arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            {
              format: 'float32x3',
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
      ],
    },
    fragment: {
      module: translucentModule,
      entryPoint: 'main_fs',
      targets: [
        {
          format: presentationFormat,
          writeMask: 0x0,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
    label: 'translucentPipeline',
  });

  const translucentPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        loadOp: 'load',
        storeOp: 'store',
        view: undefined,
      },
    ],
    label: 'translucentPassDescriptor',
  };

  const translucentBindGroup = device.createBindGroup({
    layout: translucentPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          label: 'uniforms',
        },
      },
      {
        binding: 1,
        resource: {
          buffer: headsBuffer,
          label: 'headsBuffer',
        },
      },
      {
        binding: 2,
        resource: {
          buffer: linkedListBuffer,
          label: 'linkedListBuffer',
        },
      },
      {
        binding: 3,
        resource: depthTextureView,
      },
    ],
    label: 'translucentBindGroup',
  });

  const compositeModule = device.createShaderModule({
    code: compositeWGSL,
    label: 'compositeModule',
  });

  const compositePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: compositeModule,
      entryPoint: 'main_vs',
    },
    fragment: {
      module: compositeModule,
      entryPoint: 'main_fs',
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: 'one',
              operation: 'add',
              dstFactor: 'one-minus-src-alpha',
            },
            alpha: {},
          },
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
    label: 'compositePipeline',
  });

  const compositePassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        loadOp: 'load',
        storeOp: 'store',
      },
    ],
    label: 'compositePassDescriptor',
  };

  const compositeBindGroup = device.createBindGroup({
    layout: compositePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          label: 'uniforms',
        },
      },
      {
        binding: 1,
        resource: {
          buffer: headsBuffer,
          label: 'headsBuffer',
        },
      },
      {
        binding: 2,
        resource: {
          buffer: linkedListBuffer,
          label: 'linkedListBuffer',
        },
      },
    ],
  });

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix() {
    const aspect = canvas.width / canvas.height;

    const projectionMatrix = mat4.perspective(
      (2 * Math.PI) / 5,
      aspect,
      1,
      2000.0
    );

    const upVector = vec3.fromValues(0, 1, 0);
    const origin = vec3.fromValues(0, 0, 0);
    const eyePosition = vec3.fromValues(0, 5, -100);

    const rad = Math.PI * (Date.now() / 5000);
    const rotation = mat4.rotateY(mat4.translation(origin), rad);
    vec3.transformMat4(eyePosition, rotation, eyePosition);

    const viewMatrix = mat4.lookAt(eyePosition, origin, upVector);

    const viewProjMatrix = mat4.multiply(projectionMatrix, viewMatrix);
    return viewProjMatrix as Float32Array;
  }

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    // update the uniform buffer
    {
      const buffer = new ArrayBuffer(uniformBuffer.size);

      new Float32Array(buffer).set(getCameraViewProjMatrix());
      new Uint32Array(buffer, 16 * Float32Array.BYTES_PER_ELEMENT).set([
        averageLayersPerFragment * canvas.width * canvas.height,
        canvas.width,
      ]);

      device.queue.writeBuffer(uniformBuffer, 0, buffer);
    }

    const commandEncoder = device.createCommandEncoder();

    // initialize the heads buffer
    commandEncoder.copyBufferToBuffer(
      headsInitBuffer,
      0,
      headsBuffer,
      0,
      headsInitBuffer.size
    );

    const textureView = context.getCurrentTexture().createView();

    // Draw the opaque objects
    opaquePassDescriptor.colorAttachments[0].view = textureView;
    const opaquePassEncoder =
      commandEncoder.beginRenderPass(opaquePassDescriptor);
    opaquePassEncoder.setPipeline(opaquePipeline);
    opaquePassEncoder.setBindGroup(0, opaqueBindGroup);
    opaquePassEncoder.setVertexBuffer(0, vertexBuffer);
    opaquePassEncoder.setIndexBuffer(indexBuffer, 'uint16');
    opaquePassEncoder.drawIndexed(mesh.triangles.length * 3, 8);
    opaquePassEncoder.end();

    // Draw the translucent objects
    translucentPassDescriptor.colorAttachments[0].view = textureView;
    const translucentPassEncoder = commandEncoder.beginRenderPass(
      translucentPassDescriptor
    );
    translucentPassEncoder.setPipeline(translucentPipeline);
    translucentPassEncoder.setBindGroup(0, translucentBindGroup);
    translucentPassEncoder.setVertexBuffer(0, vertexBuffer);
    translucentPassEncoder.setIndexBuffer(indexBuffer, 'uint16');
    translucentPassEncoder.drawIndexed(mesh.triangles.length * 3, 8);
    translucentPassEncoder.end();

    // Composite the opaque and translucent objects
    compositePassDescriptor.colorAttachments[0].view = textureView;
    const compositePassEncoder = commandEncoder.beginRenderPass(
      compositePassDescriptor
    );
    compositePassEncoder.setPipeline(compositePipeline);
    compositePassEncoder.setBindGroup(0, compositeBindGroup);
    compositePassEncoder.draw(6);
    compositePassEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const ABuffer: () => JSX.Element = () =>
  makeSample({
    name: 'A-Buffer',
    description:
      'Demonstrates order independent transparency using a per-pixel linked-list of translucent fragments.',
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: 'opaque.wsgl',
        contents: opaqueWGSL,
      },
      {
        name: 'translucent.wsgl',
        contents: translucentWGSL,
      },
      {
        name: 'composite.wsgl',
        contents: compositeWGSL,
      },
    ],
    filename: __filename,
  });

export default ABuffer;
