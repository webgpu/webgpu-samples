struct LightData {
  position : vec4<f32>;
  color : vec3<f32>;
  radius : f32;
};
[[block]] struct LightsBuffer {
  lights: array<LightData>;
};
[[group(0), binding(0)]] var<storage> lightsBuffer: [[access(read_write)]] LightsBuffer;

[[block]] struct Config {
  numLights : u32;
};
[[group(0), binding(1)]] var<uniform> config: Config;

[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
  var index : u32 = GlobalInvocationID.x;
  if (index >= config.numLights) {
    return;
  }

  lightsBuffer.lights[index].position.y = lightsBuffer.lights[index].position.y - 0.5 - 0.003 * (f32(index) - 64.0 * floor(f32(index) / 64.0));
  
  if (lightsBuffer.lights[index].position.y < -30.0) {
    lightsBuffer.lights[index].position.y = 50.0;
  }
}