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
  line_width: f32,
  canvas_width: f32,
  canvas_height: f32,
}

fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

/*fn inverseLerp(val: f32, minValue: f32, maxValue: f32) -> f32 {
  return (val - minValue) / (maxValue - minValue);
}

fn remap(val: f32, inMin: f32, inMax: f32, outMin: f32, outMax: f32) -> f32 {
  let t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

fn BackgroundColor() {
  let dist_from_center = length(abs(input.v_uv - 0.5));
  return vec4<f32>(0.0, 0.0, 0.0, 1.0);
} */

// Uniform Buffers
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn drawGrid(
  uv: vec2<f32>,
  color: vec3<f32>, 
  line_color: vec3<f32>,
  line_width: f32,
  cell_spacing: f32,
) -> vec3<f32> {
  let center: vec2<f32> = vec2<f32>(uv.x - 0.5, uv.y - 0.5);
  let resolution = vec2<f32>(uniforms.canvas_width, uniforms.canvas_height);
  var cells = abs(
    fract(
      center * resolution / vec2<f32>(cell_spacing, cell_spacing)
    ) - 0.5
  );
  let dstToEdge = (0.5 - max(cells.x, cells.y)) * cell_spacing;
  let lines = smoothstep(0.0, line_width, dstToEdge);
  let new_color = mix(
    line_color, color, lines
  );
  return new_color;
}

const RED = vec3<f32>(255.0, 0.0, 0.0);
const BLACK = vec3<f32>(0.0, 0.0, 0.0);
const WHITE = vec3<f32>(255.0, 255.0, 255.0);

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let half_width = uniforms.bb_width * 0.5;
  let half_height = uniforms.bb_height * 0.5;

  let pos = array(
    vec2( half_width,  half_height),
    vec2(-half_width, -half_height),
    vec2(-half_width,  half_height),
    vec2( half_width,  half_height),
    vec2( half_width, -half_height),
    vec2(-half_width, -half_height),
  );

  let uv = array(
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
  let color: vec3<f32> = drawGrid(
    input.v_uv,
    vec3<f32>(255.0, 0.0, 0.0),
    vec3<f32>(0.0, 255.0, 0.0),
    uniforms.line_width,
    uniforms.cell_size,
  );
  return vec4<f32>(color, 0.0);
}