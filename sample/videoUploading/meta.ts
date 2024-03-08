export default {
  name: 'Video Uploading',
  description: 'This example shows how to upload video frame to WebGPU.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
    { path: '../../shaders/sampleExternalTexture.frag.wgsl' },
  ],
};
