struct Uniforms {
  modelMatrix : mat4x4f,
  normalModelMatrix : mat4x4f,
}
struct Frame {
  viewProjectionMatrix : mat4x4f,
  invViewProjectionMatrix : mat4x4f,
  pickCoord : vec2u,
  pickedPrimitive : u32,
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var<uniform> frame : Frame;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragNormal : vec3f, // normal in world space
}

@vertex
fn main(
  @location(0) position : vec3f,
  @location(1) normal : vec3f,
) -> VertexOutput {
  var output : VertexOutput;
  let worldPosition = (uniforms.modelMatrix * vec4(position, 1.0)).xyz;
  output.Position = frame.viewProjectionMatrix * vec4(worldPosition, 1.0);
  output.fragNormal = normalize((uniforms.normalModelMatrix * vec4(normal, 1.0)).xyz);
  return output;
}
