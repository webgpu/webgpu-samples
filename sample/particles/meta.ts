export default {
  name: 'Particles (HDR)',
  description:
    'This example demonstrates rendering of particles (using HDR capabilities when possible) simulated with compute shaders.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './particle.wgsl' },
    { path: './probabilityMap.wgsl' },
  ],
};
