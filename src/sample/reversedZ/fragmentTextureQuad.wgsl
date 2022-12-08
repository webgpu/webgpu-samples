@group(0) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  let depthValue = textureLoad(depthTexture, vec2i(floor(coord.xy)), 0);
  return vec4f(depthValue, depthValue, depthValue, 1);
}
