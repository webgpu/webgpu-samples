import triangleVertWGSL from '../../shaders/triangle.vert.wgsl';
import redFragWGSL from '../../shaders/red.frag.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const context = canvas.getContext('webgpu') as GPUCanvasContext;

const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;

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

let renderTarget: GPUTexture | undefined = undefined;
let renderTargetView: GPUTextureView;

function frame() {
  const currentWidth = canvas.clientWidth * devicePixelRatio;
  const currentHeight = canvas.clientHeight * devicePixelRatio;

  // The canvas size is animating via CSS.
  // When the size changes, we need to reallocate the render target.
  // We also need to set the physical size of the canvas to match the computed CSS size.
  if (
    (currentWidth !== canvas.width ||
      currentHeight !== canvas.height ||
      !renderTargetView) &&
    currentWidth &&
    currentHeight
  ) {
    if (renderTarget !== undefined) {
      // Destroy the previous render target
      renderTarget.destroy();
    }

    // Setting the canvas width and height will automatically resize the textures returned
    // when calling getCurrentTexture() on the context.
    canvas.width = currentWidth;
    canvas.height = currentHeight;

    // Resize the multisampled render target to match the new canvas size.
    renderTarget = device.createTexture({
      size: [canvas.width, canvas.height],
      sampleCount,
      format: presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    renderTargetView = renderTarget.createView();
  }

  if (renderTargetView) {
    const commandEncoder = device.createCommandEncoder();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: renderTargetView,
          resolveTarget: context.getCurrentTexture().createView(),
          clearValue: [0.2, 0.2, 0.2, 1.0],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
