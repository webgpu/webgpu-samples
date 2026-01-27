export default {
  name: 'Cubemap',
  description: `
This example shows how to render and sample from a cubemap texture. 
See [this article](https://webgpufundamentals.org/webgpu/lessons/webgpu-skybox.html)
for more details.
Cubemap image available under a Creative Commons Attribution 3.0 Unported License at
<https://www.humus.name/index.php?page=Textures&ID=58>
`,
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: './sampleCubemap.wgsl' }],
};
