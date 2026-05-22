import { GUI } from 'dat.gui';
import triangleVertWGSL from '../../shaders/triangle.vert.wgsl';
import redFragWGSL from '../../shaders/red.frag.wgsl';
import { quitIfWebGPUNotAvailableOrMissingFeatures } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);

const settings = { transientAttachment: false };
if ('TRANSIENT_ATTACHMENT' in GPUTextureUsage) {
  const gui = new GUI();
  gui.add(settings, 'transientAttachment');
}

const context = canvas.getContext('webgpu');

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const sampleCount = 4;

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: triangleVertWGSL,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      code: redFragWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',
  },
  multisample: {
    count: sampleCount,
  },
});

const getMSAATempTextureView = (() => {
  let texture: GPUTexture | undefined;
  let view: GPUTextureView | undefined;
  return () => {
    let usage = GPUTextureUsage.RENDER_ATTACHMENT;
    if (settings.transientAttachment) {
      usage |= GPUTextureUsage.TRANSIENT_ATTACHMENT;
    }

    if (texture?.usage !== usage) {
      console.log(`Reallocating with usage ${usage}`);

      if (texture) {
        texture.destroy();
      }

      texture = device.createTexture({
        size: [canvas.width, canvas.height],
        sampleCount,
        format: presentationFormat,
        usage,
      });
      view = texture.createView();
    }

    return view!;
  };
})();

function frame() {
  const commandEncoder = device.createCommandEncoder();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: getMSAATempTextureView(),
        resolveTarget: context.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 0], // Clear to transparent
        loadOp: 'clear',
        storeOp: 'discard',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
