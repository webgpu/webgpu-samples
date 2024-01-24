struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) joints: vec4<f32>,
  @location(3) weights: vec4<u32>,
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

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.Position = camera_uniforms.projMatrix * camera_uniforms.viewMatrix * node_uniforms.worldMatrix * vec4<f32>(input.position.x, input.position.y, input.position.z, 1.0);
  output.normal = input.normal;
  output.joints = input.joints;
  // Convert to f32 to avoid flat interpolation error
  output.weights = vec4<f32>(f32(input.weights.x), f32(input.weights.y), f32(input.weights.z), f32(input.weights.w));
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