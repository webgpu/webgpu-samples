import { GUI } from 'dat.gui';
import checkerWGSL from './checker.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const module = device.createShaderModule({
  code: checkerWGSL,
});
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module },
  fragment: {
    module,
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
});

// These offsets are in f32/u32 offset.
enum UniformOffset {
  color0 = 0,
  color1 = 4,
  size = 8,
}

const uniformValuesAsF32 = new Float32Array(12); // 2 vec4fs, 1 u32, 3 padding
const uniformValuesAsU32 = new Uint32Array(uniformValuesAsF32.buffer);
const uniformBuffer = device.createBuffer({
  size: uniformValuesAsF32.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: { buffer: uniformBuffer },
    },
  ],
});

const settings = {
  color0: '#FF0000',
  color1: '#00FFFF',
  size: 1,
  resizable: false,
  fullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  },
};

const containerElem = document.querySelector('#container') as HTMLElement;

const gui = new GUI();
gui.addColor(settings, 'color0').onChange(frame);
gui.addColor(settings, 'color1').onChange(frame);
gui.add(settings, 'size', 1, 32, 1).name('checker size').onChange(frame);
gui.add(settings, 'fullscreen');
gui.add(settings, 'resizable').onChange(() => {
  const { resizable } = settings;
  // Get these before we adjust the CSS because our canvas is sized in device pixels
  // and so will expand if we stop constraining it with CSS
  const width = containerElem.clientWidth;
  const height = containerElem.clientHeight;

  containerElem.classList.toggle('resizable', resizable);
  containerElem.classList.toggle('fit-container', !resizable);

  containerElem.style.width = resizable ? `${width}px` : '';
  containerElem.style.height = resizable ? `${height}px` : '';
});

// Given a CSS color, returns the color in 0 to 1 RGBA values.
const cssColorToRGBA = (function () {
  const ctx = new OffscreenCanvas(1, 1).getContext('2d', {
    willReadFrequently: true,
  });
  return function (color: string) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].map((v) => v / 255);
  };
})();

function frame() {
  uniformValuesAsF32.set(cssColorToRGBA(settings.color0), UniformOffset.color0);
  uniformValuesAsF32.set(cssColorToRGBA(settings.color1), UniformOffset.color1);
  uniformValuesAsU32[UniformOffset.size] = settings.size;

  device.queue.writeBuffer(uniformBuffer, 0, uniformValuesAsF32);

  const commandEncoder = device.createCommandEncoder();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: [0.2, 0.2, 0.2, 1.0],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

function getDevicePixelContentBoxSize(entry: ResizeObserverEntry) {
  // Safari does not support devicePixelContentBoxSize
  if (entry.devicePixelContentBoxSize) {
    return {
      width: entry.devicePixelContentBoxSize[0].inlineSize,
      height: entry.devicePixelContentBoxSize[0].blockSize,
    };
  } else {
    // These values not correct but they're as close as you can get in Safari
    return {
      width: entry.contentBoxSize[0].inlineSize * devicePixelRatio,
      height: entry.contentBoxSize[0].blockSize * devicePixelRatio,
    };
  }
}

const { maxTextureDimension2D } = device.limits;
const observer = new ResizeObserver(([entry]) => {
  // Note: If you are using requestAnimationFrame you should
  // only record the size here but set it in the requestAnimationFrame callback
  // otherwise you'll get flicker when resizing.
  const { width, height } = getDevicePixelContentBoxSize(entry);

  // A size of 0 will cause an error when we call getCurrentTexture.
  // A size > maxTextureDimension2D will also an error when we call getCurrentTexture.
  canvas.width = Math.max(1, Math.min(width, maxTextureDimension2D));
  canvas.height = Math.max(1, Math.min(height, maxTextureDimension2D));
  frame();
});
observer.observe(canvas);
