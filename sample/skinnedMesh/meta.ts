export default {
  name: 'Skinned Mesh',
  description:
    'A demonstration of basic gltf loading and mesh skinning, ported from <https://webgl2fundamentals.org/webgl/lessons/webgl-skinning.html>. Mesh data, per vertex attributes, and skin inverseBindMatrices are taken from the json parsed from the binary output of the .glb file. Animations are generated progrmatically, with animated joint matrices updated and passed to shaders per frame via uniform buffers.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'gridData.ts' },
    { path: 'gridUtils.ts' },
    { path: 'grid.wgsl' },
    { path: 'gltf.ts' },
    { path: 'glbUtils.ts' },
    { path: 'gltf.wgsl' },
  ],
};
