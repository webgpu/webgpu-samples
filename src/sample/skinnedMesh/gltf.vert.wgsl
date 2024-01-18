struct VertexInput {
  @location(0) position: vec3f,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) world_pos: vec3<f32>,
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
  //Get unadjusted world coordinates
  output.world_pos = input.position.xyz;
  return output;
}