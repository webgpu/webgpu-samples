export default {
  name: 'WebGPU in a Worker',
  description: `This example shows one method of using WebGPU in a web worker and presenting to
    the main thread. It uses canvas.transferControlToOffscreen() to produce an offscreen canvas
    which is then transferred to the worker where all the WebGPU calls are made.`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'worker.ts' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
