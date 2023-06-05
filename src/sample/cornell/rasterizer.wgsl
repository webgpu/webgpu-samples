// The lightmap data
@group(1) @binding(0) var lightmap : texture_2d_array<f32>;

// The sampler used to sample the lightmap
@group(1) @binding(1) var smpl : sampler;

// Vertex shader input data
struct VertexIn {
  @location(0) position : vec4f,
  @location(1) uv : vec3f,
  @location(2) emissive : vec3f,
}

// Vertex shader output data
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
  @location(1) emissive : vec3f,
  @interpolate(flat)
  @location(2) quad : u32,
}

@vertex
fn vs_main(input : VertexIn) -> VertexOut {
  var output : VertexOut;
  output.position = common_uniforms.mvp * input.position;
  output.uv = input.uv.xy;
  output.quad = u32(input.uv.z + 0.5);
  output.emissive = input.emissive;
  return output;
}

@fragment
fn fs_main(vertex_out : VertexOut) -> @location(0) vec4f {
  return textureSample(lightmap, smpl, vertex_out.uv, vertex_out.quad) + vec4f(vertex_out.emissive, 1);
}
