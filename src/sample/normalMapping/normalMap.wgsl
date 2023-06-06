/* STRUCT DEFINITIONS */
struct Uniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  normalMatrix: mat4x4f,
}

struct VertexInput {
  //Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) normal: vec3f,
  @location(1) uv : vec2f,
}

/* UTILITY FUNCTIONS */

fn transpose3x3(mat: mat3x3f) -> mat3x3f  {
  return mat3x3f(
    mat[0][0], mat[1][0], mat[2][0],
    mat[0][1], mat[1][1], mat[2][1],
    mat[0][2], mat[1][2], mat[2][2],
  );
}

/* VERTEX SHADER */
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(1) @binding(0) var<uniform> modelMatrix : mat4x4f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  var normMat3x3: mat3x3f = mat3x3f(
    uniforms.normalMatrix[0].xyz, 
    uniforms.normalMatrix[1].xyz,
    uniforms.normalMatrix[2].xyz
  );

  var t: vec3f = normalize(normMat3x3 * input.vert_tan);
  var b: vec3f = normalize(normMat3x3 * input.vert_bitan);
  var n: vec3f = normalize(normMat3x3 * input.normal);
  var tbn: mat3x3f = transpose3x3(mat3x3f(t, b, n));
  
  output.position = uniforms.projMatrix * uniforms.viewMatrix * modelMatrix * input.position;
  output.normal = normalize((modelMatrix * vec4(input.normal, 0)).xyz);
  output.uv = input.uv;
  return output;
}

/* FRAGMENT SHADER */
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