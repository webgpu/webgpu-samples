import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import { mesh } from '../../meshes/teapot';

import opaqueWGSL from './opaque.wgsl';
import translucentWGSL from './translucent.wgsl';
import compositeWGSL from './composite.wgsl';

function roundUp(n: number, k: number): number {
  return Math.ceil(n / k) * k;
}

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;

  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const params = new URLSearchParams(window.location.search);

  const settings = {
    memoryStrategy: params.get('memoryStrategy') || 'multipass',
  };

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
      format: 'depth24plus',
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
      view: undefined,
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

  const translucentBindGroupLayout = device.createBindGroupLayout({
    label: 'translucentBindGroupLayout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'storage',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'storage',
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'depth' },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
          hasDynamicOffset: true,
        },
      },
    ],
  });

  const translucentPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [translucentBindGroupLayout],
      label: 'translucentPipelineLayout',
    }),
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

  const compositeModule = device.createShaderModule({
    code: compositeWGSL,
    label: 'compositeModule',
  });

  const compositeBindGroupLayout = device.createBindGroupLayout({
    label: 'compositeBindGroupLayout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'storage',
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'storage',
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: 'uniform',
          hasDynamicOffset: true,
        },
      },
    ],
  });

  const compositePipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [compositeBindGroupLayout],
      label: 'compositePipelineLayout',
    }),
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

  const configure = () => {
    let devicePixelRatio = window.devicePixelRatio;

    // The default maximum storage buffer binding size is 128Mib. The amount
    // of memory we need to store transparent fragments depends on the size
    // of the canvas and the average number of layers per fragment we want to
    // support. When the devicePixelRatio is 1, we know that 128Mib is enough
    // to store 4 layers per pixel at 600x600. However, when the device pixel
    // ratio is high enough we will exceed this limit.
    //
    // We provide 2 choices of mitigations to this issue:
    // 1) Clamp the device pixel ratio to a value which we know will not break
    //    the limit. The tradeoff here is that the canvas resolution will not
    //    match the native resolution and therefore may have a reduction in
    //    quality.
    // 2) Break the frame into a series of horizontal slices using the scissor
    //    functionality and process a single slice at a time. This limits memory
    //    usage because we only need enough memory to process the dimensions
    //    of the slice. The tradeoff is the performance reduction due to multiple
    //    passes.
    if (settings.memoryStrategy === 'clamp-pixel-ratio') {
      devicePixelRatio = Math.min(window.devicePixelRatio, 3);
    }

    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;

    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      label: 'depthTexture',
    });

    const depthTextureView = depthTexture.createView({
      label: 'depthTextureView',
    });

    // Determines how much memory is allocated to store linked-list elements
    const averageLayersPerFragment = 4;

    // Each element stores
    // * color : vec4<f32>
    // * depth : f32
    // * index of next element in the list : u32
    const linkedListElementSize =
      5 * Float32Array.BYTES_PER_ELEMENT + 1 * Uint32Array.BYTES_PER_ELEMENT;

    // We want to keep the linked-list buffer size under the maxStorageBufferBindingSize.
    // Split the frame into enough slices to meet that constraint.
    const bytesPerline =
      canvas.width * averageLayersPerFragment * linkedListElementSize;
    const maxLinesSupported = Math.floor(
      device.limits.maxStorageBufferBindingSize / bytesPerline
    );
    const numSlices = Math.ceil(canvas.height / maxLinesSupported);
    const sliceHeight = Math.ceil(canvas.height / numSlices);
    const linkedListBufferSize = sliceHeight * bytesPerline;

    const linkedListBuffer = device.createBuffer({
      size: linkedListBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'linkedListBuffer',
    });

    // To slice up the frame we need to pass the starting fragment y position of the slice.
    // We do this using a uniform buffer with a dynamic offset.
    const sliceInfoBuffer = device.createBuffer({
      size: numSlices * device.limits.minUniformBufferOffsetAlignment,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
      label: 'sliceInfoBuffer',
    });
    {
      const mapping = new Int32Array(sliceInfoBuffer.getMappedRange());

      // This assumes minUniformBufferOffsetAlignment is a multiple of 4
      const stride =
        device.limits.minUniformBufferOffsetAlignment /
        Int32Array.BYTES_PER_ELEMENT;
      for (let i = 0; i < numSlices; ++i) {
        mapping[i * stride] = i * sliceHeight;
      }
      sliceInfoBuffer.unmap();
    }

    // `Heads` struct contains the start index of the linked-list of translucent fragments
    // for a given pixel.
    // * numFragments : u32
    // * data : array<u32>
    const headsBuffer = device.createBuffer({
      size: (1 + canvas.width * sliceHeight) * Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'headsBuffer',
    });

    const headsInitBuffer = device.createBuffer({
      size: (1 + canvas.width * sliceHeight) * Uint32Array.BYTES_PER_ELEMENT,
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

    const translucentBindGroup = device.createBindGroup({
      layout: translucentBindGroupLayout,
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
        {
          binding: 4,
          resource: {
            buffer: sliceInfoBuffer,
            size: device.limits.minUniformBufferOffsetAlignment,
            label: 'sliceInfoBuffer',
          },
        },
      ],
      label: 'translucentBindGroup',
    });

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
        {
          binding: 3,
          resource: {
            buffer: sliceInfoBuffer,
            size: device.limits.minUniformBufferOffsetAlignment,
            label: 'sliceInfoBuffer',
          },
        },
      ],
    });

    opaquePassDescriptor.depthStencilAttachment.view = depthTextureView;

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

    return function doDraw() {
      // update the uniform buffer
      {
        const buffer = new ArrayBuffer(uniformBuffer.size);

        new Float32Array(buffer).set(getCameraViewProjMatrix());
        new Uint32Array(buffer, 16 * Float32Array.BYTES_PER_ELEMENT).set([
          averageLayersPerFragment * canvas.width * sliceHeight,
          canvas.width,
        ]);

        device.queue.writeBuffer(uniformBuffer, 0, buffer);
      }

      const commandEncoder = device.createCommandEncoder();
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

      for (let slice = 0; slice < numSlices; ++slice) {
        // initialize the heads buffer
        commandEncoder.copyBufferToBuffer(
          headsInitBuffer,
          0,
          headsBuffer,
          0,
          headsInitBuffer.size
        );

        const scissorX = 0;
        const scissorY = slice * sliceHeight;
        const scissorWidth = canvas.width;
        const scissorHeight =
          Math.min((slice + 1) * sliceHeight, canvas.height) -
          slice * sliceHeight;

        // Draw the translucent objects
        translucentPassDescriptor.colorAttachments[0].view = textureView;
        const translucentPassEncoder = commandEncoder.beginRenderPass(
          translucentPassDescriptor
        );

        // Set the scissor to only process a horizontal slice of the frame
        translucentPassEncoder.setScissorRect(
          scissorX,
          scissorY,
          scissorWidth,
          scissorHeight
        );

        translucentPassEncoder.setPipeline(translucentPipeline);
        translucentPassEncoder.setBindGroup(0, translucentBindGroup, [
          slice * device.limits.minUniformBufferOffsetAlignment,
        ]);
        translucentPassEncoder.setVertexBuffer(0, vertexBuffer);
        translucentPassEncoder.setIndexBuffer(indexBuffer, 'uint16');
        translucentPassEncoder.drawIndexed(mesh.triangles.length * 3, 8);
        translucentPassEncoder.end();

        // Composite the opaque and translucent objects
        compositePassDescriptor.colorAttachments[0].view = textureView;
        const compositePassEncoder = commandEncoder.beginRenderPass(
          compositePassDescriptor
        );

        // Set the scissor to only process a horizontal slice of the frame
        compositePassEncoder.setScissorRect(
          scissorX,
          scissorY,
          scissorWidth,
          scissorHeight
        );

        compositePassEncoder.setPipeline(compositePipeline);
        compositePassEncoder.setBindGroup(0, compositeBindGroup, [
          slice * device.limits.minUniformBufferOffsetAlignment,
        ]);
        compositePassEncoder.draw(6);
        compositePassEncoder.end();
      }

      device.queue.submit([commandEncoder.finish()]);
    };
  };

  let doDraw = configure();

  const updateSettings = () => {
    doDraw = configure();
  };

  gui
    .add(settings, 'memoryStrategy', ['multipass', 'clamp-pixel-ratio'])
    .onFinishChange(updateSettings);

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    doDraw();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const ABuffer: () => JSX.Element = () =>
  makeSample({
    name: 'A-Buffer',
    description: `Demonstrates order independent transparency using a per-pixel 
       linked-list of translucent fragments. Provides a choice for 
       limiting memory usage (when required).`,
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: 'opaque.wgsl',
        contents: opaqueWGSL,
      },
      {
        name: 'translucent.wgsl',
        contents: translucentWGSL,
      },
      {
        name: 'composite.wgsl',
        contents: compositeWGSL,
      },
    ],
    filename: __filename,
  });

export default ABuffer;
