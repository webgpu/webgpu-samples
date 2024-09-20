export default {
  name: 'Alpha-to-Coverage',
  description:
    `
Visualizes how alpha-to-coverage translates alpha values into sample
coverage on your device. It draws two full-screen quads into a 4-sample
texture, with the configured color and alpha values. Then, it visualizes the
contents of that 4-sample texture: the circles show the 4 samples of each
pixel; the background checkerboard shows where the pixels are.

The algorithm that converts alpha to a coverage sample mask varies per
device. This results in different proportions between the black background,
the first draw, and the second draw.

Examples: Some devices use 1x1 patterns, others 2x2, others 4x4. Not all devices guarantee that once a sample "pops in", it will stay there at higher alpha values. Some devices "move" samples around at certain alpha thresholds even without increasing the total sample count.
    `,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './renderWithAlphaToCoverage.wgsl' },
    { path: './showMultisampleTexture.wgsl' },
  ],
};
