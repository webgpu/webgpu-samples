@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_external;

@stage(fragment)
fn main(@location(0) fragUV : vec2<f32>) -> @location(0) vec4<f32> {
  return textureSampleLevel(myTexture, mySampler, fragUV);
}
