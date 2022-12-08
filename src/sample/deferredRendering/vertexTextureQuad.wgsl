@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  const pos = array(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1,  1), vec2f(1, -1), vec2f( 1, 1),
  );

  return vec4f(pos[VertexIndex], 0, 1);
}
