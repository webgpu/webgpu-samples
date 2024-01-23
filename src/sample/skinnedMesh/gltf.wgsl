struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) joints: vec4<f32>,
  @location(3) weights: vec4<u32>,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) joints: vec4<f32>,
}

struct Uniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.Position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * vec4<f32>(input.position.x, input.position.y, input.position.z, 1.0);
  output.normal = input.normal;
  output.joints = input.joints;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //return vec4<f32>(input.normal, 1.0);
  return input.joints;
}