export default {
  name: 'Image Blur',
  description:
    'This example shows how to blur an image using a WebGPU compute shader.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'blur.wgsl' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
  ],
};
