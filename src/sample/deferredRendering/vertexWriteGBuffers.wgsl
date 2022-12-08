struct Uniforms {
  modelMatrix : mat4x4<f32>,
  normalModelMatrix : mat4x4<f32>,
}
struct Camera {
  viewProjectionMatrix : mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> camera : Camera;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragPosition: vec3f,  // position in world space
  @location(1) fragNormal: vec3f,    // normal in world space
  @location(2) fragUV: vec2f,
}

@vertex
fn main(
  @location(0) position : vec3f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f
) -> VertexOutput {
  var output : VertexOutput;
  output.fragPosition = (uniforms.modelMatrix * vec4(position, 1)).xyz;
  output.Position = camera.viewProjectionMatrix * vec4(output.fragPosition, 1);
  output.fragNormal = normalize((uniforms.normalModelMatrix * vec4(normal, 1)).xyz);
  output.fragUV = uv;
  return output;
}
