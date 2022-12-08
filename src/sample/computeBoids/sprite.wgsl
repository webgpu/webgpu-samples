@vertex
fn vert_main(
  @location(0) a_particlePos : vec2f,
  @location(1) a_particleVel : vec2f,
  @location(2) a_pos : vec2f
) -> @builtin(position) vec4f {
  let angle = -atan2(a_particleVel.x, a_particleVel.y);
  let pos = vec2(
    (a_pos.x * cos(angle)) - (a_pos.y * sin(angle)),
    (a_pos.x * sin(angle)) + (a_pos.y * cos(angle))
  );
  return vec4(pos + a_particlePos, 0.0, 1.0);
}

@fragment
fn frag_main() -> @location(0) vec4f {
  return vec4(1.0, 1.0, 1.0, 1.0);
}
