struct VertexInput {
  @builtin(vertex_index) VertexIndex: u32,
  @builtin(instance_index) InstanceIndex: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) v_uv: vec2<f32>,
  @location(1) particle_density: f32,
}

struct ParticleUniforms {
  radius: f32,
  canvas_width: f32,
  canvas_height: f32,
  target_density: f32,
}

fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

fn inverseLerp(val: f32, minVal: f32, maxVal: f32) -> f32 {
  return (val - minVal) / (maxVal - minVal);
}

fn remap(
  val: f32,
  inputMin: f32,
  inputMax: f32,
  outputMin: f32,
  outputMax: f32,
) -> f32 {
  var t: f32 = inverseLerp(val, inputMin, inputMax);
  return mix(outputMin, outputMax, t);
}

// Storage Buffers
@group(0) @binding(0) var<storage, read> input_positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> input_densities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> particle_uniforms: ParticleUniforms;

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
  var posCS = pos[input.VertexIndex] / vec2<f32>(particle_uniforms.canvas_width, particle_uniforms.canvas_height);
  var offset = input_positions[input.InstanceIndex];
  var offsetCS = offset / vec2<f32>(particle_uniforms.canvas_width, particle_uniforms.canvas_height);

  //ballUniforms.radius should be clamped to the height
  output.Position = vec4<f32>(
    posCS * particle_uniforms.radius + offsetCS, 
    0.0, 
    1.0
  );
  output.v_uv = uv[input.VertexIndex];
  output.particle_density = input_densities[input.InstanceIndex].x;
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var d: f32 = sdfCircle(
    vec2<f32>(input.v_uv.x, input.v_uv.y), 1.0
  );
  let current_density = particle_uniforms.target_density - input.particle_density;
  // "normalized"
  let normalized_density = remap(current_density, -particle_uniforms.target_density, particle_uniforms.target_density, -1.0, 1.0);
  let color = select(
    vec3<f32>(1.0, abs(normalized_density), 1.0),
    vec3<f32>(normalized_density, 1.0, 1.0),
    normalized_density > 0.0
  );
  if (d > 0.0) {
    discard;
  }
  return vec4<f32>(color, 1.0);
}