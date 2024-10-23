struct Varying {
  @builtin(position) pos: vec4f,
  // Color from instance-step-mode vertex buffer
  @location(0) color: vec4f,
}

@vertex
fn vmain(
  @builtin(vertex_index) vertex_index: u32,
  @location(0) color: vec4f,
) -> Varying {
  var square = array(
    vec2f(-1, -1), vec2f(-1,  1), vec2f( 1, -1),
    vec2f( 1, -1), vec2f(-1,  1), vec2f( 1,  1),
  );

  return Varying(vec4(square[vertex_index], 0, 1), color);
}

struct FragOut {
  @location(0) color: vec4f,
  @builtin(sample_mask) mask: u32,
}

@fragment
fn fmain(vary: Varying) -> FragOut {
  let mask = emulatedAlphaToCoverage(vary.color.a, u32(vary.pos.x), u32(vary.pos.y));
  return FragOut(vec4f(vary.color.rgb, 1.0), mask);
}

