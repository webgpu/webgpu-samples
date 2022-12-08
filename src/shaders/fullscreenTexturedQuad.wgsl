@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) fragUV : vec2f,
}

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  const pos = array(
    vec2f( 1,  1), vec2f( 1, -1), vec2f(-1, -1),
    vec2f( 1,  1), vec2f(-1, -1), vec2f(-1,  1),
  );

  const uv = array(
    vec2f(1, 0), vec2f(1, 1), vec2f(0, 1),
    vec2f(1, 0), vec2f(0, 1), vec2f(0, 0),
  );

  var output : VertexOutput;
  output.Position = vec4(pos[VertexIndex], 0, 1);
  output.fragUV = uv[VertexIndex];
  return output;
}

@fragment
fn frag_main(@location(0) fragUV : vec2f) -> @location(0) vec4f {
  return textureSample(myTexture, mySampler, fragUV);
}
