[[block]] struct Uniforms {
  modelMatrix : mat4x4<f32>;
  normalModelMatrix : mat4x4<f32>;
};
[[block]] struct Camera {
  viewProjectionMatrix : mat4x4<f32>;
};
[[group(0), binding(0)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(1)]] var<uniform> camera : Camera;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragPosition: vec3<f32>;  // position in world space
  [[location(1)]] fragNormal: vec3<f32>;    // normal in world space
  [[location(2)]] fragUV: vec2<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec3<f32>,
        [[location(1)]] normal : vec3<f32>,
        [[location(2)]] uv : vec2<f32>) -> VertexOutput {
  var output : VertexOutput;
  output.fragPosition = (uniforms.modelMatrix * vec4<f32>(position, 1.0)).xyz;
  output.Position = camera.viewProjectionMatrix * vec4<f32>(output.fragPosition, 1.0);
  output.fragNormal = normalize((uniforms.normalModelMatrix * vec4<f32>(normal, 1.0)).xyz);
  output.fragUV = uv;
  return output;
}