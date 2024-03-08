struct Uniforms {
  color0: vec4f,
  color1: vec4f,
  size: u32,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> @builtin(position) vec4f {
  const pos = array(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let grid = vec2u(position.xy) / uni.size;
  let checker = (grid.x + grid.y) % 2 == 1;
  return select(uni.color0, uni.color1, checker);
}

