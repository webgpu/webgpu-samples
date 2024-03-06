export default {
  name: 'Video Uploading with WebCodecs',
  description: `This example shows how to upload a WebCodecs VideoFrame to WebGPU.`,
  filename: 'sample/videoUploadingWebCodecs',
  sources: [
    { path: '../videoUploading/video.ts' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
    { path: '../../shaders/sampleExternalTexture.frag.wgsl' },
  ],
};
