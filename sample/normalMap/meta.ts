export default {
  name: 'Normal Mapping',
  description:
    'This example demonstrates multiple different methods that employ fragment shaders to achieve additional perceptual depth on the surface of a cube mesh. Demonstrated methods include normal mapping, parallax mapping, and steep parallax mapping.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'normalMap.wgsl' },
    { path: '../../meshes/box.ts' },
    { path: '../../meshes/mesh.ts' },
    { path: 'utils.ts' },
  ],
};
