@fragment
fn main(@location(0) cell: f32) -> @location(0) vec4<f32> {
  return vec4<f32>(cell, cell, cell, 1.);
}
