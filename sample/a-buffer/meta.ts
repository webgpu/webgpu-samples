export default {
  name: 'A-Buffer',
  description: `Demonstrates order independent transparency using a per-pixel 
     linked-list of translucent fragments. Provides a choice for 
     limiting memory usage (when required).`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'opaque.wgsl' },
    { path: 'translucent.wgsl' },
    { path: 'composite.wgsl' },
  ],
};
