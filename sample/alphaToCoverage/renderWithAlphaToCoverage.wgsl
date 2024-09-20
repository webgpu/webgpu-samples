struct Config {
  alpha: f32,
};
@group(0) @binding(0) var<uniform> config: Config;

struct Varying {
  @builtin(position) pos: vec4f,
}

@vertex
fn vmain(
  @builtin(vertex_index) vertex_index: u32,
) -> Varying {
  var square = array(
    vec2f(-1, -1), vec2f(-1,  1), vec2f( 1, -1),
    vec2f( 1, -1), vec2f(-1,  1), vec2f( 1,  1),
  );

  return Varying(vec4(square[vertex_index], 0, 1));
}

@fragment
fn fmain(vary: Varying) -> @location(0) vec4f {
  return vec4f(1, 1, 1, config.alpha);
}

