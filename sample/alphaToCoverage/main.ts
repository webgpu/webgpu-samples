import { GUI } from 'dat.gui';

import showMultisampleTextureWGSL from './showMultisampleTexture.wgsl';
import renderWithAlphaToCoverageWGSL from './renderWithAlphaToCoverage.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

/* eslint @typescript-eslint/no-explicit-any: "off" */
declare const GIF: any; // from gif.js

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

//
// GUI controls
//

const kAlphaSteps = 64;

const kInitConfig = {
  width: 8,
  height: 8,
  alpha: 4,
  pause: false,
};
const config = { ...kInitConfig };
const updateConfig = () => {
  const data = new Float32Array([config.alpha / kAlphaSteps]);
  device.queue.writeBuffer(bufConfig, 0, data);
};

const gui = new GUI();
{
  const buttons = {
    initial() {
      Object.assign(config, kInitConfig);
      gui.updateDisplay();
    },
    captureGif() {
      void captureGif();
    },
  };

  const settings = gui.addFolder('Settings');
  settings.open();
  settings.add(config, 'width', 1, 16, 1);
  settings.add(config, 'height', 1, 16, 1);

  const alphaPanel = gui.addFolder('Alpha');
  alphaPanel.open();
  alphaPanel
    .add(config, 'alpha', -2, kAlphaSteps + 2, 1)
    .name(`alpha (of ${kAlphaSteps})`);
  alphaPanel.add(config, 'pause', false);

  gui.add(buttons, 'initial').name('reset to initial');
  gui.add(buttons, 'captureGif').name('capture gif (right click gif to save)');
}

//
// Canvas setup
//

function updateCanvasSize() {
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
}
updateCanvasSize();
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

const context = canvas.getContext('webgpu') as GPUCanvasContext;
context.configure({
  device,
  format: presentationFormat,
  alphaMode: 'premultiplied',
});

//
// Config buffer
//

const bufConfig = device.createBuffer({
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  size: 128,
});

//
// Pipeline to render to a multisampled texture using alpha-to-coverage
//

const renderWithAlphaToCoverageModule = device.createShaderModule({
  code: renderWithAlphaToCoverageWGSL,
});
const renderWithAlphaToCoveragePipeline = device.createRenderPipeline({
  label: 'renderWithAlphaToCoveragePipeline',
  layout: 'auto',
  vertex: { module: renderWithAlphaToCoverageModule },
  fragment: {
    module: renderWithAlphaToCoverageModule,
    targets: [{ format: 'rgba16float' }],
  },
  multisample: { count: 4, alphaToCoverageEnabled: true },
  primitive: { topology: 'triangle-list' },
});
const renderWithAlphaToCoverageBGL =
  renderWithAlphaToCoveragePipeline.getBindGroupLayout(0);

const renderWithAlphaToCoverageBG = device.createBindGroup({
  layout: renderWithAlphaToCoverageBGL,
  entries: [{ binding: 0, resource: { buffer: bufConfig } }],
});

//
// "Debug" view of the actual texture contents
//

const showMultisampleTextureModule = device.createShaderModule({
  code: showMultisampleTextureWGSL,
});
const showMultisampleTexturePipeline = device.createRenderPipeline({
  label: 'showMultisampleTexturePipeline',
  layout: 'auto',
  vertex: { module: showMultisampleTextureModule },
  fragment: {
    module: showMultisampleTextureModule,
    targets: [{ format: presentationFormat }],
  },
  primitive: { topology: 'triangle-list' },
});
const showMultisampleTextureBGL =
  showMultisampleTexturePipeline.getBindGroupLayout(0);

function render() {
  updateConfig();

  const multisampleTexture = device.createTexture({
    format: 'rgba16float',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    size: [config.width, config.height],
    sampleCount: 4,
  });
  const multisampleTextureView = multisampleTexture.createView();

  const showMultisampleTextureBG = device.createBindGroup({
    layout: showMultisampleTextureBGL,
    entries: [{ binding: 0, resource: multisampleTextureView }],
  });

  const commandEncoder = device.createCommandEncoder();
  // renderWithAlphaToCoverage pass
  {
    const pass = commandEncoder.beginRenderPass({
      label: 'renderWithAlphaToCoverage pass',
      colorAttachments: [
        {
          view: multisampleTextureView,
          clearValue: [0, 0, 0, 1], // will be overwritten
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(renderWithAlphaToCoveragePipeline);
    pass.setBindGroup(0, renderWithAlphaToCoverageBG);
    pass.draw(6);
    pass.end();
  }
  // showMultisampleTexture pass
  {
    const pass = commandEncoder.beginRenderPass({
      label: 'showMulitsampleTexture pass',
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: [1, 0, 1, 1], // error color, will be overwritten
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(showMultisampleTexturePipeline);
    pass.setBindGroup(0, showMultisampleTextureBG);
    pass.draw(6);
    pass.end();
  }
  device.queue.submit([commandEncoder.finish()]);

  multisampleTexture.destroy();
}

function frame() {
  if (!config.pause) {
    config.alpha = ((performance.now() / 10000) % 1) * (kAlphaSteps + 4) - 2;
    gui.updateDisplay();
  }
  updateCanvasSize();
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

async function captureGif() {
  const size = Math.max(config.width, config.height) * 32;
  const gif = new GIF({
    workers: 4,
    workerScript: '../../third_party/gif.js/gif.worker.js',
    width: size,
    height: size,
    debug: true,
  });

  canvas.width = canvas.height = size;
  const frames = [];
  // Loop through all alpha values and render a frame
  for (let alpha = 0; alpha <= kAlphaSteps; ++alpha) {
    config.alpha = alpha;
    render();
    const dataURL = canvas.toDataURL();
    // Only save the frame into the gif if it's different from the last one
    if (dataURL !== frames[frames.length - 1]) {
      frames.push(dataURL);
    }
  }
  for (let i = 0; i < frames.length; ++i) {
    const img = new Image();
    img.src = frames[i];
    gif.addFrame(img, {
      delay: i == 0 || i == frames.length - 1 ? 2000 : 1000,
    });
  }

  gif.on('finished', (blob) => {
    const imggif = document.querySelector('#imggif') as HTMLImageElement;
    imggif.src = URL.createObjectURL(blob);
    console.log(imggif.src);
  });
  gif.render();
}
