@group(0) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
  @builtin(position) coord : vec4<f32>
) -> @location(0) vec4<f32> {
  let depthValue = textureLoad(depthTexture, vec2<i32>(floor(coord.xy)), 0);
  return vec4<f32>(depthValue, depthValue, depthValue, 1.0);
}
