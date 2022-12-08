@binding(1) @group(0) var mySampler: sampler;
@binding(2) @group(0) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2f,
  @location(1) fragPosition: vec4f
) -> @location(0) vec4f {
  let texColor = textureSample(myTexture, mySampler, fragUV * 0.8 + vec2(0.1));
  let f = select(1f, 0f, length(texColor.rgb - vec3(0.5)) < 0.01);
  return f * texColor + (1 - f) * fragPosition;
}
