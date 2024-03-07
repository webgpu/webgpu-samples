export default {
  name: 'Textured Cube',
  description: 'This example shows how to bind and sample textures.',
  filename: 'sample/texturedCube',
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: 'sampleTextureMixColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
