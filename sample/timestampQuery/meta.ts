export default {
  name: 'Timestamp Query',
  description: 'This example shows how to use timestamp queries to measure render pass duration.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: '../../shaders/red.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
