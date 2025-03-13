import { mat4 } from 'wgpu-matrix';
import { GUI } from 'dat.gui';
import { quitIfWebGPUNotAvailable } from '../util';
import texturedQuadWGSL from './texturedQuad.wgsl';

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);

// creates a CSS hsl string from 3 normalized numbers (0 to 1)
const hsl = (hue: number, saturation: number, lightness: number) =>
  `hsl(${(hue * 360) | 0}, ${saturation * 100}%, ${(lightness * 100) | 0}%)`;

// creates a CSS hsla string from 4 normalized numbers (0 to 1)
const hsla = (
  hue: number,
  saturation: number,
  lightness: number,
  alpha: number
) =>
  // prettier-ignore
  `hsla(${(hue * 360) | 0}, ${saturation * 100}%, ${(lightness * 100) | 0}%, ${alpha})`;

// Generates a canvas with 3 circles of different colors with blurred edges.
function createSourceImage(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.translate(size / 2, size / 2);

  ctx.globalCompositeOperation = 'screen';
  const numCircles = 3;
  for (let i = 0; i < numCircles; ++i) {
    ctx.rotate((Math.PI * 2) / numCircles);
    ctx.save();
    ctx.translate(size / 6, 0);
    ctx.beginPath();

    const radius = size / 3;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(0, 0, radius / 2, 0, 0, radius);
    const h = i / numCircles;
    gradient.addColorStop(0.5, hsla(h, 1, 0.5, 1));
    gradient.addColorStop(1, hsla(h, 1, 0.5, 0));

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }
  return canvas;
}

// Generates a canvas with alternating colored and transparent stripes
function createDestinationImage(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  for (let i = 0; i <= 6; ++i) {
    gradient.addColorStop(i / 6, hsl(i / -6, 1, 0.5));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(0, 0, 0, 255)';
  ctx.globalCompositeOperation = 'destination-out';
  ctx.rotate(Math.PI / -4);
  for (let i = 0; i < size * 2; i += 32) {
    ctx.fillRect(-size, i, size * 2, 16);
  }

  return canvas;
}

// make 2 canvas elements, 300x300 with images in them.
// We'll copy these to textures.
const size = 300;
const srcCanvas = createSourceImage(size);
const dstCanvas = createDestinationImage(size);

// Get a WebGPU context from the canvas and configure it
const canvas = document.querySelector('canvas');
const context = canvas.getContext('webgpu');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

const module = device.createShaderModule({
  label: 'our hardcoded textured quad shaders',
  code: texturedQuadWGSL,
});

function createTextureFromSource(
  device: GPUDevice,
  source: HTMLCanvasElement,
  options: {
    flipY?: boolean;
    premultipliedAlpha?: boolean;
  } = {}
) {
  const { flipY, premultipliedAlpha } = options;
  const texture = device.createTexture({
    format: 'rgba8unorm',
    size: [source.width, source.height],
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source, flipY },
    { texture, premultipliedAlpha },
    { width: source.width, height: source.height }
  );
  return texture;
}

const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: {} },
  ],
});

const pipelineLayout = device.createPipelineLayout({
  bindGroupLayouts: [bindGroupLayout],
});

// create 2 textures with unpremultiplied alpha
const srcTextureUnpremultipliedAlpha = createTextureFromSource(
  device,
  srcCanvas
);
const dstTextureUnpremultipliedAlpha = createTextureFromSource(
  device,
  dstCanvas
);

// create 2 textures with premultiplied alpha
const srcTexturePremultipliedAlpha = createTextureFromSource(
  device,
  srcCanvas,
  { premultipliedAlpha: true }
);
const dstTexturePremultipliedAlpha = createTextureFromSource(
  device,
  dstCanvas,
  { premultipliedAlpha: true }
);

const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
  mipmapFilter: 'linear',
});

type Uniforms = {
  buffer: GPUBuffer;
  values: Float32Array;
  matrix: Float32Array;
};

function makeUniformBufferAndValues(device: GPUDevice): Uniforms {
  // offsets to the various uniform values in float32 indices
  const kMatrixOffset = 0;

  // create a buffer for the uniform values
  const uniformBufferSize = 16 * 4; // matrix is 16 32bit floats (4bytes each)
  const buffer = device.createBuffer({
    label: 'uniforms for quad',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // create a typedarray to hold the values for the uniforms in JavaScript
  const values = new Float32Array(uniformBufferSize / 4);
  const matrix = values.subarray(kMatrixOffset, 16);
  return { buffer, values, matrix };
}
const srcUniform = makeUniformBufferAndValues(device);
const dstUniform = makeUniformBufferAndValues(device);

const srcBindGroupUnpremultipliedAlpha = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: sampler },
    { binding: 1, resource: srcTextureUnpremultipliedAlpha.createView() },
    { binding: 2, resource: { buffer: srcUniform.buffer } },
  ],
});

