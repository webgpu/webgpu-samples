export default {
  name: 'Instanced Cube',
  description: 'This example shows the use of instancing.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'instanced.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
