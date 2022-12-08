struct GBufferOutput {
  @location(0) position : vec4f,
  @location(1) normal : vec4f,

  // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
  @location(2) albedo : vec4f,
}

@fragment
fn main(
  @location(0) fragPosition: vec3f,
  @location(1) fragNormal: vec3f,
  @location(2) fragUV : vec2f
) -> GBufferOutput {
  // faking some kind of checkerboard texture
  let uv = floor(30 * fragUV);
  let c = 0.2 + 0.5 * ((uv.x + uv.y) - 2 * floor((uv.x + uv.y) / 2));

  var output : GBufferOutput;
  output.position = vec4(fragPosition, 1);
  output.normal = vec4(fragNormal, 1);
  output.albedo = vec4(vec3(c), 1);

  return output;
}
