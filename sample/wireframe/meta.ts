export default {
  name: 'Wireframe',
  description: `
  This example demonstrates drawing a wireframe from triangles by using the
  vertex buffers as storage buffers and then using \`@builtin(vertex_index)\`
  to index the vertex data to generate 3 lines per triangle. It uses
  array<f32> in the vertex shader so it can pull out \`vec3f\` positions
  at any valid stride.
  `,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'wireframe.wgsl' },
    { path: 'solidColorLit.wgsl' },
    { path: 'models.ts' },
    { path: '../../meshes/box.ts' },
    { path: '../../meshes/mesh.ts' },
    { path: 'utils.ts' },
  ],
};
