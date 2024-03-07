export default {
  name: 'Resize Canvas',
  description:
    'Shows multisampled rendering a basic triangle on a dynamically sized canvas.',
  filename: 'sample/resizeCanvas',
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/triangle.vert.wgsl' },
    { path: '../../shaders/red.frag.wgsl' },
    { path: 'animatedCanvasSize.module.css' },
  ],
};
