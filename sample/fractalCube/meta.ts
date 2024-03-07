export default {
  name: 'Fractal Cube',
  description:
    "This example uses the previous frame's rendering result \
     as the source texture for the next frame.",
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: './sampleSelf.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
