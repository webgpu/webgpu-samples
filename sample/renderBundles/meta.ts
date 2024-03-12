export default {
  name: 'Render Bundles',
  description: `This example shows how to use render bundles. It renders a large number of
    meshes individually as a proxy for a more complex scene in order to demonstrate the reduction
    in JavaScript time spent to issue render commands. (Typically a scene like this would make use
    of instancing to reduce draw overhead.)`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'mesh.wgsl' },
    { path: '../../meshes/sphere.ts' },
  ],
};
