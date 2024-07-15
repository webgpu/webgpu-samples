export default {
  name: 'Bitonic Sort',
  description:
    "A naive bitonic sort algorithm executed on the GPU, based on tgfrerer's implementation at <https://poniesandlight.co.uk/reflect/bitonic_merge_sort/>. Each dispatch of the bitonic sort shader dispatches a workgroup containing elements/2 invocations. The GUI's Execution Information folder contains information about the sort's current state. The visualizer displays the sort's results as colored cells sorted from brightest to darkest.",
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'bitonicDisplay.ts' },
    { path: '../../shaders/fullscreenTexturedQuad.wgsl' },
    { path: './bitonicDisplay.frag.wgsl' },
    { path: './bitonicCompute.ts' },
    { path: './atomicToZero.wgsl' },
  ],
};
