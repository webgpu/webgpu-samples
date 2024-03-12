export default {
  name: 'Animometer',
  description: 'A WebGPU port of the Animometer MotionMark benchmark.',
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: 'animometer.wgsl' }],
};
