import { mat4 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';
import volumeWGSL from './volume.wgsl';
import { quitIfWebGPUNotAvailableOrMissingFeatures } from '../util';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const status = document.getElementById('status') as HTMLDivElement;

const gui = new GUI();

const brainImages = {
  r8unorm: {
    bytesPerBlock: 1,
    blockLength: 1,
    feature: undefined,
    dataPath:
      '../../assets/img/volume/t1_icbm_normal_1mm_pn0_rf0_180x216x180_uint8_1x1.bin-gz',
  },
  'bc4-r-unorm': {
    bytesPerBlock: 8,
    blockLength: 4,
    feature: 'texture-compression-bc-sliced-3d',
    dataPath:
      '../../assets/img/volume/t1_icbm_normal_1mm_pn0_rf0_180x216x180_bc4_4x4.bin-gz',
    // Generated with texconv from https://github.com/microsoft/DirectXTex/releases
  },
  'astc-12x12-unorm': {
    bytesPerBlock: 16,
    blockLength: 12,
    feature: 'texture-compression-astc-sliced-3d',
    dataPath:
      '../../assets/img/volume/t1_icbm_normal_1mm_pn0_rf0_180x216x180_astc_12x12.bin-gz',
    // Generated with astcenc from https://github.com/ARM-software/astc-encoder/releases
  },
};

// GUI parameters
const params: {
  rotateCamera: boolean;
  near: number;
  far: number;
  textureFormat: GPUTextureFormat;
} = {
  rotateCamera: true,
  near: 4.3,
  far: 4.4,
  textureFormat: 'r8unorm',
};

gui.add(params, 'rotateCamera', true);
gui.add(params, 'near', 2.0, 7.0);
gui.add(params, 'far', 2.0, 7.0);
gui
  .add(params, 'textureFormat', Object.keys(brainImages))
  .onChange(async () => {
    await createVolumeTexture(params.textureFormat);
  });

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const requiredFeatures = [];
if (adapter?.features.has('texture-compression-bc-sliced-3d')) {
  requiredFeatures.push(
    'texture-compression-bc',
    'texture-compression-bc-sliced-3d'
  );
}
if (adapter?.features.has('texture-compression-astc-sliced-3d')) {
  requiredFeatures.push(
    'texture-compression-astc',
    'texture-compression-astc-sliced-3d'
  );
}
const device = await adapter?.requestDevice({ requiredFeatures });

quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);
const context = canvas.getContext('webgpu');

const sampleCount = 4;

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
});

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: volumeWGSL,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      code: volumeWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',
    cullMode: 'back',
  },
  multisample: {
    count: sampleCount,
  },
});

const texture = device.createTexture({
  size: [canvas.width, canvas.height],
  sampleCount,
  format: presentationFormat,
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
const view = texture.createView();

const uniformBufferSize = 4 * 16; // 4x4 matrix
const uniformBuffer = device.createBuffer({
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

let volumeTexture: GPUTexture | null = null;

// Fetch the image and upload it into a GPUTexture.
async function createVolumeTexture(format: GPUTextureFormat) {
  volumeTexture = null;

  const { blockLength, bytesPerBlock, dataPath, feature } = brainImages[format];
  const width = 180;
  const height = 216;
  const depth = 180;
  const blocksWide = Math.ceil(width / blockLength);
  const blocksHigh = Math.ceil(height / blockLength);
  const bytesPerRow = blocksWide * bytesPerBlock;

  if (feature && !device.features.has(feature)) {
    status.textContent = `${feature} not supported`;
    return;
  } else {
    status.textContent = '';
  }

  const response = await fetch(dataPath);

  // Decompress the data using DecompressionStream for gzip format
  const decompressionStream = new DecompressionStream('gzip');
  const decompressedStream = response.body.pipeThrough(decompressionStream);
  const decompressedArrayBuffer = await new Response(
    decompressedStream
  ).arrayBuffer();

  volumeTexture = device.createTexture({
    dimension: '3d',
    size: [width, height, depth],
    format: format,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  device.queue.writeTexture(
    { texture: volumeTexture },
    decompressedArrayBuffer,
    { bytesPerRow: bytesPerRow, rowsPerImage: blocksHigh },
    [width, height, depth]
  );
}

await createVolumeTexture(params.textureFormat);

// Create a sampler with linear filtering for smooth interpolation.
const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
  mipmapFilter: 'linear',
  maxAnisotropy: 16,
});

const bindGroupDescriptor: GPUBindGroupDescriptor = {
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: uniformBuffer,
    },
    {
      binding: 1,
      resource: sampler,
    },
    {
      binding: 2,
      resource: undefined, // Assigned later
    },
  ],
};

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: undefined, // Assigned later

      clearValue: [0, 0, 0, 1.0],
      loadOp: 'clear',
      storeOp: 'discard',
    },
  ],
};

let rotation = 0;

function getInverseModelViewProjectionMatrix(deltaTime: number) {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, [0, 0, -4], viewMatrix);
  if (params.rotateCamera) {
    rotation += deltaTime;
  }
  mat4.rotate(
    viewMatrix,
    [Math.sin(rotation), Math.cos(rotation), 0],
    1,
    viewMatrix
  );

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    params.near,
    params.far
  );
  const modelViewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);

  return mat4.invert(modelViewProjectionMatrix);
}

let lastFrameMS = Date.now();

function frame() {
  const now = Date.now();
  const deltaTime = (now - lastFrameMS) / 1000;
  lastFrameMS = now;

  const inverseModelViewProjection =
    getInverseModelViewProjectionMatrix(deltaTime);
  device.queue.writeBuffer(uniformBuffer, 0, inverseModelViewProjection);
  renderPassDescriptor.colorAttachments[0].view = view;
  renderPassDescriptor.colorAttachments[0].resolveTarget = context
    .getCurrentTexture()
    .createView();

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  if (volumeTexture) {
    bindGroupDescriptor.entries[2].resource = volumeTexture.createView();
    const uniformBindGroup = device.createBindGroup(bindGroupDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(3);
  }
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
