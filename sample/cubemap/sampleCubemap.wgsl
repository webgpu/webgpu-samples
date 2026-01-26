@group(0) @binding(0) var<uniform> viewDirectionProjectionInverse: mat4x4f;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_cube<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) direction: vec4f,
};

@vertex
fn mainVS(
  @builtin(vertex_index) vertexIndex: u32
) -> VertexOutput {
  // A triangle large enough to cover all of clip space.
  let pos = array(
    vec2f(-1, -1),
    vec2f(-1,  3),
    vec2f( 3, -1),
  );
  let p = pos[vertexIndex];
  // We return the position twice. Once for @builtin(position)
  // Once for the fragment shader. The values in the fragment shader
  // will go from -1,-1 to 1,1 across the entire texture.
  return VertexOutput(
    vec4f(p, 0, 1),
    vec4f(p, -1, 1),
  );
}

@fragment
fn mainFS(
  in: VertexOutput,
) -> @location(0) vec4f {
  // orient the direction to the view
  let t = viewDirectionProjectionInverse * in.direction;
  // remove the perspective.
  let uvw = normalize(t.xyz / t.w);
  return textureSample(myTexture, mySampler, uvw);
}
