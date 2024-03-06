export default {
  name: 'Video Uploading',
  description: 'This example shows how to upload video frame to WebGPU.',
  filename: 'sample/videoUploading',
  sources: [
    { path: 'video.ts' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
    { path: '../../shaders/sampleExternalTexture.frag.wgsl' },
  ],
};
