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
  @location(2) frag_pos: vec3f,
  @location(3) tangentSpaceViewPos: vec3f,
  @location(4) tangentSpaceLightPos: vec3f,
  @location(5) tangentSpaceFragPos: vec3f,
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
  depth_value: f32,
  depth_scale: f32
) -> vec2f {
  var p: vec2f = view_dir.xy / view_dir.z * (depth_value * depth_scale);
  return uv - p;
}

fn when_greater(v1: f32, v2: f32) -> f32 {
  return max(sign(v1 - v2), 0.0);
}

/* CONST VALUES */
const lightPos = vec3f(0.0, 0.0, 2.0);
const viewPos = vec3f(0.0, -1.0, -2.0);

/* VERTEX SHADER */
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;

  //Get Regular Parameters out of the way
  output.position = uniforms.projMatrix * uniforms.viewMatrix * uniforms.modelMatrix * input.position;
  output.uv = input.uv;
  output.normal = input.normal;
  //Multiply pos by modelMatrix to get frag pos in world space
  output.frag_pos = vec3f((uniforms.modelMatrix * input.position).xyz);

  //Normal Matrix
  var normalMatrix: mat3x3f = mat3x3f(
    uniforms.normalMatrix[0].xyz, 
    uniforms.normalMatrix[1].xyz,
    uniforms.normalMatrix[2].xyz
  );

  //Tangent Space (TBN) Matrix
  let t = normalize(normalMatrix * input.vert_tan);
  let b = normalize(normalMatrix * input.vert_bitan);
  let n = normalize(normalMatrix * input.normal);

  let tbn = mat3x3f(t, b, n);

  //Get light, camera, and frag positions in tangent space
  output.tangentSpaceLightPos = tbn * lightPos;
  output.tangentSpaceViewPos = tbn * viewPos;
  output.tangentSpaceFragPos = tbn * output.frag_pos;

  return output;
}

/* FRAGMENT SHADER */
@group(0) @binding(1) var<uniform> mapInfo: Uniforms_MapInfo;

@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Calculate light and view directions in tangent space for each fragment
  var lightDir = normalize(input.tangentSpaceLightPos - input.tangentSpaceFragPos);
  var viewDir = normalize(input.tangentSpaceViewPos - input.tangentSpaceFragPos);

  let uv = select(parallax_uv(
    input.uv, 
    viewDir,
    textureSample(depthTexture, textureSampler, input.uv).b,
    mapInfo.parallax_scale,
  ), input.uv, mapInfo.mappingType < 2);



  let diffuseMap = textureSample(diffuseTexture, textureSampler, uv);
  let normalMap = textureSample(normalTexture, textureSampler, uv);
  let depthMap = textureSample(depthTexture, textureSampler, uv); 
  //Obtain the normal of the fragment in [-1, 1] range
  var fragmentNormal = (normalMap.rgb * 2.0 - 1.0);
  //DIFFUSE
  var diffuseColor = diffuseMap.rgb;
  var diffuseLight = max(
    dot(
      lightDir, 
      select(fragmentNormal, input.frag_pos, mapInfo.mappingType <= 0)
    ), 0.0
  ) * diffuseColor;
  //AMBIENT
  var ambientLight = 0.1 * diffuseColor;

  return vec4f(ambientLight + diffuseLight, 1.0);
}