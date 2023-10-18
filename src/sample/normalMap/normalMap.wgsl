/* STRUCT DEFINITIONS */
struct SpaceTransformUniforms {
  projMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  modelMatrix: mat4x4f,
}

struct Uniforms_MapInfo {
  mappingType: u32,
  lightPosX: f32,
  lightPosY: f32,
  lightPosZ: f32,
  lightIntensity: f32,
  depthScale: f32,
  depthLayers: f32,
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
  @builtin(position) Position : vec4f,
  @location(0) normal: vec3f,
  @location(1) uv : vec2f,
  @location(2) posWS: vec3f,
  @location(3) posTS: vec3f,
  @location(4) viewTS: vec3f,
  @location(5) tbnTS0: vec3<f32>, 
  @location(6) tbnTS1: vec3<f32>,
  @location(7) tbnTS2: vec3<f32>,
}

/* UTILITY FUNCTIONS */

fn transpose3x3(mat: mat3x3f) -> mat3x3f  {
  return mat3x3f(
    mat[0][0], mat[1][0], mat[2][0],
    mat[0][1], mat[1][1], mat[2][1],
    mat[0][2], mat[1][2], mat[2][2],
  );
}

@group(0) @binding(0) var<uniform> spaceTransform : SpaceTransformUniforms;
@group(0) @binding(1) var<uniform> mapInfo: Uniforms_MapInfo;
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;

fn parallax_uv(
  uv: vec2f, 
  viewDirTS: vec3f, 
  depthSample: f32,
  depthScale: f32,
) -> vec2f {
  if (mapInfo.mappingType == 3) {
    //Perturb uv coordinates based on depth and camera direction
    var p: vec2f = viewDirTS.xy * (depthSample * depthScale) / viewDirTS.z;
    return uv - p;
  }
  var depthPerLayer: f32 = 1.0 / f32(mapInfo.depthLayers);
  var currentDepth: f32 = 0.0;
  //How much we will go down
  var delta_uv: vec2<f32> = viewDirTS.xy * depthScale / (viewDirTS.z * mapInfo.depthLayers);
  var prev_uv = uv;
  var cur_uv = uv;

  var depthFromTexture: f32 = textureSample(depthTexture, textureSampler, cur_uv).r;
  var prevDepthFromTexture: f32 = depthFromTexture;
  var prevCurrentDepth: f32 = currentDepth;
  for (var i: u32 = 0; i < 32; i++) {
    currentDepth += depthPerLayer;
    prev_uv = cur_uv;
    cur_uv -= delta_uv;
    depthFromTexture = textureSample(depthTexture, textureSampler, cur_uv).r;
    cur_uv = select(cur_uv, prev_uv, depthFromTexture < currentDepth);
    prevDepthFromTexture = select(depthFromTexture, prevDepthFromTexture, prevDepthFromTexture < currentDepth);
    prevCurrentDepth = select(currentDepth, prevCurrentDepth, prevDepthFromTexture < currentDepth);
  }
  if (mapInfo.mappingType == 4) {
    return cur_uv; 
  }
  prev_uv = cur_uv + delta_uv;
  var next: f32 = prevDepthFromTexture - prevCurrentDepth;
  var prev: f32 = textureSample(depthTexture, textureSampler, prev_uv).r - prevCurrentDepth + depthPerLayer;
  var weight: f32 = next / (next - prev);
  return mix(cur_uv, prev_uv, weight);
}

fn when_greater(v1: f32, v2: f32) -> f32 {
  return max(sign(v1 - v2), 0.0);
}

/* CONST VALUES */
const lightPos = vec3f(0.0, 0.0, 2.0);
const viewPos = vec3f(0.0, 0.0, -2.0);

/* VERTEX SHADER */
@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  //Create the Model to View Matrix
  var MV = spaceTransform.viewMatrix * spaceTransform.modelMatrix;
  //Create the Model to View to Projection Matrix
  var MVP = spaceTransform.projMatrix * MV;
  
  //Get Clip space transforms and pass through values out of the way
  output.Position = MVP * input.position;
  output.uv = input.uv;
  output.normal = input.normal;

  //Multiply pos by modelMatrix to get the vertex/fragment's position in world space
  output.posWS = vec3f((spaceTransform.modelMatrix * input.position).xyz);
  
  var MV3x3 = mat3x3f(
    MV[0].xyz,
    MV[1].xyz,
    MV[2].xyz
  );

  //Get unit vectors of normal, tangent, and bitangents in model space
  var vertexTangent: vec3f = normalize(input.vert_tan);
  var vertexBitangent: vec3f = normalize(input.vert_bitan);
  var vertexNormal: vec3f = normalize(input.normal);

  //Convert tbn unit vectors to mv space for a model view tbn
  var tbnTS = transpose3x3(
    MV3x3 * mat3x3f(
      vertexTangent,
      vertexBitangent,
      vertexNormal
    )
  );
  //Condense to vec3s so they can be passed to fragment shader
  output.tbnTS0 = tbnTS[0];
  output.tbnTS1 = tbnTS[1];
  output.tbnTS2 = tbnTS[2];

  //Get the tangent space position of the vertex
  output.posTS = tbnTS * (MV * input.position).xyz;

  //Do we need to multipy by viewPos?
  output.viewTS = tbnTS * vec3f(0.0, 0.0, 0.0);

  return output;
}

/* FRAGMENT SHADER */
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  //Reconstruct tbnTS
  var tbnTS = mat3x3f(
    input.tbnTS0,
    input.tbnTS1,
    input.tbnTS2,
  );

  //Get direction of view in tangent space
  var viewDirTS = normalize(input.viewTS - input.posTS);

  //Get position, direction, and distance of light in tangent space (no need to multiply by model matrix as there is no model)
  var lightPosVS: vec4f = spaceTransform.viewMatrix * vec4f(mapInfo.lightPosX, mapInfo.lightPosY, mapInfo.lightPosZ, 1.0);
  var lightPosTS: vec3f = tbnTS * lightPosVS.xyz;
  var lightDirTS: vec3f = normalize(lightPosTS - input.posTS);
  var lightDistanceTS = distance(input.posTS, lightPosTS);

  let depthMap = textureSample(depthTexture, textureSampler, input.uv); 

  var uv = select(
    parallax_uv(input.uv, viewDirTS, depthMap.r, mapInfo.depthScale),
    input.uv,
    mapInfo.mappingType < 3
  );

  //Get values from textures
  let diffuseMap = textureSample(diffuseTexture, textureSampler, uv);
  let normalMap = textureSample(normalTexture, textureSampler, uv);

  //Get normal in tangent space
  var normalTS = normalize((normalMap.xyz * 2.0) - 1.0);
  
  //Calculate diffusion lighting
  var lightColorIntensity = vec3f(255.0, 255.0, 255.0) * mapInfo.lightIntensity;
  //How similar is the normal to the lightDirection
  var diffuseStrength = clamp(
    dot(normalTS, lightDirTS), 0.0, 1.0
  );
  //Strenght inversely proportional to square of distance from light
  var diffuseLight = (lightColorIntensity * diffuseStrength) / (lightDistanceTS * lightDistanceTS);

  switch (mapInfo.mappingType) {
    case 0: {
      return vec4f(diffuseMap.rgb, 1.0);
    }
    case 1: {
      return vec4f(normalMap.rgb, 1.0);
    }
    default: {
      return vec4f(diffuseMap.rgb * diffuseLight, 1.0);
    }
  }
}