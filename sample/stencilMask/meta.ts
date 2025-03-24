export default {
  name: 'Stencil Mask',
  description: `\
This example shows using the stencil buffer for masking. It draws 6 planes, forming a cube,
each plane with a different stencil value. It then draws 7 scenes of moving objects, each set to only draw when
the stencilReference value matches the value in the stencil buffer.
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../meshes/primitives.ts' },
    { path: 'simple-lighting.wgsl' },
  ],
};
