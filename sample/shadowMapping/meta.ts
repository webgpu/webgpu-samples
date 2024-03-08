export default {
  name: 'Shadow Mapping',
  description:
    'This example shows how to sample from a depth texture to render shadows.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'vertexShadow.wgsl' },
    { path: 'vertex.wgsl' },
    { path: 'fragment.wgsl' },
  ],
};
