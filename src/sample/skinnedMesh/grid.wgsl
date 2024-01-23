struct VertexInput {
  @location(0) vert_pos: vec2<f32>,
  @location(1) bone_index: vec4<f32>,
  @location(2) bone_weight: vec4<f32>
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) world_pos: vec3<f32>,
  @location(1) bone_index: vec4<f32>,
  @location(2) bone_weight: vec4<f32>,
}

struct CameraUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct GeneralUniforms {
  render_mode: u32,
}

struct BoneUniforms {
  // B0, B1, B2, B3
  bones: array<mat4x4<f32>, 5>,
}

@group(0) @binding(0) var<uniform> camera_uniforms: CameraUniforms;
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(0) var<uniform> bone_uniforms: BoneUniforms;

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
  // Bone transformed mesh
  output.Position = 
    camera_uniforms.projMatrix * 
    camera_uniforms.viewMatrix * 
    camera_uniforms.modelMatrix *
    (bone0 * position * input.bone_weight[0] +
     bone1 * position * input.bone_weight[1] +
     bone2 * position * input.bone_weight[2] +
     bone3 * position * input.bone_weight[3]);

  // Normal, unaffected mesh
  //output.Position = camera_uniforms.projMatrix * camera_uniforms.viewMatrix * camera_uniforms.modelMatrix * position;
  //Get unadjusted world coordinates
  output.world_pos = position.xyz;
  output.bone_index = input.bone_index;
  output.bone_weight = input.bone_weight;
  return output;
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  switch general_uniforms.render_mode {
    case 1: {
      return input.bone_index;
    }
    case 2: {
      return input.bone_weight;
    }
    default: {
      return vec4<f32>(255.0, 0.0, 1.0, 1.0); 
    }
  }
}