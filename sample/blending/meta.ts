export default {
  name: 'Blending',
  description: `
  This example provides shows how to use blending in WebGPU. It draws a texture with diagonal lines
  on top of a canvas with a CSS based checkerboard background. It then draws a texture with
  3 blurry circles on top the first texture with [blending settings](https://gpuweb.github.io/gpuweb/#color-target-state).
  This lets you see both the effect of blending settings in WebGPU and the final result when composited on top of the canvas.
  See [this article](https://webgpufundamentals.org/webgpu/lessons/webgpu-transparency.html)
  for a more detailed explanation.
  The presets are equivalent to the 2d canvas context's
  [\`globalCompositingOperation\`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation).
  `,
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: 'texturedQuad.wgsl' }],
};
