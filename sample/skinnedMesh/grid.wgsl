struct VertexInput {
  @location(0) vert_pos: vec2f,
  @location(1) joints: vec4u,
  @location(2) weights: vec4f
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) world_pos: vec3f,
  @location(1) joints: vec4f,
  @location(2) weights: vec4f,
}

struct CameraUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32,
  skin_mode: u32,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<storage, read> joint_matrices: array<mat4x4f>;
@group(2) @binding(1) var<storage, read> inverse_bind_matrices: array<mat4x4f>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  var bones = vec4f(0.0, 0.0, 0.0, 0.0);
  let position = vec4f(input.vert_pos.x, input.vert_pos.y, 0.0, 1.0);
  // Get relevant 4 bone matrices
  let joint0 = joint_matrices[input.joints[0]] * inverse_bind_matrices[input.joints[0]];
  let joint1 = joint_matrices[input.joints[1]] * inverse_bind_matrices[input.joints[1]];
  let joint2 = joint_matrices[input.joints[2]] * inverse_bind_matrices[input.joints[2]];
  let joint3 = joint_matrices[input.joints[3]] * inverse_bind_matrices[input.joints[3]];
  // Compute influence of joint based on weight
  let skin_matrix = 
    joint0 * input.weights[0] +
    joint1 * input.weights[1] +
    joint2 * input.weights[2] +
    joint3 * input.weights[3];
  // Bone transformed mesh
  output.Position = select(
    camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * position,
    camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * skin_matrix * position,
    general_uniforms.skin_mode == 0
  );

  //Get unadjusted world coordinates
  output.world_pos = position.xyz;
  output.joints = vec4f(f32(input.joints.x), f32(input.joints.y), f32(input.joints.z), f32(input.joints.w));
  output.weights = input.weights;
  return output;
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  switch general_uniforms.render_mode {
    case 1: {
      return input.joints;
    }
    case 2: {
      return input.weights;
    }
    default: {
      return vec4f(255.0, 0.0, 1.0, 1.0); 
    }
  }
}