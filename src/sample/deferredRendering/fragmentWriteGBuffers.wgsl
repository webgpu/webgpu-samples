struct GBufferOutput {
  [[location(0)]] position : vec4<f32>;
  [[location(1)]] normal : vec4<f32>;

  // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
  [[location(2)]] albedo : vec4<f32>;
};

[[stage(fragment)]]
fn main([[location(0)]] fragPosition: vec3<f32>,
        [[location(1)]] fragNormal: vec3<f32>,
        [[location(2)]] fragUV : vec2<f32>) -> GBufferOutput {
    var output : GBufferOutput;
    output.position = vec4<f32>(fragPosition, 1.0);
    output.normal = vec4<f32>(fragNormal, 1.0);
    // faking some kind of checkerboard texture
    var uv : vec2<f32> = floor(30.0 * fragUV);
    var c: f32 = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
    output.albedo = vec4<f32>(c, c, c, 1.0);
    return output;
}