fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

struct Particle {
  color: vec3<f32>,
  position: vec2<f32>,
  velocity: vec2<f32>,
}

@group(0) @binding(0) var<uniform> ballUniforms: BallUniforms;
@group(1) @binding(0) var<storage, read> input_particles: array<Particle>;

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
  var posCS = pos[input.VertexIndex] / vec2<f32>(ballUniforms.canvasWidth, ballUniforms.canvasHeight);
  var offset = input_particles[input.InstanceIndex].position;
  var offsetCS = offset / vec2<f32>(ballUniforms.canvasWidth, ballUniforms.canvasHeight);

  //ballUniforms.radius should be clamped to the height
  output.Position = vec4<f32>(
    posCS * ballUniforms.radius + offsetCS, 
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