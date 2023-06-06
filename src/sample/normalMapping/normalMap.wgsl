/* STRUCT DEFINITIONS */
struct Uniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  normalMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct Uniforms_MapInfo {
  mappingType: u32,
  parallax_scale: f32,
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
  @location(2) tangentSpaceLightPos: vec3f,
  @location(3) tangentSpaceViewPos: vec3f,
  @location(4) tangentSpaceFragPos: vec3f,
}

/* UTILITY FUNCTIONS */

fn transpose3x3(mat: mat3x3f) -> mat3x3f  {
  return mat3x3f(
    mat[0][0], mat[1][0], mat[2][0],
    mat[0][1], mat[1][1], mat[2][1],
    mat[0][2], mat[1][2], mat[2][2],
  );
}

fn parallax_uv(
  uv: vec2f, 
  view_dir: vec3f, 
  map_type: u32,
  depth_value: f32,
  depth_scale: f32
) -> vec2f {
  var p: vec2f = view_dir.xy * (depth_value * depth_scale) / view_dir.z;
  return uv - p;
}

/* VERTEX SHADER */
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

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
  
  //Regular stuff
  output.position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * input.position;
  output.normal = normalize((uniforms.modelMatrix * vec4(input.normal, 0)).xyz);
  output.uv = input.uv;

  //Tangent Space stuff
  var temp: vec4f = uniforms.modelMatrix * input.position;
  output.tangentSpaceFragPos = tbn * temp.xyz;
  //Translated Position of camera we defined in code
  output.tangentSpaceViewPos = tbn * vec3f(0.0, 0.0, -2.0);
  //Redundant light definition
  output.tangentSpaceLightPos = tbn * vec3f(0.5, 1, 1);

  return output;
}

/* FRAGMENT SHADER */
@group(0) @binding(1) var<uniform> mapInfo: Uniforms_MapInfo;

@group(1) @binding(0) var meshSampler: sampler;
@group(1) @binding(1) var meshTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var diffuseTexture: texture_2d<f32>;

// Static directional lighting
const lightDir = vec3f(0.5, 1, 1);
const dirColor = vec3(1);
const ambientColor = vec3f(0.05);

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let newLightDir: vec3f = normalize(input.tangentSpaceLightPos - input.tangentSpaceFragPos);
  let newViewDir: vec3f = normalize(input.tangentSpaceViewPos - input.tangentSpaceFragPos);
  

  let newUV = select(parallax_uv(
    input.uv, 
    newViewDir,
    mapInfo.mappingType,
    textureSample(diffuseTexture, meshSampler, input.uv).x,
    mapInfo.parallax_scale,
  ), input.uv, mapInfo.mappingType < 2);

  let textureColor = textureSample(meshTexture, meshSampler, newUV); //input.uv);
  let normalColor = textureSample(normalTexture, meshSampler, newUV); //input.uv);
  let diffuseColor = textureSample(diffuseTexture, meshSampler, newUV); //input.uv);


  //Need to finish normal mapping code but bind groups are all correct
  if (mapInfo.mappingType > 0) {
    var norm: vec3<f32> = normalize(normalColor.rgb * 2.0 - 1.0);
    let lightColor = max(dot(norm, newLightDir), 0.0); //saturate(ambientColor + max(dot(norm, newLightDir), 0.0) * dirColor);
    return vec4f(textureColor.rgb * lightColor, textureColor.a);
  } else {
    // Very simplified lighting algorithm.
    let lightColor = saturate(ambientColor + max(dot(input.normal, lightDir), 0.0) * dirColor);
    return vec4f(textureColor.rgb * lightColor, textureColor.a);
  }
}