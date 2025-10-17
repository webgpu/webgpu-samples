import { GUI } from 'dat.gui';
import { mat3, mat4 } from 'wgpu-matrix';
import fullscreenTexturedQuadWGSL from '../../shaders/fullscreenTexturedQuad.wgsl';
import sampleExternalTextureWGSL from './sampleExternalTexture.frag.wgsl';
import sampleExternalTextureAsPanoramaWGSL from './sampleExternalTextureAsPanorama.wgsl';
import { quitIfWebGPUNotAvailable } from '../util';

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

const videos = {
  'giraffe (2d)': {
    url: '../../assets/video/5214261-hd_1920_1080_25fps.mp4',
    mode: 'cover',
  },
  'lhc (360)': {
    url: '../../assets/video/pano.webm',
    mode: '360',
  },
  'lake (360)': {
    url: '../../assets/video/Video_360°._Timelapse._Bled_Lake_in_Slovenia..webm.720p.vp9.webm',
    mode: '360',
  },
} as const;

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const context = canvas.getContext('webgpu');
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const videoCoverPipeline = device.createRenderPipeline({
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

const module = device.createShaderModule({
  code: sampleExternalTextureAsPanoramaWGSL,
});
const video360Pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module },
  fragment: {
    module,
    targets: [{ format: presentationFormat }],
  },
  primitive: {
    topology: 'triangle-list',
  },
});

const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
});

// make buffer big enough for either pipeline
const uniformBuffer = device.createBuffer({
  size: (16 + 2 + 2) * 4, // (mat4x4f + vec2f + padding) vs (mat3x3f + padding)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// Set video element
const video = document.createElement('video');
video.loop = true;
video.playsInline = true;
video.autoplay = true;
video.muted = true;

let canReadVideo = false;

async function playVideo(videoName: keyof typeof videos) {
  canReadVideo = false;
  video.src = videos[videoName].url;
  await video.play();
  canReadVideo = true;
}

const params = new URLSearchParams(window.location.search);
const settings = {
  requestFrame: 'requestAnimationFrame',
  videoSource: params.get('videoSource') || 'videoElement',
  video: Object.keys(videos)[0] as keyof typeof videos,
};
playVideo(settings.video);

const gui = new GUI();
gui.add(settings, 'videoSource', ['videoElement', 'videoFrame']);
gui.add(settings, 'requestFrame', [
  'requestAnimationFrame',
  'requestVideoFrameCallback',
]);
gui.add(settings, 'video', Object.keys(videos)).onChange(() => {
  playVideo(settings.video);
});

let yRotation = 0;
let xRotation = 0;

function drawVideo() {
  const maxSize = device.limits.maxTextureDimension2D;
  canvas.width = Math.min(Math.max(1, canvas.offsetWidth), maxSize);
  canvas.height = Math.min(Math.max(1, canvas.offsetHeight), maxSize);
  const externalTextureSource =
    settings.videoSource === 'videoFrame' ? new VideoFrame(video) : video;

  const mode = videos[settings.video].mode;
  const pipeline = mode === '360' ? video360Pipeline : videoCoverPipeline;
  const canvasTexture = context.getCurrentTexture();

  const bindGroup = device.createBindGroup({
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
      {
        binding: 3,
        resource: { buffer: uniformBuffer },
      },
    ],
  });

  if (mode === '360') {
    // Spin the camera around the y axis and add in the user's x and y rotation;
    const time = performance.now() * 0.001;
    const rotation = time * 0.1 + yRotation;
    const projection = mat4.perspective(
      (75 * Math.PI) / 180,
      canvas.clientWidth / canvas.clientHeight,
      0.5,
      100
    );

    // Note: You can use any method you want to compute a view matrix,
    // just be sure to zero out the translation.
    const camera = mat4.identity();
    mat4.rotateY(camera, rotation, camera);
    mat4.rotateX(camera, xRotation, camera);
    mat4.setTranslation(camera, [0, 0, 0], camera);
    const view = mat4.inverse(camera);
    const viewDirectionProjection = mat4.multiply(projection, view);
    const viewDirectionProjectionInverse = mat4.inverse(
      viewDirectionProjection
    );

    const uniforms = new Float32Array([
      ...viewDirectionProjectionInverse,
      canvasTexture.width,
      canvasTexture.height,
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);
  } else {
    // compute a `cover` matrix for a unit UV quad.
    const mat = mat3.identity();
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.offsetWidth / canvas.offsetHeight;
    const combinedAspect = videoAspect / canvasAspect;
    mat3.translate(mat, [0.5, 0.5], mat);
    mat3.scale(
      mat,
      combinedAspect > 1 ? [1 / combinedAspect, 1] : [1, combinedAspect],
      mat
    );
    mat3.translate(mat, [-0.5, -0.5], mat);
    device.queue.writeBuffer(uniformBuffer, 0, mat);
  }

  const commandEncoder = device.createCommandEncoder();
  const textureView = canvasTexture.createView();

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 1],
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.draw(6);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  if (externalTextureSource instanceof VideoFrame) {
    externalTextureSource.close();
  }
}

function frame() {
  if (canReadVideo) {
    drawVideo();
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

let startX = 0;
let startY = 0;
let startYRotation = 0;
let startTarget = 0;

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const drag = (e: PointerEvent) => {
  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  yRotation = startYRotation + deltaX * 0.01;
  xRotation = clamp(
    startTarget + deltaY * -0.01,
    -Math.PI * 0.4,
    Math.PI * 0.4
  );
};

const stopDrag = () => {
  window.removeEventListener('pointermove', drag);
  window.removeEventListener('pointerup', stopDrag);
};

const startDrag = (e: PointerEvent) => {
  window.addEventListener('pointermove', drag);
  window.addEventListener('pointerup', stopDrag);
  e.preventDefault();
  startX = e.clientX;
  startY = e.clientY;
  startYRotation = yRotation;
  startTarget = xRotation;
};
canvas.addEventListener('pointerdown', startDrag);
