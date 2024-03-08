import { createBindGroupCluster, createTextureFromImage } from './utils';
import sobelWGSL from './sobel.wgsl';
import fullscreenWGSL from './fullscreen.wgsl';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

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

// Fetch the image and upload it into a GPUTexture.
let birdTexture: GPUTexture;
{
  const response = await fetch('../../assets/img/bird.gif');
  const imageBitmap = await createImageBitmap(await response.blob());
  birdTexture = createTextureFromImage(device, imageBitmap, 'r8unorm', false);
}

let sobelTexture: GPUTexture;
{
  const response = await fetch('../../assets/img/bird.gif');
  const imageBitmap = await createImageBitmap(await response.blob());
  birdTexture = createTextureFromImage(device, imageBitmap, 'r8uint', true);
}

// Create a sampler with linear filtering for smooth interpolation.
const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
});

const textureBGCluster = createBindGroupCluster({
  device,
  label: 'Texture',
  bindingLayouts: [
    {
      visibility: GPUShaderStage.FRAGMENT,
      bindingMember: 'sampler',
      bindingLayout: { type: 'filtering' },
    },
    {
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      bindingMember: 'storageTexture',
      bindingLayout: { access: 'read-write', format: 'r8unorm' },
    },
    {
      visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
      bindingMember: 'texture',
      bindingLayout: { sampleType: 'float' },
    },
  ],
  resourceLayouts: [
    [sampler, sobelTexture.createView(), birdTexture.createView()],
  ],
});

const sobelPipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({
    bindGroupLayouts: [textureBGCluster.bindGroupLayout],
  }),
  compute: {
    module: device.createShaderModule({
      code: sobelWGSL,
    }),
    entryPoint: 'main',
  },
});

const fullscreenQuadPipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: fullscreenWGSL,
    }),
    entryPoint: 'vert_main',
  },
  fragment: {
    module: device.createShaderModule({
      code: fullscreenWGSL,
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

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later

      clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
};

function frame() {
  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();

  /*const computePassEncoder = commandEncoder.beginComputePass();
  computePassEncoder.setPipeline(sobelPipeline);
  computePassEncoder.setBindGroup(0, textureBGCluster.bindGroups[0]);
  computePassEncoder.dispatchWorkgroups(32, 32);
  computePassEncoder.end(); */

  const renderPassEncoder =
    commandEncoder.beginRenderPass(renderPassDescriptor);
  renderPassEncoder.setPipeline(fullscreenQuadPipeline);
  renderPassEncoder.setBindGroup(0, textureBGCluster.bindGroups[0]);
  renderPassEncoder.draw(6);
  renderPassEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
