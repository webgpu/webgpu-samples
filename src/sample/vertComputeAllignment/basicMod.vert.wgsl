struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn main(
  // Note: Render pass is able to properly access vec3s, though compute shader cannot
  @location(0) position : vec3<f32>,
  @location(1) uv : vec2<f32>
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * vec4<f32>(position, 1.0);
  output.fragUV = uv;
  output.fragPosition = 0.5 * (vec4<f32>(position, 1.0) + vec4(1.0, 1.0, 1.0, 1.0));
  return output;
}