@group(0) @binding(0) var gBufferPosition: texture_2d<f32>;
@group(0) @binding(1) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(2) var gBufferAlbedo: texture_2d<f32>;

struct LightData {
  position : vec4f,
  color : vec3f,
  radius : f32,
}
struct LightsBuffer {
  lights: array<LightData>,
}
@group(1) @binding(0) var<storage, read> lightsBuffer: LightsBuffer;

struct Config {
  numLights : u32,
}
@group(1) @binding(1) var<uniform> config: Config;

struct CanvasConstants {
  size: vec2f,
}
@group(2) @binding(0) var<uniform> canvas : CanvasConstants;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  var result : vec3f;

  let position = textureLoad(gBufferPosition, vec2i(floor(coord.xy)), 0).xyz;
  if (position.z > 10000) {
    discard;
  }

  let normal = textureLoad(gBufferNormal, vec2i(floor(coord.xy)), 0).xyz;
  let albedo = textureLoad(gBufferAlbedo, vec2i(floor(coord.xy)), 0).rgb;

  for (var i = 0u; i < config.numLights; i++) {
    let L = lightsBuffer.lights[i].position.xyz - position;
    let distance = length(L);
    if (distance > lightsBuffer.lights[i].radius) {
      continue;
    }
    let lambert = max(dot(normal, normalize(L)), 0);
    result += vec3f(
      lambert * pow(1 - distance / lightsBuffer.lights[i].radius, 2) * lightsBuffer.lights[i].color * albedo
    );
  }

  // some manual ambient
  result += vec3(0.2);

  return vec4(result, 1);
}
