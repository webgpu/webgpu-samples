@fragment
fn main(@location(0) cell: f32) -> @location(0) vec4f {
  return vec4f(cell, cell, cell, 1.);
}
