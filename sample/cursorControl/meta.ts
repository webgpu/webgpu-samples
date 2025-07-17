export default {
  name: 'Cursor Control',
  description: `\
This example shows interactive stencil masking in WebGPU using a single 2D plane that follows the cursor to create a dynamic cutout. 
A rotating torus is revealed only within this masked area, while a sphere remains visible outside it. 
The effect uses multi-pass rendering and stencil buffer logic to control visibility based on cursor interaction.
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: '../../meshes/primitives.ts' },
    { path: 'simple-lighting.wgsl' },
  ],
};
