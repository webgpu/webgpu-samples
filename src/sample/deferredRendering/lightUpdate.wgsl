struct LightData {
  position : vec4f,
  color : vec3f,
  radius : f32,
}
struct LightsBuffer {
  lights: array<LightData>,
}
@group(0) @binding(0) var<storage, read_write> lightsBuffer: LightsBuffer;

struct Config {
  numLights : u32,
}
@group(0) @binding(1) var<uniform> config: Config;

struct LightExtent {
  min : vec4f,
  max : vec4f,
}
@group(0) @binding(2) var<uniform> lightExtent: LightExtent;

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3u) {
  var index = GlobalInvocationID.x;
  if (index >= config.numLights) {
    return;
  }

  lightsBuffer.lights[index].position.y -= 0.5 - 0.003 * (f32(index) - 64 * floor(f32(index) / 64));

  if (lightsBuffer.lights[index].position.y < lightExtent.min.y) {
    lightsBuffer.lights[index].position.y = lightExtent.max.y;
  }
}
