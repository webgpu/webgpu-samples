import { makeSample, SampleInit } from '../../components/SampleLayout';

import blurWGSL from './blur.wgsl';
import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';

// Contants from the blur.wgsl shader.
const tileDim = 128;
const batch = [4, 4];

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

  const blurPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: blurWGSL,
      }),
      entryPoint: 'main',
    },
  });

  const fullscreenQuadPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: fullscreenTexturedQuadWGSL,
      }),
      entryPoint: 'vert_main',
    },
    fragment: {
      module: device.createShaderModule({
        code: fullscreenTexturedQuadWGSL,
      }),
      entryPoint: 'frag_main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const response = await fetch('../assets/img/Di-3d.png');
  const imageBitmap = await createImageBitmap(await response.blob());

  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
  const cubeTexture = device.createTexture({
    size: [srcWidth, srcHeight, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
    { texture: cubeTexture },
    [imageBitmap.width, imageBitmap.height]
  );

  const textures = [0, 1].map(() => {
    return device.createTexture({
      size: {
        width: srcWidth,
        height: srcHeight,
      },
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING,
    });
  });

  const buffer0 = (() => {
    const buffer = device.createBuffer({
      size: 4,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM,
    });
    new Uint32Array(buffer.getMappedRange())[0] = 0;
    buffer.unmap();
    return buffer;
  })();

  const buffer1 = (() => {
    const buffer = device.createBuffer({
      size: 4,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM,
    });
    new Uint32Array(buffer.getMappedRange())[0] = 1;
    buffer.unmap();
    return buffer;
  })();

  const blurParamsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  const computeConstants = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: {
          buffer: blurParamsBuffer,
        },
      },
    ],
  });

  const computeBindGroup0 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: cubeTexture.createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer0,
        },
      },
    ],
  });

  const computeBindGroup1 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: textures[0].createView(),
      },
      {
        binding: 2,
        resource: textures[1].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer1,
        },
      },
    ],
  });

  const computeBindGroup2 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: textures[1].createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer0,
        },
      },
    ],
  });

  const showResultBindGroup = device.createBindGroup({
    layout: fullscreenQuadPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: textures[1].createView(),
      },
    ],
  });

  const settings = {
    filterSize: 15,
    iterations: 2,
  };

  let blockDim: number;
  const updateSettings = () => {
    blockDim = tileDim - (settings.filterSize - 1);
    device.queue.writeBuffer(
      blurParamsBuffer,
      0,
      new Uint32Array([settings.filterSize, blockDim])
    );
  };
  gui.add(settings, 'filterSize', 1, 33).step(2).onChange(updateSettings);
  gui.add(settings, 'iterations', 1, 10).step(1);

  updateSettings();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const commandEncoder = device.createCommandEncoder();

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(blurPipeline);
    computePass.setBindGroup(0, computeConstants);

    computePass.setBindGroup(1, computeBindGroup0);
    computePass.dispatchWorkgroups(
      Math.ceil(srcWidth / blockDim),
      Math.ceil(srcHeight / batch[1])
    );

    computePass.setBindGroup(1, computeBindGroup1);
    computePass.dispatchWorkgroups(
      Math.ceil(srcHeight / blockDim),
      Math.ceil(srcWidth / batch[1])
    );

    for (let i = 0; i < settings.iterations - 1; ++i) {
      computePass.setBindGroup(1, computeBindGroup2);
      computePass.dispatchWorkgroups(
        Math.ceil(srcWidth / blockDim),
        Math.ceil(srcHeight / batch[1])
      );

      computePass.setBindGroup(1, computeBindGroup1);
      computePass.dispatchWorkgroups(
        Math.ceil(srcHeight / blockDim),
        Math.ceil(srcWidth / batch[1])
      );
    }

    computePass.end();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    passEncoder.setPipeline(fullscreenQuadPipeline);
    passEncoder.setBindGroup(0, showResultBindGroup);
    passEncoder.draw(6);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const ImageBlur: () => JSX.Element = () =>
  makeSample({
    name: 'Image Blur',
    description:
      'This example shows how to blur an image using a WebGPU compute shader.',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './blur.wgsl',
        contents: blurWGSL,
        editable: true,
      },
      {
        name: '../../shaders/fullscreenTexturedQuad.wgsl',
        contents: fullscreenTexturedQuadWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default ImageBlur;
