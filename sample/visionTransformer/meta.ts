export default {
  name: 'Vision Transformer (ViT)',
  description:
    'Runs a DeiT-Tiny vision transformer entirely in WebGPU compute shaders to classify images, \
and visualizes per-head attention maps showing which image patches the model focuses on. \
Drag and drop an image to classify it.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'inference.ts' },
    { path: 'weights.ts' },
    { path: 'visualize.ts' },
    { path: 'shaders/patchEmbed.wgsl' },
    { path: 'shaders/layerNorm.wgsl' },
    { path: 'shaders/mlp.wgsl' },
    { path: 'shaders/attnScores.wgsl' },
    { path: 'shaders/attnSoftmax.wgsl' },
    { path: 'shaders/attnApply.wgsl' },
    { path: 'shaders/visualize.wgsl' },
  ],
};
