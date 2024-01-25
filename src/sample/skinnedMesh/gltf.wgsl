// Whale.glb Vertex attributes
// POSTION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0
// f32x3    f32x3   f32x2       u8x4       f32x4
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) texcoord: vec2<f32>,
  @location(3) joints: vec4<u32>,
  @location(4) weights: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) joints: vec4<f32>,
  @location(2) weights: vec4<f32>,
}

struct CameraUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32
}

struct NodeUniforms {
  worldMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<uniform> node_uniforms: NodeUniforms;
@group(3) @binding(1) var<uniform> joint_matrices: array<mat4x4<f32>, 6>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let skin_matrix = 
    joint_matrices[input.joints[0]] * input.weights[0] +
    joint_matrices[input.joints[1]] * input.weights[1] +
    joint_matrices[input.joints[2]] * input.weights[2] +
    joint_matrices[input.joints[3]] * input.weights[3];
  output.Position = camera_uniforms.projMatrix * camera_uniforms.viewMatrix * skin_matrix * vec4<f32>(input.position.x, input.position.y, input.position.z, 1.0);
  output.normal = input.normal;
  output.joints = vec4<f32>(f32(input.joints[0]), f32(input.joints[1]), f32(input.joints[2]), f32(input.joints[3]));
  // Convert to f32 to avoid flat interpolation error
  output.weights = input.weights;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  switch general_uniforms.render_mode {
    case 1: {
      return input.joints;
    } 
    case 2: {
      return input.weights;
    }
    default: {
      return vec4<f32>(input.normal, 1.0);
    }
  }
}