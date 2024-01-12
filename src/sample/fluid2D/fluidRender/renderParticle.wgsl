struct VertexInput {
  @builtin(vertex_index) VertexIndex: u32,
  @builtin(instance_index) InstanceIndex: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) v_uv: vec2<f32>,
}

struct RenderUniforms {
  radius: f32,
  zoom_scale_x: f32,
  zoom_scale_y: f32,
  bounding_box_size: f32,
  camera_offset: f32,
}

fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

// Storage Buffers
@group(0) @binding(0) var<storage, read> input_positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> input_velocities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> uniforms: RenderUniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  const pos = array(
    vec2( 1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0,  1.0),
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0, -1.0),
  );

  const uv = array(
    vec2( 1.0,  -1.0),
    vec2(-1.0, 1.0),
    vec2(-1.0,  -1.0),
    vec2( 1.0,  -1.0),
    vec2( 1.0, 1.0),
    vec2(-1.0, 1.0),
  );

  //Convert position and offset to canvasSpace
  let zoomScale = vec2<f32>(uniforms.zoom_scale_x, uniforms.zoom_scale_y);
  let posCS = pos[input.VertexIndex] * zoomScale;
  let particleOffset = input_positions[input.InstanceIndex];
  let particleOffsetCS = particleOffset * zoomScale;
  let cameraOffset = vec2<f32>(
    uniforms.bounding_box_size * 0.5,
    uniforms.bounding_box_size * 0.5,
  ) + vec2<f32>(uniforms.camera_offset, 0.0);
  let cameraOffsetCS = cameraOffset * zoomScale;
  //ballUniforms.radius should be clamped to the height
  output.Position = vec4<f32>(
    //Subtract by 1.0, 1.0 to make origin lower left corner of canvas
    posCS * uniforms.radius + particleOffsetCS - cameraOffsetCS, 
    0.0, 
    1.0
  );
  output.v_uv = uv[input.VertexIndex];
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var d: f32 = sdfCircle(
    vec2<f32>(input.v_uv.x, input.v_uv.y), 1.0
  );
  var blue = vec3<f32>(0.65, 0.85, 1.0);
  if (d > 0.0) {
    discard;
  }
  return vec4<f32>(blue, 1.0);
}