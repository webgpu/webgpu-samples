@group(1) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
  @builtin(position) coord: vec4f,
  @location(0) clipPos: vec4f
) -> @location(0) vec4f {
  let depthValue = textureLoad(depthTexture, vec2i(floor(coord.xy)), 0);
  let v : f32 = abs(clipPos.z / clipPos.w - depthValue) * 2000000.0;
  return vec4f(v, v, v, 1);
}
