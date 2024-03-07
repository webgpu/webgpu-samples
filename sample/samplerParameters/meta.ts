export default {
  name: 'Sampler Parameters',
  description:
    'Visualizes what all the sampler parameters do. Shows a textured plane at various scales (rotated, head-on, in perspective, and in vanishing perspective). The bottom-right view shows the raw contents of the 4 mipmap levels of the test texture (16x16, 8x8, 4x4, and 2x2).',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './texturedSquare.wgsl' },
    { path: './showTexture.wgsl' },
  ],
};
