
const modeAlbedoTexture = 0;
const modeNormalTexture = 1;
const modeDepthTexture = 2;
const modeNormalMap = 3;
const modeParallaxScale = 4;
const modeSteepParallax = 5;

struct SpaceTransforms {
  worldViewProjMatrix: mat4x4f,
  worldViewMatrix: mat4x4f,
}

struct MapInfo {
  lightPosVS: vec3f, // Light position in view space
  mode: u32,
  lightIntensity: f32,
  depthScale: f32,
  depthLayers: f32,
}

struct VertexInput {
  // Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) posCS : vec4f,    // vertex position in clip space
  @location(0) posVS : vec3f,          // vertex position in view space
  @location(1) tangentVS: vec3f,       // vertex tangent in view space
  @location(2) bitangentVS: vec3f,     // vertex tangent in view space
  @location(3) normalVS: vec3f,        // vertex normal in view space
  @location(5) uv : vec2f,             // vertex texture coordinate
}

// Uniforms
@group(0) @binding(0) var<uniform> spaceTransform : SpaceTransforms;
@group(0) @binding(1) var<uniform> mapInfo: MapInfo;

// Texture info
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var albedoTexture: texture_2d<f32>;
@group(1) @binding(2) var normalTexture: texture_2d<f32>;
@group(1) @binding(3) var depthTexture: texture_2d<f32>;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;

  output.posCS = spaceTransform.worldViewProjMatrix * input.position;
  output.posVS = (spaceTransform.worldViewMatrix * input.position).xyz;
  output.tangentVS = (spaceTransform.worldViewMatrix * vec4(input.vert_tan, 0)).xyz;
  output.bitangentVS = (spaceTransform.worldViewMatrix * vec4(input.vert_bitan, 0)).xyz;
  output.normalVS = (spaceTransform.worldViewMatrix * vec4(input.normal, 0)).xyz;
  output.uv = input.uv;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Build the matrix to convert from tangent space to view space
  let tangentToView = mat3x3f(
    input.tangentVS,
    input.bitangentVS,
    input.normalVS,
  );

  // The inverse of a non-scaling affine 3x3 matrix is it's transpose
  let viewToTangent = transpose(tangentToView);

  // Calculate the normalized vector in tangent space from the camera to the fragment
  let viewDirTS = normalize(viewToTangent * input.posVS);

  // Apply parallax to the texture coordinate, if parallax is enabled
  var uv : vec2f;
  switch (mapInfo.mode) {
    case modeParallaxScale: {
      uv = parallaxScale(input.uv, viewDirTS);
      break;
    }
    case modeSteepParallax: {
      uv = parallaxSteep(input.uv, viewDirTS);
      break;
    }
    default: {
      uv = input.uv;
      break;
    }
  }

  // Sample the albedo texture
  let albedoSample = textureSample(albedoTexture, textureSampler, uv);

  // Sample the normal texture
  let normalSample = textureSample(normalTexture, textureSampler, uv);

  switch (mapInfo.mode) {
    case modeAlbedoTexture: { // Output the albedo sample
      return albedoSample;
    }
    case modeNormalTexture: { // Output the normal sample
      return normalSample;
    }
    case modeDepthTexture: { // Output the depth map
      return textureSample(depthTexture, textureSampler, input.uv);
    }
    default: {
      // Transform the normal sample to a tangent space normal
      let normalTS = normalSample.xyz * 2 - 1;

      // Convert normal from tangent space to view space, and normalize
      let normalVS = normalize(tangentToView * normalTS);

      // Calculate the vector in view space from the light position to the fragment
      let fragToLightVS = mapInfo.lightPosVS - input.posVS;

      // Calculate the square distance from the light to the fragment
      let lightSqrDist = dot(fragToLightVS, fragToLightVS);

      // Calculate the normalized vector in view space from the fragment to the light
      let lightDirVS = fragToLightVS * inverseSqrt(lightSqrDist);

      // Light strength is inversely proportional to square of distance from light
      let diffuseLight = mapInfo.lightIntensity * max(dot(lightDirVS, normalVS), 0) / lightSqrDist;

      // The diffuse is the albedo color multiplied by the diffuseLight
      let diffuse = albedoSample.rgb * diffuseLight;

      return vec4f(diffuse, 1.0);
    }
  }
}


// Returns the uv coordinate displaced in the view direction by a magnitude calculated by the depth
// sampled from the depthTexture and the angle between the surface normal and view direction.
fn parallaxScale(uv: vec2f, viewDirTS: vec3f) -> vec2f {
  let depthSample = textureSample(depthTexture, textureSampler, uv).r;
  return uv + viewDirTS.xy * (depthSample * mapInfo.depthScale) / -viewDirTS.z;
}

// Returns the uv coordinates displaced in the view direction by ray-tracing the depth map.
fn parallaxSteep(startUV: vec2f, viewDirTS: vec3f) -> vec2f {
  // Calculate derivatives of the texture coordinate, so we can sample the texture with non-uniform
  // control flow.
  let ddx = dpdx(startUV);
  let ddy = dpdy(startUV);

  // Calculate the delta step in UV and depth per iteration
  let uvDelta = viewDirTS.xy * mapInfo.depthScale / (-viewDirTS.z * mapInfo.depthLayers);
  let depthDelta = 1.0 / f32(mapInfo.depthLayers);
  let posDelta = vec3(uvDelta, depthDelta);

  // Walk the depth texture, and stop when the ray intersects the depth map
  var pos = vec3(startUV, 0);
  for (var i = 0; i < 32; i++) {
    if (pos.z >= textureSampleGrad(depthTexture, textureSampler, pos.xy, ddx, ddy).r) {
      break; // Hit the surface
    }
    pos += posDelta;
  }

  return pos.xy;
}
