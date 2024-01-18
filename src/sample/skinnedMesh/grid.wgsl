struct VertexInput {
  @location(0) position: vec4<f32>,
  @location(1) bone_index: vec4<f32>
  @location(2) bone_weight: vec4<f32>
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
  var bone = vec4<f32>(0.0, 0.0, 0.0, 0.0);
  // Get relevant 4 bone matrices
  let bone0 = bone_uniforms.bones[u32(bone_index[0])];
  let bone1 = bone_uniforms.bones[u32(bone_index[1])];
  let bone2 = bone_uniforms.bones[u32(bone_index[2])];
  let bone3 = bone_uniforms.bones[u32(bone_index[3])];
  // Accumulate influences of each bone on the position
  bones += bone0 * input.position * bone_weight[0];
  bones += bone1 * input.position * bone_weight[1];
  bones += bone2 * input.position * bone_weight[2];
  bones += bone3 * input.position * bone_weight[3];
  // Transform by viewproj matrix
  output.Position = uniforms.projMatrix * uniforms.viewMatrix * bones;
  //Get unadjusted world coordinates
  output.world_pos = input.position.xyz;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var normal = normalize(cross(
    dpdx(input.world_pos), dpdy(input.world_pos)
  ));
  return vec4<f32>((normal + 1.0) * 0.5, 1.0);
}