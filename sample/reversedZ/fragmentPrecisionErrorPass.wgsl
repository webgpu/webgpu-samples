@group(1) @binding(0) var depthTexture: texture_depth_2d;

@fragment
fn main(
  @builtin(position) coord: vec4<f32>,
  @location(0) clipPos: vec4<f32>
) -> @location(0) vec4<f32> {
  let depthValue = textureLoad(depthTexture, vec2<i32>(floor(coord.xy)), 0);
  let v : f32 = abs(clipPos.z / clipPos.w - depthValue) * 2000000.0;
  return vec4<f32>(v, v, v, 1.0);
}
