@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_external;
@group(0) @binding(3) var<uniform> myMatrix: mat3x3f;

@fragment
fn main(@location(0) fragUV : vec2f) -> @location(0) vec4f {
  let uv = (myMatrix * vec3f(fragUV, 1.0)).xy;
  return textureSampleBaseClampToEdge(myTexture, mySampler, uv);
}
