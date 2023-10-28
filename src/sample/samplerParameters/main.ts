import { mat4 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import texturedSquareWGSL from './texturedSquare.wgsl';
import showTextureWGSL from './showTexture.wgsl';

const kMatrices: Readonly<Float32Array> = new Float32Array([
  // Row 1: Scale by 2
  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [2, 2, 1]),
  ...mat4.scale(mat4.identity(), [2, 2, 1]),
  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [2, 2, 1]),
  ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [2, 2, 1]),
  // Row 2: Scale by 1
  ...mat4.rotationZ(Math.PI / 16),
  ...mat4.identity(),
  ...mat4.rotationX(-Math.PI * 0.3),
  ...mat4.rotationX(-Math.PI * 0.42),
  // Row 3: Scale by 0.9
  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.9, 0.9, 1]),
  ...mat4.scale(mat4.identity(), [0.9, 0.9, 1]),
  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.9, 0.9, 1]),
  ...mat4.scale(mat4.rotationX(-Math.PI * 0.42), [0.9, 0.9, 1]),
  // Row 4: Scale by 0.3
  ...mat4.scale(mat4.rotationZ(Math.PI / 16), [0.3, 0.3, 1]),
  ...mat4.scale(mat4.identity(), [0.3, 0.3, 1]),
  ...mat4.scale(mat4.rotationX(-Math.PI * 0.3), [0.3, 0.3, 1]),
]);

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;

  //
  // GUI controls
  //

  const kInitConfig = {
    flangeLogSize: 1.0,
    highlightFlange: false,
    animation: 0.1,
  } as const;
  const config = { ...kInitConfig };
  const updateConfigBuffer = () => {
    const t = (performance.now() / 1000) * 0.5;
    const data = new Float32Array([
      Math.cos(t) * config.animation,
      Math.sin(t) * config.animation,
      (2 ** config.flangeLogSize - 1) / 2,
      Number(config.highlightFlange),
    ]);
    device.queue.writeBuffer(bufConfig, 64, data);
  };

  const kInitSamplerDescriptor = {
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    lodMinClamp: 0,
    lodMaxClamp: 4,
    maxAnisotropy: 1,
  } as const;
  const samplerDescriptor: GPUSamplerDescriptor = { ...kInitSamplerDescriptor };

  {
    const buttons = {
      initial() {
        Object.assign(config, kInitConfig);
        Object.assign(samplerDescriptor, kInitSamplerDescriptor);
        gui.updateDisplay();
      },
      checkerboard() {
        Object.assign(config, { flangeLogSize: 10 });
        Object.assign(samplerDescriptor, {
          addressModeU: 'repeat',
          addressModeV: 'repeat',
        });
        gui.updateDisplay();
      },
      smooth() {
        Object.assign(samplerDescriptor, {
          magFilter: 'linear',
          minFilter: 'linear',
          mipmapFilter: 'linear',
        });
        gui.updateDisplay();
      },
      crunchy() {
        Object.assign(samplerDescriptor, {
          magFilter: 'nearest',
          minFilter: 'nearest',
          mipmapFilter: 'nearest',
        });
        gui.updateDisplay();
      },
    };
    const presets = gui.addFolder('Presets');
    presets.open();
    presets.add(buttons, 'initial').name('reset to initial');
    presets.add(buttons, 'checkerboard').name('checkered floor');
    presets.add(buttons, 'smooth').name('smooth (linear)');
    presets.add(buttons, 'crunchy').name('crunchy (nearest)');

    const flangeFold = gui.addFolder('Plane settings');
    flangeFold.open();
    flangeFold.add(config, 'flangeLogSize', 0, 10.0, 0.1).name('size = 2**');
    flangeFold.add(config, 'highlightFlange');
    flangeFold.add(config, 'animation', 0, 0.5);

    gui.width = 280;
    {
      const folder = gui.addFolder('GPUSamplerDescriptor');
      folder.open();

      const kAddressModes = ['clamp-to-edge', 'repeat', 'mirror-repeat'];
      folder.add(samplerDescriptor, 'addressModeU', kAddressModes);
      folder.add(samplerDescriptor, 'addressModeV', kAddressModes);

      const kFilterModes = ['nearest', 'linear'];
      folder.add(samplerDescriptor, 'magFilter', kFilterModes);
      folder.add(samplerDescriptor, 'minFilter', kFilterModes);
      const kMipmapFilterModes = ['nearest', 'linear'] as const;
      folder.add(samplerDescriptor, 'mipmapFilter', kMipmapFilterModes);

      const ctlMin = folder.add(samplerDescriptor, 'lodMinClamp', 0, 4, 0.1);
      const ctlMax = folder.add(samplerDescriptor, 'lodMaxClamp', 0, 4, 0.1);
      ctlMin.onChange((value: number) => {
        if (samplerDescriptor.lodMaxClamp < value) ctlMax.setValue(value);
      });
      ctlMax.onChange((value: number) => {
        if (samplerDescriptor.lodMinClamp > value) ctlMin.setValue(value);
      });

      {
        const folder2 = folder.addFolder(
          'maxAnisotropy (set only if all "linear")'
        );
        folder2.open();
        const kMaxAnisotropy = 16;
        folder2.add(samplerDescriptor, 'maxAnisotropy', 1, kMaxAnisotropy, 1);
      }
    }
  }

  //
  // Canvas setup
  //

  // Low-res, pixelated render target so it's easier to see fine details.
  const kCanvasSize = 200;
  const kViewportGridSize = 4;
  const kViewportGridStride = Math.floor(kCanvasSize / kViewportGridSize);
  const kViewportSize = kViewportGridStride - 2;

  // The canvas buffer size is 200x200.
  // Compute a canvas CSS size such that there's an integer number of device
  // pixels per canvas pixel ("integer" or "pixel-perfect" scaling).
  // Note the result may be 1 pixel off since ResizeObserver is not used.
  const kCanvasLayoutCSSSize = 600; // set by template styles
  const kCanvasLayoutDevicePixels = kCanvasLayoutCSSSize * devicePixelRatio;
  const kScaleFactor = Math.floor(kCanvasLayoutDevicePixels / kCanvasSize);
  const kCanvasDevicePixels = kScaleFactor * kCanvasSize;
  const kCanvasCSSSize = kCanvasDevicePixels / devicePixelRatio;
  canvas.style.imageRendering = 'pixelated';
  canvas.width = canvas.height = kCanvasSize;
  canvas.style.minWidth = canvas.style.maxWidth = kCanvasCSSSize + 'px';
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  //
  // Initialize test texture
  //

  // Set up a texture with 4 mip levels, each containing a differently-colored
  // checkerboard with 1x1 pixels (so when rendered the checkerboards are
  // different sizes). This is different from a normal mipmap where each level
  // would look like a lower-resolution version of the previous one.
  // Level 0 is 16x16 white/black
  // Level 1 is 8x8 blue/black
  // Level 2 is 4x4 yellow/black
  // Level 3 is 2x2 pink/black
  const kTextureMipLevels = 4;
  const kTextureBaseSize = 16;
  const checkerboard = device.createTexture({
    format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
    size: [kTextureBaseSize, kTextureBaseSize],
    mipLevelCount: 4,
  });
  const checkerboardView = checkerboard.createView();

  const kColorForLevel = [
    [255, 255, 255, 255],
    [30, 136, 229, 255], // blue
    [255, 193, 7, 255], // yellow
    [216, 27, 96, 255], // pink
  ];
  for (let mipLevel = 0; mipLevel < kTextureMipLevels; ++mipLevel) {
    const size = 2 ** (kTextureMipLevels - mipLevel); // 16, 8, 4, 2
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; ++y) {
      for (let x = 0; x < size; ++x) {
        data.set(
          (x + y) % 2 ? kColorForLevel[mipLevel] : [0, 0, 0, 255],
          (y * size + x) * 4
        );
      }
    }
    device.queue.writeTexture(
      { texture: checkerboard, mipLevel },
      data,
      { bytesPerRow: size * 4 },
      [size, size]
    );
  }

  //
  // "Debug" view of the actual texture contents
  //

  const showTextureModule = device.createShaderModule({
    code: showTextureWGSL,
  });
  const showTexturePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: showTextureModule, entryPoint: 'vmain' },
    fragment: {
      module: showTextureModule,
      entryPoint: 'fmain',
      targets: [{ format: presentationFormat }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const showTextureBG = device.createBindGroup({
    layout: showTexturePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: checkerboardView }],
  });

  //
  // Pipeline for drawing the test squares
  //

  const texturedSquareModule = device.createShaderModule({
    code: texturedSquareWGSL,
  });

  const texturedSquarePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: texturedSquareModule,
      entryPoint: 'vmain',
      constants: { kTextureBaseSize, kViewportSize },
    },
    fragment: {
      module: texturedSquareModule,
      entryPoint: 'fmain',
      targets: [{ format: presentationFormat }],
    },
    primitive: { topology: 'triangle-list' },
  });
  const texturedSquareBGL = texturedSquarePipeline.getBindGroupLayout(0);

  const bufConfig = device.createBuffer({
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    size: 128,
  });
  // View-projection matrix set up so it doesn't transform anything at z=0.
  const kCameraDist = 3;
  const viewProj = mat4.translate(
    mat4.perspective(2 * Math.atan(1 / kCameraDist), 1, 0.1, 100),
    [0, 0, -kCameraDist]
  );
  device.queue.writeBuffer(bufConfig, 0, viewProj as Float32Array);

  const bufMatrices = device.createBuffer({
    usage: GPUBufferUsage.STORAGE,
    size: kMatrices.byteLength,
    mappedAtCreation: true,
  });
  new Float32Array(bufMatrices.getMappedRange()).set(kMatrices);
  bufMatrices.unmap();

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    updateConfigBuffer();

    const sampler = device.createSampler({
      ...samplerDescriptor,
      maxAnisotropy:
        samplerDescriptor.minFilter === 'linear' &&
        samplerDescriptor.magFilter === 'linear' &&
        samplerDescriptor.mipmapFilter === 'linear'
          ? samplerDescriptor.maxAnisotropy
          : 1,
    });

    const bindGroup = device.createBindGroup({
      layout: texturedSquareBGL,
      entries: [
        { binding: 0, resource: { buffer: bufConfig } },
        { binding: 1, resource: { buffer: bufMatrices } },
        { binding: 2, resource: sampler },
        { binding: 3, resource: checkerboardView },
      ],
    });

    const textureView = context.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
    // Draw test squares
    pass.setPipeline(texturedSquarePipeline);
    pass.setBindGroup(0, bindGroup);
    for (let i = 0; i < kViewportGridSize ** 2 - 1; ++i) {
      const vpX = kViewportGridStride * (i % kViewportGridSize) + 1;
      const vpY = kViewportGridStride * Math.floor(i / kViewportGridSize) + 1;
      pass.setViewport(vpX, vpY, kViewportSize, kViewportSize, 0, 1);
      pass.draw(6, 1, 0, i);
    }
    // Show texture contents
    pass.setPipeline(showTexturePipeline);
    pass.setBindGroup(0, showTextureBG);
    const kLastViewport = (kViewportGridSize - 1) * kViewportGridStride + 1;
    pass.setViewport(kLastViewport, kLastViewport, 32, 32, 0, 1);
    pass.draw(6, 1, 0, 0);
    pass.setViewport(kLastViewport + 32, kLastViewport, 16, 16, 0, 1);
    pass.draw(6, 1, 0, 1);
    pass.setViewport(kLastViewport + 32, kLastViewport + 16, 8, 8, 0, 1);
    pass.draw(6, 1, 0, 2);
    pass.setViewport(kLastViewport + 32, kLastViewport + 24, 4, 4, 0, 1);
    pass.draw(6, 1, 0, 3);
    pass.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

export default () =>
  makeSample({
    name: 'Sampler Parameters',
    description:
      'Visualizes what all the sampler parameters do. Shows a textured plane at various scales (rotated, head-on, in perspective, and in vanishing perspective). The bottom-right view shows the raw contents of the 4 mipmap levels of the test texture (16x16, 8x8, 4x4, and 2x2).',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './texturedSquare.wgsl',
        contents: texturedSquareWGSL,
        editable: true,
      },
      {
        name: './showTexture.wgsl',
        contents: showTextureWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });
