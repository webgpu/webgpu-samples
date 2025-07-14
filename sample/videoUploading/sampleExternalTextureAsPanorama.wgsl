struct Uniforms {
  viewDirectionProjectionInverse: mat4x4f,
  targetSize: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VSOutput {
  let pos = array(
    vec2f(-1, -1),
    vec2f(-1,  3),
    vec2f( 3, -1),
  );

  let xy = pos[vertexIndex];
  return VSOutput(
      vec4f(xy, 0.0, 1.0),
      xy * vec2f(0.5, -0.5) + vec2f(0.5)
  );
}

@group(0) @binding(1) var panoramaSampler: sampler;
@group(0) @binding(2) var panoramaTexture: texture_external;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

const PI = radians(180.0);
@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let pos = position.xy / uniforms.targetSize * 2.0 - 1.0;
  let t = uniforms.viewDirectionProjectionInverse * vec4f(pos, 0, 1);
  let dir = normalize(t.xyz / t.w);

  let longitude = atan2(dir.z, dir.x);
  let latitude = asin(dir.y / length(dir));

  let uv = vec2f(
    longitude / (2.0 * PI) + 0.5,
    latitude / PI + 0.5,
  );

  return textureSampleBaseClampToEdge(panoramaTexture, panoramaSampler, uv);
}
