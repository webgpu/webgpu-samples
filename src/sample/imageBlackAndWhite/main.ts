import { makeSample, SampleInit } from '../../components/SampleLayout';

import blackAndWhiteWGSL from './blackAndWhite.wgsl';

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();

  if (!adapter) {
    throw new Error('WebGPU not supported');
  }

  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const shaderModule = device.createShaderModule({
    code: blackAndWhiteWGSL,
  });

  const vertices = new Float32Array([
    -1.0, 1.0, 0.0, 1.0, 0.0, 1.0, -1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0, -1.0,
    0.0, 1.0, 1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 0.0, 1.0, 0.0, 1.0,
  ]);

  const verticesBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
  verticesBuffer.unmap();

  const img = document.createElement('img');
  img.src = new URL(
    '../../../assets/img/Di-3d.png',
    import.meta.url
  ).toString();

  await img.decode();
  const textureSize = {
    width: img.width,
    height: img.height,
  };

  const imageTexture = device.createTexture({
    size: textureSize,
    dimension: '2d',
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING,
  });

  device.queue.copyExternalImageToTexture(
    {
      source: await createImageBitmap(img),
    },
    {
      texture: imageTexture,
      mipLevel: 0,
    },
    textureSize
  );

  const settings = {
    filterStrength: 0.5,
  };

  const filterStrengthBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(filterStrengthBuffer.getMappedRange()).set([
    settings.filterStrength,
  ]);
  filterStrengthBuffer.unmap();

  function updateSettings() {
    device.queue.writeBuffer(
      filterStrengthBuffer,
      0,
      new Float32Array([settings.filterStrength])
    );
  }

  gui.add(settings, 'filterStrength', 0, 1).onChange(updateSettings);

  updateSettings();

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
    ],
  });

  const textureSampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: textureSampler,
      },
      {
        binding: 1,
        resource: imageTexture.createView(),
      },
      {
        binding: 2,
        resource: {
          buffer: filterStrengthBuffer,
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  const vertexVertexAttribute: GPUVertexAttribute = {
    format: 'float32x4',
    offset: 0,
    shaderLocation: 0,
  };

  const fragmentVertexAttribute: GPUVertexAttribute = {
    format: 'float32x2',
    offset: 16,
    shaderLocation: 1,
  };

  const vertexAttributes: Iterable<GPUVertexAttribute> = [
    vertexVertexAttribute,
    fragmentVertexAttribute,
  ];

  const vertexBufferLayout: GPUVertexBufferLayout = {
    attributes: vertexAttributes,
    arrayStride: 24,
    stepMode: 'vertex',
  };

  const vertexBuffers: Iterable<GPUVertexBufferLayout> = [vertexBufferLayout];

  const colorTargetState: GPUColorTargetState = {
    format: presentationFormat,
  };

  const renderPipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vertex_main',
      buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragment_main',
      targets: [colorTargetState],
    },
    primitive: {
      topology: 'triangle-list',
      frontFace: 'ccw',
      cullMode: 'back',
    },
  });

  function frame() {
    if (!pageState.active) return;

    const commandEncoder = device.createCommandEncoder();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
          storeOp: 'store',
          loadOp: 'clear',
        },
      ],
    });

    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(6, 2, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const ImageBlackAndWhite: () => JSX.Element = () =>
  makeSample({
    name: 'Image Black and White',
    description:
      'This example shows how to apply a black and white filter on an image using a WebGPU compute shader.',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './blackAndWhite.wgsl',
        contents: blackAndWhiteWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default ImageBlackAndWhite;
