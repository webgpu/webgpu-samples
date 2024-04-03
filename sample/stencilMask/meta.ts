export default {
  name: 'Stencil Mask',
  description:
    'This example demonstrates how to use the stencil buffer to create a simple mask over a scene. The mask itself is rendered using an SDF, and the properties of the mask are adjusted by changing the stencil test properties in the render pipeline.',
  filename: __DIRNAME__,
  sources: [
    // Ts files
    { path: 'main.ts' },
    // Stencil Mask shaders
    { path: 'fullscreenQuad.vert.wgsl' },
    { path: 'sdf.frag.wgsl' },
    // Instanced Cube verts
    { path: 'instanced.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
