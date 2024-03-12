export default {
  name: 'Points',
  description: `\
This example shows how to render points of various sizes using a quad and instancing.
    
You can read more details [here](https://webgpufundamentals.org/webgpu/lessons/webgpu-points.html).
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'distance-sized-points.vert.wgsl' },
    { path: 'fixed-size-points.vert.wgsl' },
    { path: 'orange.frag.wgsl' },
    { path: 'textured.frag.wgsl' },
  ],
};
