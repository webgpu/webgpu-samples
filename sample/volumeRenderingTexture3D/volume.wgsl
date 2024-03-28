struct Uniforms {
  inverseModelViewProjectionMatrix : mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_3d<f32>;

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) near : vec3f,
  @location(1) step : vec3f,
}

const NumSteps = 64u;

@vertex
fn vertex_main(
  @builtin(vertex_index) VertexIndex : u32
) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2(-1.0, 3.0),
    vec2(-1.0, -1.0),
    vec2(3.0, -1.0)
  );
  var xy = pos[VertexIndex];
  var near = uniforms.inverseModelViewProjectionMatrix * vec4f(xy, 0.0, 1);
  var far = uniforms.inverseModelViewProjectionMatrix * vec4f(xy, 1, 1);
  near /= near.w;
  far /= far.w;
  return VertexOutput(
    vec4f(xy, 0.0, 1.0),
    near.xyz,
    (far.xyz - near.xyz) / f32(NumSteps)
  );
}

@fragment
fn fragment_main(
  @location(0) near: vec3f,
  @location(1) step: vec3f
) -> @location(0) vec4f {
  var rayPos = near;
  var result = 0.0;
  for (var i = 0u; i < NumSteps; i++) {
    let texCoord = (rayPos.xyz + 1.0) * 0.5;
    let sample =
      textureSample(myTexture, mySampler, texCoord).r * 4.0 / f32(NumSteps);
    let intersects =
      all(rayPos.xyz < vec3f(1.0)) && all(rayPos.xyz > vec3f(-1.0));
    result += select(0.0, (1.0 - result) * sample, intersects && result < 1.0);
    rayPos += step;
  }
  return vec4f(vec3f(result), 1.0);
}
