export default {
  name: 'Alpha-to-Coverage',
  description:
    'Visualizes how alpha-to-coverage translates alpha values into sample coverage on your device. This varies per device; for example, not all devices guarantee that once a sample pops in, it will stay; some devices repeat at 2x2 pixels, others at 4x4; etc. The circles show the 4 samples of each pixel; the background checkerboard shows where the pixels are.',
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './renderWithAlphaToCoverage.wgsl' },
    { path: './showMultisampleTexture.wgsl' },
  ],
};
