@group(0) @binding(0) var primitiveTex: texture_2d<u32>;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  let primitiveIndex = textureLoad(primitiveTex, vec2i(floor(coord.xy)), 0).x;
  var result : vec4f;
  result.r = f32(primitiveIndex % 8) / 8;
  result.g = f32((primitiveIndex / 8) % 8) / 8;
  result.b = f32((primitiveIndex / 64) % 8) / 8;
  result.a = 1.0;
  return result;
}
