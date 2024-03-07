export default {
  name: 'Cornell box',
  description:
    'A classic Cornell box, using a lightmap generated using software ray-tracing.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'common.ts' },
    { path: 'scene.ts' },
    { path: 'radiosity.ts' },
    { path: 'rasterizer.ts' },
    { path: 'raytracer.ts' },
    { path: 'tonemapper.ts' },
    { path: 'radiosity.wgsl' },
    { path: 'rasterizer.wgsl' },
    { path: 'raytracer.wgsl' },
    { path: 'tonemapper.wgsl' },
    { path: 'common.wgsl' },
  ],
};
