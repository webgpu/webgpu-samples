export default {
  name: 'Stencil Mask',
  description:
    "This example demonstrates how to use the stencil buffer to create a dynamic mask over a scene, allowing for the selective rendering of two different instances of the 'Instanced Cube' scene. Each instance of the scene is distinguished by different uniform and color properties. The mask is crafted using a Signed Distance Field (SDF), offering options to invert the mask or switch between shapes like circles and triangles. Users can interactively adjust the mask's position and scale with the mouse and the scroll wheel.",
  filename: __DIRNAME__,
  sources: [
    // Ts files
    { path: 'main.ts' },
    // Stencil Mask shaders
    { path: 'positionQuad.vert.wgsl' },
    { path: 'sdf.frag.wgsl' },
    // Instanced Cube verts
    { path: '../instancedCube/instanced.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
