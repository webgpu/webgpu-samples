struct Scene {
  lightViewProjMatrix: mat4x4<f32>,
  cameraViewProjMatrix: mat4x4<f32>,
  lightPos: vec3<f32>,
}

struct Model {
  modelMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
  @location(0) shadowPos: vec3<f32>,
  @location(1) fragPos: vec3<f32>,
  @location(2) fragNorm: vec3<f32>,

  @builtin(position) Position: vec4<f32>,
}

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>
) -> VertexOutput {
  var output : VertexOutput;

  // XY is in (-1, 1) space, Z is in (0, 1) space
  let posFromLight = scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);

  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  output.shadowPos = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  output.Position = scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  output.fragPos = output.Position.xyz;
  output.fragNorm = normal;
  return output;
}
