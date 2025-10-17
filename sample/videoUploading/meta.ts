export default {
  name: 'Video Uploading',
  description: `\
This example shows how to upload video frame to WebGPU.
giraffe by [Taryn Elliott](https://www.pexels.com/video/giraffe-walking-in-the-forest-5214261/).
lhc by [unknown](https://foo.com).
lake by [Fabio Casati](https://commons.wikimedia.org/wiki/File:Video_360%C2%B0._Timelapse._Bled_Lake_in_Slovenia..webm), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0)
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
    { path: './sampleExternalTexture.frag.wgsl' },
    { path: './sampleExternalTextureAsPanorama.wgsl' },
  ],
};
