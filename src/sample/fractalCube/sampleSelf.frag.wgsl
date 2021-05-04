[[binding(1), group(0)]] var mySampler: sampler;
[[binding(2), group(0)]] var myTexture: texture_2d<f32>;

[[stage(fragment)]]
fn main([[location(0)]] fragUV: vec2<f32>,
        [[location(1)]] fragPosition: vec4<f32>) -> [[location(0)]] vec4<f32> {
  var texColor : vec4<f32> = textureSample(myTexture, mySampler, fragUV * 0.8 + vec2<f32>(0.1, 0.1));
  var f : f32;
  if (length(texColor.rgb - vec3<f32>(0.5, 0.5, 0.5)) < 0.01) {
    f = 1.0;
  } else {
    f = 0.0;
  }
  return (1.0 - f) * texColor + f * fragPosition;
}