const dstBindGroupUnpremultipliedAlpha = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: sampler },
    { binding: 1, resource: dstTextureUnpremultipliedAlpha.createView() },
    { binding: 2, resource: { buffer: dstUniform.buffer } },
  ],
});

const srcBindGroupPremultipliedAlpha = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: sampler },
    { binding: 1, resource: srcTexturePremultipliedAlpha.createView() },
    { binding: 2, resource: { buffer: srcUniform.buffer } },
  ],
});

const dstBindGroupPremultipliedAlpha = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    { binding: 0, resource: sampler },
    { binding: 1, resource: dstTexturePremultipliedAlpha.createView() },
    { binding: 2, resource: { buffer: dstUniform.buffer } },
  ],
});

const textureSets = [
  {
    srcTexture: srcTexturePremultipliedAlpha,
    dstTexture: dstTexturePremultipliedAlpha,
    srcBindGroup: srcBindGroupPremultipliedAlpha,
    dstBindGroup: dstBindGroupPremultipliedAlpha,
  },
  {
    srcTexture: srcTextureUnpremultipliedAlpha,
    dstTexture: dstTextureUnpremultipliedAlpha,
    srcBindGroup: srcBindGroupUnpremultipliedAlpha,
    dstBindGroup: dstBindGroupUnpremultipliedAlpha,
  },
];

const clearValue = [0, 0, 0, 0];
const renderPassDescriptor: GPURenderPassDescriptor = {
  label: 'our basic canvas renderPass',
  colorAttachments: [
    {
      view: undefined, // <- to be filled out when we render
      clearValue,
      loadOp: 'clear',
      storeOp: 'store',
    },
  ],
};

const operations = ['add', 'subtract', 'reverse-subtract', 'min', 'max'];

const factors = [
  'zero',
  'one',
  'src',
  'one-minus-src',
  'src-alpha',
  'one-minus-src-alpha',
  'dst',
  'one-minus-dst',
  'dst-alpha',
  'one-minus-dst-alpha',
  'src-alpha-saturated',
  'constant',
  'one-minus-constant',
];

