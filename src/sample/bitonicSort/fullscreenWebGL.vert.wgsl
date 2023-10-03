struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@vertex
fn vertexMain(
  @builtin(vertex_index) VertexIndex : u32,
) -> VertexOutput {
  var output: VertexOutput;
  const pos = array(
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0,  1.0),
  );

  //Calculates uvs with y direction up, as is the case for WebGL I believe
  const uv = array(
    pos[0] * 0.5 + 0.5,
    pos[1] * 0.5 + 0.5,
    pos[2] * 0.5 + 0.5,
    pos[3] * 0.5 + 0.5,
    pos[4] * 0.5 + 0.5,
    pos[5] * 0.5 + 0.5,
  );

  output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  output.v_uv = uv[VertexIndex];
  return output;
}
