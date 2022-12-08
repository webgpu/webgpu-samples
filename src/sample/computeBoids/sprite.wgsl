@vertex
fn vert_main(
  @location(0) a_particlePos : vec2f,
  @location(1) a_particleVel : vec2f,
  @location(2) a_pos : vec2f
) -> @builtin(position) vec4f {
  let angle = -atan2(a_particleVel.x, a_particleVel.y);
  let pos = a_pos * mat2x2(cos(angle), -sin(angle), sin(angle), cos(angle));
  return vec4(pos + a_particlePos, 0, 1);
}

@fragment
fn frag_main() -> @location(0) vec4f {
  return vec4(1);
}
