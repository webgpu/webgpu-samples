[[block]] struct Scene {
  lightViewProjMatrix : mat4x4<f32>;
  cameraViewProjMatrix : mat4x4<f32>;
  lightPos : vec3<f32>;
};

[[block]] struct Model {
  modelMatrix : mat4x4<f32>;
};

[[group(0), binding(0)]] var<uniform> scene : Scene;
[[group(1), binding(0)]] var<uniform> model : Model;

[[stage(vertex)]]
fn main([[location(0)]] position : vec3<f32>)
     -> [[builtin(position)]] vec4<f32> {
  return scene.lightViewProjMatrix * model.modelMatrix * vec4<f32>(position, 1.0);
}
