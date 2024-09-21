export default {
  name: 'Alpha-to-Coverage',
  description: `
Alpha-to-coverage is an alternative to alpha testing and alpha blending. See:
<https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f>

This sample visualizes how alpha-to-coverage translates alpha values into sample
coverage on your device. It draws two full-screen quads into a 4-sample
texture, each with the configured color and alpha value. Then, it visualizes the
contents of the resulting 4-sample texture: the circles show the 4 samples of
each texel; the background shows the "resolved" results (average of 4 samples).

The algorithm that converts alpha to a coverage sample mask varies per device.
This results in different average "blending" proportions between the black
background, the first draw, and the second draw.
Device differences include different tile sizes (e.g. 1x1, 2x2, or 4x4),
"moving" samples (or not) around with in the tile as alpha increases, etc.
`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: './renderWithAlphaToCoverage.wgsl' },
    { path: './showMultisampleTexture.wgsl' },
  ],
};
