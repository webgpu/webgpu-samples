export default {
  name: 'Generate Mipmap',
  description: `\
This example shows one way to generate a mipmap in WebGPU in a compatibility mode compatible way.
For more info [see this article](https://webgpufundamentals.org/webgpu/lessons/webgpu-compatibility-mode.html#a-generating-mipmaps).
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'generateMipmap.ts' },
    { path: 'generateMipmap.wgsl' },
    { path: 'texturedGeometry.wgsl' },
    { path: 'makeCanvasImage.ts' },
  ],
};
