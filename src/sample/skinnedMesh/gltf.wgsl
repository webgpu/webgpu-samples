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
  proj_matrix: mat4x4f,
  view_matrix: mat4x4f,
  model_matrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32,
  skin_mode: u32,
}

struct NodeUniforms {
  world_matrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<uniform> node_uniforms: NodeUniforms;
// Note that size of each of the matrix arrays below is equal to size of the number of inverseBindMatrices/joints defined in our whale glb object.
// As such, this shader can not be applied to any gltf object, as each skinned gltf object contains a different number of joints.
// Ways this shader can be made more generalizable include:
//    a. Making our shader a constructable string returned from a function that takes the skin's current number of joints as an argument.
//       For example, converting array<mat4x4f, 6> to return `array<mat4x4f, ${numJoints}`
//    b. Converting our uniform matrices buffers into storage buffers of variable size
//       joint_matrices: var<uniform> joint_matrices -> var<storage, read> joint_matrices
//    c. Reading our matrix data in as a texture
// However, for this limited, single object example, the current approach works fine, and these considerations are only
// necessary in the context of a more robust gltf parser/shader package.
@group(3) @binding(0) var<uniform> joint_matrices: array<mat4x4<f32>, 6>;
@group(3) @binding(1) var<uniform> inverse_bind_matrices: array<mat4x4<f32>, 6>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  // Compute joint_matrices * inverse_bind_matrices
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
  // Position of the vertex relative to our world
  let world_position = vec4<f32>(input.position.x, input.position.y, input.position.z, 1.0);
  // Vertex position with model rotation, skinning, and the mesh's node transformation applied.
  let skinned_position = camera_uniforms.model_matrix * skin_matrix * node_uniforms.world_matrix * world_position;
  // Vertex position with only the model rotation applied.
  let rotated_position = camera_uniforms.model_matrix * world_position;
  // Determine which position to used based on whether skinMode is turnd on or off.
  let transformed_position = select(
    rotated_position,
    skinned_position,
    general_uniforms.skin_mode == 0
  );
  // Apply the camera and projection matrix transformations to our transformed position;
  output.Position = camera_uniforms.proj_matrix * camera_uniforms.view_matrix * transformed_position;
  output.normal = input.normal;
  // Convert u32 joint data to f32s to prevent flat interpolation error.
  output.joints = vec4<f32>(f32(input.joints[0]), f32(input.joints[1]), f32(input.joints[2]), f32(input.joints[3]));
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