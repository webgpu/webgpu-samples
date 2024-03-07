struct Uniforms {
  modelMatrix : array<mat4x4<f32>, 5>,
}
struct Camera {
  viewProjectionMatrix : mat4x4<f32>,
}

@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var<uniform> camera : Camera;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) clipPos : vec4<f32>,
}

@vertex
fn main(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4<f32>
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = camera.viewProjectionMatrix * uniforms.modelMatrix[instanceIdx] * position;
  output.clipPos = output.Position;
  return output;
}
