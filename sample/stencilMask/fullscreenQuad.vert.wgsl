struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
}

struct Uniforms {
  offset_x: f32,
  offset_y: f32,
  radius_scale: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
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

  var output : VertexOutput;
  let mask_offset = vec2f(uniforms.offset_x, uniforms.offset_y);
  output.Position = vec4(
    pos[VertexIndex] / uniforms.radius_scale + mask_offset, 
    0.0, 
    1.0
  );
  output.fragUV = uv[VertexIndex];
  return output;
}
