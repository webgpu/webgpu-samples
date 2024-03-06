export default {
  name: 'Particles',
  description:
    'This example demonstrates rendering of particles simulated with compute shaders.',
  filename: 'sample/particles',
  sources: [
    { path: 'main.ts' },
    { path: './particle.wgsl' },
    { path: './probabilityMap.wgsl' },
  ],
};
