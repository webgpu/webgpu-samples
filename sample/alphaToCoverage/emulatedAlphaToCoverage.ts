/**
 * Database of alpha-to-coverage patterns from different devices.
 *
 * Name of device ->
 *   Array of patterns from a=0.0 to a=1.0, evenly spaced, excluding endpoints ->
 *     Array of N*N masks depending on the block size of the pattern used
 *     (in row-major order)
 */
export const alphaToCoverageDatabase: { [k: string]: PatternSequence } = {
  'NVIDIA GeForce RTX 3070': [[0b1000], [0b1001], [0b1011]],
  'Intel HD Graphics 4400': [[0b0001], [0b0011], [0b0111]],
};

type PatternSequence = ReadonlyArray<Pattern>;
type Pattern = ReadonlyArray<Mask>;
type Mask = number;

/**
 * For each device name, provides the source for a WGSL function which emulates
 * the alpha-to-coverage algorithm of that device by mapping (alpha, x, y) to
 * a sample mask.
 */
export const kEmulatedAlphaToCoverage = {
  'Apple M1 Pro': `\
    fn emulatedAlphaToCoverage(alpha: f32, x: u32, y: u32) -> u32 {
      let i = (y % 2) * 2 + (x % 2);
      if (alpha < 0.5 / 16) { return ${0b0000}; }
      // FIXME returning values out of an array is not working, always returns 0
      if (alpha <  1.5 / 16) { return array(${0b0001}u, ${0b0000}, ${0b0000}, ${0b0000})[i]; }
      if (alpha <  2.5 / 16) { return array(${0b0001}u, ${0b0000}, ${0b0000}, ${0b0001})[i]; }
      if (alpha <  3.5 / 16) { return array(${0b0001}u, ${0b0001}, ${0b0000}, ${0b0001})[i]; }
      if (alpha <  4.5 / 16) { return array(${0b0001}u, ${0b0001}, ${0b0001}, ${0b0001})[i]; }
      if (alpha <  5.5 / 16) { return array(${0b1001}u, ${0b0001}, ${0b0001}, ${0b0001})[i]; }
      if (alpha <  6.5 / 16) { return array(${0b1001}u, ${0b0001}, ${0b0001}, ${0b1001})[i]; }
      if (alpha <  7.5 / 16) { return array(${0b1001}u, ${0b1001}, ${0b0001}, ${0b1001})[i]; }
      if (alpha <  8.5 / 16) { return array(${0b1001}u, ${0b1001}, ${0b1001}, ${0b1001})[i]; }
      if (alpha <  9.5 / 16) { return array(${0b1011}u, ${0b1001}, ${0b1001}, ${0b1001})[i]; }
      if (alpha < 10.5 / 16) { return array(${0b1011}u, ${0b1001}, ${0b1001}, ${0b1011})[i]; }
      if (alpha < 11.5 / 16) { return array(${0b1011}u, ${0b1011}, ${0b1001}, ${0b1011})[i]; }
      if (alpha < 12.5 / 16) { return array(${0b1011}u, ${0b1011}, ${0b1011}, ${0b1011})[i]; }
      if (alpha < 13.5 / 16) { return array(${0b1111}u, ${0b1011}, ${0b1011}, ${0b1011})[i]; }
      if (alpha < 14.5 / 16) { return array(${0b1111}u, ${0b1011}, ${0b1011}, ${0b1111})[i]; }
      if (alpha < 15.5 / 16) { return array(${0b1111}u, ${0b1111}, ${0b1011}, ${0b1111})[i]; }
      return ${0b1111};
    }
  `.trimEnd(),
  'NVIDIA GeForce RTX 3070': `\
    fn emulatedAlphaToCoverage(alpha: f32, x: u32, y: u32) -> u32 {
      if (alpha < 0.5 / 4) { return ${0b0000}; }
      if (alpha < 1.5 / 4) { return ${0b1000}; }
      if (alpha < 2.5 / 4) { return ${0b1001}; }
      if (alpha < 3.5 / 4) { return ${0b1011}; }
      return ${0b1111};
    }
  `.trimEnd(),
};
