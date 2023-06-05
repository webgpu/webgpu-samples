struct Uniforms {
  viewProjectionMatrix : mat4x4f
}
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var<uniform> modelMatrix : mat4x4f;

struct VertexInput {
  //Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f
  //@location(3) vert_tan: vec3f,
  //@location(4) vert_bitan: vec3f
}

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) normal: vec3f,
  @location(1) uv : vec2f,
  //@location(2) vert_tan: vec3f,
  //@location(3) vert_bitan: vec3f
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.position = uniforms.viewProjectionMatrix * modelMatrix * input.position;
  output.normal = normalize((modelMatrix * vec4(input.normal, 0)).xyz);
  output.uv = input.uv;
  return output;
}

@group(0) @binding(1) var<uniform> mappingType: u32;

@group(1) @binding(1) var meshSampler: sampler;
@group(1) @binding(2) var meshTexture: texture_2d<f32>;
@group(1) @binding(3) var normalTexture: texture_2d<f32>;
@group(1) @binding(4) var diffuseTexture: texture_2d<f32>;

// Static directional lighting
const lightDir = vec3f(0.9, 1, 1);
const dirColor = vec3(1);
const ambientColor = vec3f(0.05);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let textureColor = textureSample(meshTexture, meshSampler, input.uv);
  let normalColor = textureSample(normalTexture, meshSampler, input.uv);
  let diffuseColor = textureSample(diffuseTexture, meshSampler, input.uv);

  //Need to finish normal mapping code but bind groups are all correct
  if (mappingType > 0) {
    var norm: vec3<f32> = normalize(normalColor.rgb * 2.0 - 1.0);
    let lightColor = saturate(ambientColor + max(dot(norm, lightDir), 0.0) * dirColor);
    return vec4f(textureColor.rgb * lightColor, textureColor.a);
  } else {
    // Very simplified lighting algorithm.
    let lightColor = saturate(ambientColor + max(dot(input.normal, lightDir), 0.0) * dirColor);
    return vec4f(textureColor.rgb * lightColor, textureColor.a);
  }
}