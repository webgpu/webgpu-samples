struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3f,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
  @location(0) shadowPos: vec3f,
  @location(1) fragPos: vec3f,
  @location(2) fragNorm: vec3f,

  @builtin(position) Position: vec4f,
}

@vertex
fn main(
  @location(0) position: vec3f,
  @location(1) normal: vec3f
) -> VertexOutput {
  var output : VertexOutput;

  // XY is in (-1, 1) space, Z is in (0, 1) space
  let posFromLight = scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1);

  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  output.shadowPos = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  output.Position = scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1);
  output.fragPos = output.Position.xyz;
  output.fragNorm = normal;
  return output;
}
