@stage(vertex)
fn main(@builtin(vertex_index) VertexIndex : u32)
     -> @builtin(position) vec4<f32> {
  var pos : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
