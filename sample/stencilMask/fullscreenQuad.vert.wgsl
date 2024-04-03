struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
}

struct Uniforms {
  offset_x: f32,
  offset_y: f32,
  radius_scale: f32,
  sdf_id: u32,
  scale_to_canvas_x: f32,
  scale_to_canvas_y:f32,
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
  // scale_to_canvas is effectively a transformation that takes our quad positions from NDC space to canvas space.
  let scale_to_canvas = vec2<f32>(uniforms.scale_to_canvas_x, uniforms.scale_to_canvas_y);
  let posCS = pos[VertexIndex] * scale_to_canvas;
  let offsetCS = mask_offset * scale_to_canvas;
  output.Position = vec4(
    posCS * uniforms.radius_scale + offsetCS, 
    0.0, 
    1.0
  );
  output.fragUV = uv[VertexIndex];
  return output;
}
