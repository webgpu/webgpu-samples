import { makeSample, SampleInit } from '../../components/SampleLayout';

import radiosityWGSL from './radiosity.wgsl';
import rasterizerWGSL from './rasterizer.wgsl';
import raytracerWGSL from './raytracer.wgsl';
import tonemapperWGSL from './tonemapper.wgsl';
import commonWGSL from './common.wgsl';
import Scene from './scene';
import Common from './common';
import Radiosity from './radiosity';
import Rasterizer from './rasterizer';
import Tonemapper from './tonemapper';
import Raytracer from './raytracer';

const init: SampleInit = async ({ canvas, pageState, gui }) => {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const requiredFeatures: GPUFeatureName[] =
    presentationFormat === 'bgra8unorm' ? ['bgra8unorm-storage'] : [];
  const adapter = await navigator.gpu.requestAdapter();
  for (const feature of requiredFeatures) {
    if (!adapter.features.has(feature)) {
      throw new Error(
        `sample requires ${feature}, but is not supported by the adapter`
      );
    }
  }
  const device = await adapter.requestDevice({ requiredFeatures });

  if (!pageState.active) return;

  const params: {
    renderer: 'rasterizer' | 'raytracer';
    rotateCamera: boolean;
  } = {
    renderer: 'rasterizer',
    rotateCamera: true,
  };

  gui.add(params, 'renderer', ['rasterizer', 'raytracer']);
  gui.add(params, 'rotateCamera', true);

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  context.configure({
    device,
    format: presentationFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.STORAGE_BINDING,
    alphaMode: 'premultiplied',
  });

  const framebuffer = device.createTexture({
    label: 'framebuffer',
    size: [canvas.width, canvas.height],
    format: 'rgba16float',
    usage:
      GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.STORAGE_BINDING |
      GPUTextureUsage.TEXTURE_BINDING,
  });

  const scene = new Scene(device);
  const common = new Common(device, scene.quadBuffer);
  const radiosity = new Radiosity(device, common, scene);
  const rasterizer = new Rasterizer(
    device,
    common,
    scene,
    radiosity,
    framebuffer
  );
  const raytracer = new Raytracer(device, common, radiosity, framebuffer);

  function frame() {
    if (!pageState.active) {
      // Sample is no longer the active page.
      return;
    }

    const canvasTexture = context.getCurrentTexture();
    const commandEncoder = device.createCommandEncoder();

    common.update({
      rotateCamera: params.rotateCamera,
      aspect: canvas.width / canvas.height,
    });
    radiosity.run(commandEncoder);

    switch (params.renderer) {
      case 'rasterizer': {
        rasterizer.run(commandEncoder);
        break;
      }
      case 'raytracer': {
        raytracer.run(commandEncoder);
        break;
      }
    }

    const tonemapper = new Tonemapper(
      device,
      common,
      framebuffer,
      canvasTexture
    );
    tonemapper.run(commandEncoder);

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const CornellBox: () => JSX.Element = () =>
  makeSample({
    name: 'Cornell box',
    description:
      'A classic Cornell box, using a lightmap generated using software ray-tracing.',
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      Common.sourceInfo,
      Scene.sourceInfo,
      Radiosity.sourceInfo,
      Rasterizer.sourceInfo,
      Raytracer.sourceInfo,
      Tonemapper.sourceInfo,
      {
        name: './radiosity.wgsl',
        contents: radiosityWGSL,
        editable: true,
      },
      {
        name: './rasterizer.wgsl',
        contents: rasterizerWGSL,
        editable: true,
      },
      {
        name: './raytracer.wgsl',
        contents: raytracerWGSL,
        editable: true,
      },
      {
        name: './tonemapper.wgsl',
        contents: tonemapperWGSL,
        editable: true,
      },
      {
        name: './common.wgsl',
        contents: commonWGSL,
        editable: true,
      },
    ],
    filename: __filename,
  });

export default CornellBox;
