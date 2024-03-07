export default {
  name: 'Hello Triangle MSAA',
  description: 'Shows multisampled rendering a basic triangle.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/triangle.vert.wgsl' },
    { path: '../../shaders/red.frag.wgsl' },
  ],
};
