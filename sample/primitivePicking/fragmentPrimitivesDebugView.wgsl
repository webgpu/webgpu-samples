@group(0) @binding(0) var primitiveTex: texture_2d<u32>;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  // Load the primitive index for this pixel from the picking texture.
  let primitiveIndex = textureLoad(primitiveTex, vec2i(floor(coord.xy)), 0).x;
  var result : vec4f;

  // Generate a color for the primitive index. If we only increment the color
  // channels by 1 for each primitive index we can show a very large range of
  // unique values but it can make the individual primitives hard to distinguish.
  // This code steps through 8 distinct values per-channel, which may end up
  // repeating some colors for larger meshes but makes the unique primitive
  // index values easier to see.
  result.r = f32(primitiveIndex % 8) / 8;
  result.g = f32((primitiveIndex / 8) % 8) / 8;
  result.b = f32((primitiveIndex / 64) % 8) / 8;
  result.a = 1.0;
  return result;
}