const presets: {
  [key: string]: { color?: GPUBlendComponent; alpha?: GPUBlendComponent };
} = {
  'default (copy)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'zero',
    },
  },
  'premultiplied blend (source-over)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'un-premultiplied blend': {
    color: {
      operation: 'add',
      srcFactor: 'src-alpha',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'destination-over': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'one',
    },
  },
  'source-in': {
    color: {
      operation: 'add',
      srcFactor: 'dst-alpha',
      dstFactor: 'zero',
    },
  },
  'destination-in': {
    color: {
      operation: 'add',
      srcFactor: 'zero',
      dstFactor: 'src-alpha',
    },
  },
  'source-out': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'zero',
    },
  },
  'destination-out': {
    color: {
      operation: 'add',
      srcFactor: 'zero',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'source-atop': {
    color: {
      operation: 'add',
      srcFactor: 'dst-alpha',
      dstFactor: 'one-minus-src-alpha',
    },
  },
  'destination-atop': {
    color: {
      operation: 'add',
      srcFactor: 'one-minus-dst-alpha',
      dstFactor: 'src-alpha',
    },
  },
  'additive (lighten)': {
    color: {
      operation: 'add',
      srcFactor: 'one',
      dstFactor: 'one',
    },
  },
} as const;

export function keysOf<T extends string>(obj: {
  [k in T]: unknown;
}): readonly T[] {
  return Object.keys(obj) as unknown[] as T[];
}
const kPresets = keysOf(presets);
type Preset = (typeof kPresets)[number];

const color: GPUBlendComponent = {
  operation: 'add',
  srcFactor: 'one',
  dstFactor: 'one-minus-src',
};

const alpha: GPUBlendComponent = {
  operation: 'add',
  srcFactor: 'one',
  dstFactor: 'one-minus-src',
};

const constant = {
  color: [1, 0.5, 0.25],
  alpha: 1,
};

const clear = {
  color: [0, 0, 0],
  alpha: 0,
  premultiply: true,
};

const settings: {
  alphaMode: GPUCanvasAlphaMode;
  textureSet: string;
  preset: Preset;
} = {
  alphaMode: 'premultiplied',
  textureSet: 'premultiplied alpha',
  preset: 'premultiplied blend (source-over)',
};

// Translates to/from a normalized color value and an 8bit unsigned color value.
// This is because dat.gui only edits 8bit unsigned color values but we need normalized color values.
class GUIColorHelper {
  normalizedColor: number[];

  constructor(normalizedColor: number[]) {
    this.normalizedColor = normalizedColor;
  }
  get value() {
    return this.normalizedColor.map((v) => Math.round(v * 255));
  }
  set value(rgb255Color: number[]) {
    this.normalizedColor.forEach(
      (_, i) => (this.normalizedColor[i] = rgb255Color[i] / 255)
    );
  }
}

function applyPreset() {
  const preset = presets[settings.preset];
  Object.assign(color, preset.color);
  Object.assign(alpha, preset.alpha || preset.color);
}

const gui = new GUI();
gui
  .add(settings, 'alphaMode', ['opaque', 'premultiplied'])
  .name('canvas alphaMode')
  .onChange(render);
gui
  .add(settings, 'textureSet', [
    'premultiplied alpha',
    'un-premultiplied alpha',
  ])
  .name('texture data')
  .onChange(render);
gui.add(settings, 'preset', [...Object.keys(presets)]).onChange(() => {
  applyPreset();
  render();
});

const colorFolder = gui.addFolder('color');
colorFolder.open();
colorFolder.add(color, 'operation', operations).onChange(render);
colorFolder.add(color, 'srcFactor', factors).onChange(render);
colorFolder.add(color, 'dstFactor', factors).onChange(render);

const alphaFolder = gui.addFolder('alpha');
alphaFolder.open();
alphaFolder.add(alpha, 'operation', operations).onChange(render);
alphaFolder.add(alpha, 'srcFactor', factors).onChange(render);
alphaFolder.add(alpha, 'dstFactor', factors).onChange(render);

const constantFolder = gui.addFolder('constant');
constantFolder.open();
constantFolder
  .addColor(new GUIColorHelper(constant.color), 'value')
  .name('color')
  .onChange(render);
constantFolder.add(constant, 'alpha', 0, 1).onChange(render);

const clearFolder = gui.addFolder('clear color');
clearFolder.open();
clearFolder.add(clear, 'premultiply').onChange(render);
clearFolder.add(clear, 'alpha', 0, 1).onChange(render);
clearFolder.addColor(new GUIColorHelper(clear.color), 'value').onChange(render);

const dstPipeline = device.createRenderPipeline({
  label: 'hardcoded textured quad pipeline',
  layout: pipelineLayout,
  vertex: {
    module,
  },
  fragment: {
    module,
    targets: [{ format: presentationFormat }],
  },
});

function makeBlendComponentValid(blend) {
  const { operation } = blend;
  if (operation === 'min' || operation === 'max') {
    blend.srcFactor = 'one';
    blend.dstFactor = 'one';
  }
}

function render() {
  makeBlendComponentValid(color);
  makeBlendComponentValid(alpha);
  gui.updateDisplay();

  const srcPipeline = device.createRenderPipeline({
    label: 'hardcoded textured quad pipeline',
    layout: pipelineLayout,
    vertex: {
      module,
    },
    fragment: {
      module,
      targets: [
        {
          format: presentationFormat,
          blend: {
            color,
            alpha,
          },
        },
      ],
    },
  });

  const { srcTexture, dstTexture, srcBindGroup, dstBindGroup } =
    textureSets[settings.textureSet === 'premultiplied alpha' ? 0 : 1];

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: settings.alphaMode,
  });

  const canvasTexture = context.getCurrentTexture();
  // Get the current texture from the canvas context and
  // set it as the texture to render to.
  renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

  // Apply the clearValue, pre-multiplying or not it based on the settings.
  {
    const { alpha, color, premultiply } = clear;
    const mult = premultiply ? alpha : 1;
    clearValue[0] = color[0] * mult;
    clearValue[1] = color[1] * mult;
    clearValue[2] = color[2] * mult;
    clearValue[3] = alpha;
  }

  function updateUniforms(
    uniforms: Uniforms,
    canvasTexture: GPUTexture,
    texture: GPUTexture
  ) {
    const projectionMatrix = mat4.ortho(
      0,
      canvasTexture.width / devicePixelRatio,
      canvasTexture.height / devicePixelRatio,
      0,
      -1,
      1
    );

    mat4.scale(
      projectionMatrix,
      [texture.width, texture.height, 1],
      uniforms.matrix
    );

    // copy the values from JavaScript to the GPU
    device.queue.writeBuffer(uniforms.buffer, 0, uniforms.values);
  }
  updateUniforms(srcUniform, canvasTexture, srcTexture);
  updateUniforms(dstUniform, canvasTexture, dstTexture);

  const encoder = device.createCommandEncoder({
    label: 'render quad encoder',
  });
  const pass = encoder.beginRenderPass(renderPassDescriptor);

  // draw destination texture without blending
  pass.setPipeline(dstPipeline);
  pass.setBindGroup(0, dstBindGroup);
  pass.draw(6);

  // draw source texture with blending
  pass.setPipeline(srcPipeline);
  pass.setBindGroup(0, srcBindGroup);
  pass.setBlendConstant([...constant.color, constant.alpha]);
  pass.draw(6);

  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
}

applyPreset();
render();
