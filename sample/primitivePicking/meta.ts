export default {
  name: 'Primitive Picking',
  description: `This example demonstrates use of the primitive_index WGSL builtin.
    It is used to render a unique ID for each primitive to a buffer, which is
    then read at the current cursor/touch location to determine which primitive
    has been selected. That primitive is then highlighted when rendering the
    next frame.
    `,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'vertexForwardRendering.wgsl' },
    { path: 'fragmentForwardRendering.wgsl' },
    { path: 'vertexTextureQuad.wgsl' },
    { path: 'fragmentPrimitivesDebugView.wgsl' },
    { path: 'computePickPrimitive.wgsl' },
  ],
};
