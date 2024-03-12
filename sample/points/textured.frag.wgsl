struct VSOutput {
  @location(0) texcoord: vec2f,
};

@group(0) @binding(1) var s: sampler;
@group(0) @binding(2) var t: texture_2d<f32>;

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  let color = textureSample(t, s, vsOut.texcoord);
  if (color.a < 0.1) {
    discard;
  }
  return color;
}
