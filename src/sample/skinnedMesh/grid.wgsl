struct VertexInput {
  @location(0) vert_pos: vec2<f32>,
  @location(1) bone_index: vec4<f32>,
  @location(2) bone_weight: vec4<f32>
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) world_pos: vec3<f32>,
}

struct CameraUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct BoneUniforms {
  bones: array<mat4x4<f32>, 4>,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> bone_uniforms: BoneUniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  var bones = vec4<f32>(0.0, 0.0, 0.0, 0.0);
  let position = vec4<f32>(input.vert_pos.x, input.vert_pos.y, 0.0, 1.0);
  // Get relevant 4 bone matrices
  let bone0 = bone_uniforms.bones[u32(input.bone_index[0])];
  let bone1 = bone_uniforms.bones[u32(input.bone_index[1])];
  let bone2 = bone_uniforms.bones[u32(input.bone_index[2])];
  let bone3 = bone_uniforms.bones[u32(input.bone_index[3])];
  // Accumulate influences of each bone on the position
  bones += bone0 * position * input.bone_weight[0];
  bones += bone1 * position * input.bone_weight[1];
  bones += bone2 * position * input.bone_weight[2];
  bones += bone3 * position * input.bone_weight[3];
  // Transform by viewproj matrix
  //output.Position = camera_uniforms.projMatrix * camera_uniforms.viewMatrix * bones;
  output.Position = camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * position;
  //Get unadjusted world coordinates
  output.world_pos = position.xyz;
  return output;
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var normal = normalize(cross(
    dpdx(input.world_pos), dpdy(input.world_pos)
  ));
  return vec4<f32>(255.0, 0.0, 1.0, 1.0);
  //return vec4<f32>((normal + 1.0) * 0.5, 1.0);
}