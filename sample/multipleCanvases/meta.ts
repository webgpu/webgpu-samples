export default {
  name: 'Multiple Canvases',
  description: `\
This example shows rendering to multiple canvases with a single WebGPU device and using \`IntersectionObserver\`
to only render to visible canvases.

For more info [see this article](https://webgpufundamentals.org/webgpu/lessons/webgpu-multiple-canvases.html).`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'models.ts' },
    { path: 'solidColorLit.wgsl' },
  ],
};
