import fullScreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import { generateMips, numMipLevels } from './generateMipmap';
import { quitIfWebGPUNotAvailable } from '../util';
import { GUI } from 'dat.gui';

const canvas = document.createElement('canvas');
const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const response = await fetch('../../assets/img/Di-3d.png');
const imageBitmap = await createImageBitmap(await response.blob());
const size = [imageBitmap.width, imageBitmap.height];

const mipLevelCount = numMipLevels(...size);
const imageTexture = device.createTexture({
  size,
  mipLevelCount,
  format: 'rgba8unorm',
  usage:
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.RENDER_ATTACHMENT,
});
device.queue.copyExternalImageToTexture(
  { source: imageBitmap },
  { texture: imageTexture },
  size
);
generateMips(device, imageTexture);

// render each mip level to a webgpu canvas and generate an image

const context = canvas.getContext('webgpu') as GPUCanvasContext;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: presentationFormat,
});

const module = device.createShaderModule({
  code: fullScreenTexturedQuadWGSL,
});

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module },
  fragment: { module, targets: [{ format: presentationFormat }] },
});

const sampler = device.createSampler();

for (let baseMipLevel = 0; baseMipLevel < mipLevelCount; ++baseMipLevel) {
  const width = Math.max(1, imageTexture.width >> baseMipLevel);
  const height = Math.max(1, imageTexture.height >> baseMipLevel);
  canvas.width = width;
  canvas.height = height;

  const commandEncoder = device.createCommandEncoder();
  const t = context.getCurrentTexture();
  console.log(t.width, t.height);
  const textureView = context.getCurrentTexture().createView();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 0], // Clear to transparent
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      {
        binding: 1,
        resource: imageTexture.createView({
          baseMipLevel,
          mipLevelCount: 1,
        }),
      },
    ],
  });

  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.draw(6);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);

  canvas.toBlob((blob) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    document.body.append(img);
  });
}

const settings = { expand: false };
const gui = new GUI();
gui.add(settings, 'expand').onChange((expand) => {
  document.querySelectorAll('img').forEach((img) => {
    img.classList.toggle('expand', !!expand);
  });
});
