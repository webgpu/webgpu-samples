export default {
  name: 'Wireframe',
  description: `
  This example demonstrates drawing a wireframe from triangles in 2 ways.
  Both use the vertex and index buffers as storage buffers and the use \`@builtin(vertex_index)\`
  to index the vertex data. One method generates 6 vertices per triangle and uses line-list to draw lines.
  The other method draws triangles with a fragment shader that uses barycentric coordinates to draw edges
  as detailed [here](https://web.archive.org/web/20130424093557/http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/).

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
