export default {
  name: 'Two Cubes',
  description:
    'This example shows some of the alignment requirements \
     involved when updating and binding multiple slices of a \
     uniform buffer. It renders two rotating cubes which have transform \
     matrices at different offsets in a uniform buffer.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
