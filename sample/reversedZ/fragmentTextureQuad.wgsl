@group(0) @binding(0) var depthTexture: texture_2d<f32>;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  let depthValue = textureLoad(depthTexture, vec2i(floor(coord.xy)), 0).x;
  return vec4f(depthValue, depthValue, depthValue, 1.0);
}
