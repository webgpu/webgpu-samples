[[group(0), binding(0)]] var mySampler: sampler;
[[group(0), binding(1)]] var gBufferPosition: texture_2d<f32>;
[[group(0), binding(2)]] var gBufferNormal: texture_2d<f32>;
[[group(0), binding(3)]] var gBufferAlbedo: texture_2d<f32>;

[[block]] struct CanvasConstants {
  size: vec2<f32>;
};
[[group(1), binding(0)]] var<uniform> canvas : CanvasConstants;

[[stage(fragment)]]
fn main([[builtin(position)]] coord : vec4<f32>)
     -> [[location(0)]] vec4<f32> {
  var result : vec4<f32>;
  var c : vec2<f32> = coord.xy / canvas.size;
  if (c.x < 0.33333) {
    result = textureSample(
      gBufferPosition,
      mySampler,
      c
    );
  } elseif (c.x < 0.66667) {
    result = textureSample(
      gBufferNormal,
      mySampler,
      c
    );
    result.x = (result.x + 1.0) * 0.5;
    result.y = (result.y + 1.0) * 0.5;
    result.z = (result.z + 1.0) * 0.5;
  } else {
    result = textureSample(
      gBufferAlbedo,
      mySampler,
      c
    );
  }
  return result;
}