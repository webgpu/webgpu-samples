export default {
  name: 'Compute Boids',
  description:
    'A GPU compute particle simulation that mimics \
the flocking behavior of birds. A compute shader updates \
two ping-pong buffers which store particle data. The data \
is used to draw instanced particles.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'updateSprites.wgsl' },
    { path: 'sprite.wgsl' },
  ],
};
