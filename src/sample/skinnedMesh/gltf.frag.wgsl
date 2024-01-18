struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) world_pos: vec3<f32>,
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var normal = normalize(cross(
    dpdx(input.world_pos), dpdy(input.world_pos)
  ));
  return vec4<f32>((normal + 1.0) * 0.5, 1.0);
}