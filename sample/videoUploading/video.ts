import { GUI } from 'dat.gui';
import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import sampleExternalTextureWGSL from '../../shaders/sampleExternalTexture.frag.wgsl';

export default async function ({ useVideoFrame }: { useVideoFrame: boolean }) {
  // Set video element
  const video = document.createElement('video');
  video.loop = true;
  video.autoplay = true;
  video.muted = true;
  video.src = '../../assets/video/pano.webm';
  await video.play();

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
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

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: fullscreenTexturedQuadWGSL,
      }),
    },
    fragment: {
      module: device.createShaderModule({
        code: sampleExternalTextureWGSL,
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
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const settings = {
    requestFrame: 'requestAnimationFrame',
    videoSource: useVideoFrame ? 'videoFrame' : 'videoElement',
  };

  const gui = new GUI();
  gui.add(settings, 'videoSource', ['videoElement', 'videoFrame']);
  gui.add(settings, 'requestFrame', [
    'requestAnimationFrame',
    'requestVideoFrameCallback',
  ]);

  function frame() {
    const externalTextureSource =
      settings.videoSource === 'videoFrame' ? new VideoFrame(video) : video;

    const uniformBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: device.importExternalTexture({
            source: externalTextureSource,
          }),
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    if (externalTextureSource instanceof VideoFrame) {
      externalTextureSource.close();
    }

    if (settings.requestFrame == 'requestVideoFrameCallback') {
      video.requestVideoFrameCallback(frame);
    } else {
      requestAnimationFrame(frame);
    }
  }

  if (settings.requestFrame == 'requestVideoFrameCallback') {
    video.requestVideoFrameCallback(frame);
  } else {
    requestAnimationFrame(frame);
  }
}
