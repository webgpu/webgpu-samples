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
  @location(5) frag_pos: vec3f,
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

fn when_greater(v1: f32, v2: f32) -> f32 {
  return max(sign(v1 - v2), 0.0);
}

/* CONST VALUES */
const lightPos = vec3f(0.0, 2.0, 3.0);
const dirColor = vec3(1);
const ambientColor = vec3f(0.05);

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
  output.frag_pos = (uniforms.modelMatrix * vec4f(input.position.xyz, 1.0)).xyz;

  //Tangent space light position
  output.tangentSpaceLightPos = tbn * lightPos;
  //Tangent space camera position
  output.tangentSpaceViewPos = tbn * vec3f(2.0, 2.0, 0.0);
  //Tangents space fragment position
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
  let diffuseMap = textureSample(diffuseTexture, textureSampler, input.uv); //input.uv);
  let normalMap = textureSample(normalTexture, textureSampler, input.uv); //input.uv);
  let depthMap = textureSample(depthTexture, textureSampler, input.uv); //input.uv);

  //Obtain the normal of the fragment in tangent space
  var fragmentNormal = (normalMap.rgb * 2.0 - 1.0);
  //DIFFUSE
  var diffuseColor = diffuseMap.rgb;
  //light direction: How alligned is the position of the light in tangent space
  var lightDir: vec3f = input.tangentSpaceLightPos - input.tangentSpaceFragPos;
  //How alligned is the direction of the tangent space 
  var diffuseLight = max(dot(lightDir, fragmentNormal), 0.0) * diffuseColor;
  //AMBIENT
  var ambientLight = 0.1 * diffuseColor;
  //SPECULAR
  var viewDir = normalize(input.tangentSpaceViewPos - input.tangentSpaceFragPos);
  var reflectDir = reflect(-lightDir, fragmentNormal);
  var halfwayDir = normalize(lightDir + viewDir);  
  //16 is shininess of the surface, 0.2 intensity of highlight
  var specular: f32 = pow(max(dot(fragmentNormal, halfwayDir), 0.0), 32.0);
  var specularLight = specular * when_greater(specular, 0.0);
  
  //specularLight = specularLight * when_greater(specularLight, 0.0)
  if (mapInfo.mappingType >= 0) {
    return vec4f(ambientLight + diffuseLight + specularLight, 1.0);
  }
  return vec4f(ambientLight + diffuseLight, 1.0);





  /*let newLightDir: vec3f = normalize(input.tangentSpaceLightPos - input.tangentSpaceFragPos);
  let newViewDir: vec3f = normalize(input.tangentSpaceViewPos - input.tangentSpaceFragPos);
  
  var lightDir: vec3f = normalize(lightPos - input.frag_pos);
  var halfwayDir: vec3f = normalize(lightDir + newViewDir);


  let newUV = select(parallax_uv(
    input.uv, 
    newViewDir,
    mapInfo.mappingType,
    textureSample(depthTexture, textureSampler, input.uv).x,
    mapInfo.parallax_scale,
  ), input.uv, mapInfo.mappingType < 2); //100 means we effectively ignore this for now

  let diffuseMap = textureSample(diffuseTexture, textureSampler, newUV); //input.uv);
  let normalMap = textureSample(normalTexture, textureSampler, newUV); //input.uv);
  let depthMap = textureSample(depthTexture, textureSampler, newUV); //input.uv);
  
  //Just going to do blinn-phong for now

  //ambient
  let ambient: vec3f = 0.1 * diffuseMap.rgb;
  //diffuse
  //lightDir
  var diffuse: vec3f = diffuseMap.rgb; 
  

  //Need to finish normal mapping code but bind groups are all correct
  if (mapInfo.mappingType > 0) {
    //Normal vector of the fragment on our normalMap
    var norm: vec3<f32> = normalize(normalMap.rgb * 2.0 - 1.0);
    //How much are the light and the normal vector aligned?
    // Aligned: 1, unalligned: <= 0
    diffuse = diffuse * max(dot(newLightDir, norm), 0.0); 
    //NOTE: Maybe saturate
    //let lightColor = max(dot(norm, newLightDir), 0.0); //saturate(ambientColor + max(dot(norm, newLightDir), 0.0) * dirColor);
    return vec4f(ambient + diffuse, diffuseMap.a);
    //return vec4f(diffuseMap.rgb * lightColor, diffuseMap.a);
  } else {
    // Very simplified lighting algorithm.
    diffuse = diffuse * max(dot(lightDir, input.normal), 0.0);
    // saturate Clamps values between 0.0 and 1.0
    return vec4f(ambient + diffuse, diffuseMap.a);
  } */
}