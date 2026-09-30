export default {
  name: 'Particles (HDR)',
  tocName: 'particles (HDR)',
  description:
    'This example demonstrates rendering of particles simulated with compute shaders, using HDR and wide color gamut canvas capabilities when possible.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './particle.wgsl' },
    { path: './probabilityMap.wgsl' },
  ],
};
