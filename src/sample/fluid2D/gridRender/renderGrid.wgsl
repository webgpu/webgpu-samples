struct VertexInput {
  @builtin(vertex_index) VertexIndex: u32,
  @builtin(instance_index) InstanceIndex: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) v_uv: vec2<f32>,
}

struct Uniforms {
  // Bounding Box Width
  bb_width: f32,
  bb_height: f32,
  zoom_scale_x: f32,
  zoom_scale_y: f32,
  cell_size: f32,
}

fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

// Uniform Buffers
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let half_width = bb_width * 0.5;
  let half_height = bb_height * 0.5;

  const pos = array(
    vec2( half_width,  half_height),
    vec2(-half_width, -half_height),
    vec2(-half_width,  half_height),
    vec2( half_width,  half_height),
    vec2( half_width, -half_height),
    vec2(-half_width, -half_height),
  );

  const uv = array(
    vec2( half_width,  -half_height),
    vec2(-half_width, half_height),
    vec2(-half_width,  -half_height),
    vec2( half_width,  -half_height),
    vec2( half_width, half_height),
    vec2(-half_width, half_height),
  );

  //Convert position to canvasSpace
  let posCS = pos[input.VertexIndex] * vec2<f32>(uniforms.zoom_scale_x, uniforms.zoom_scale_y);

  //ballUniforms.radius should be clamped to the height
  output.Position = vec4<f32>(
    posCS, 
    0.0, 
    1.0
  );
  output.v_uv = uv[input.VertexIndex];
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  return vec4<f32>(0.0, 255.0, 0.0, 1.0);
}