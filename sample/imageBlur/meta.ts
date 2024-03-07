export default {
  name: 'Image Blur',
  description:
    'This example shows how to blur an image using a WebGPU compute shader.',
  filename: 'sample/imageBlur',
  sources: [
    { path: 'main.ts' },
    { path: 'blur.wgsl' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
  ],
};
