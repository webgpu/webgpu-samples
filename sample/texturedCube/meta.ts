export default {
  name: 'Textured Cube',
  description: 'This example shows how to bind and sample textures.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: 'sampleTextureMixColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
