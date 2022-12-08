@group(0) @binding(0) var gBufferPosition: texture_2d<f32>;
@group(0) @binding(1) var gBufferNormal: texture_2d<f32>;
@group(0) @binding(2) var gBufferAlbedo: texture_2d<f32>;

struct CanvasConstants {
  size: vec2f,
}
@group(1) @binding(0) var<uniform> canvas : CanvasConstants;

@fragment
fn main(
  @builtin(position) coord : vec4f
) -> @location(0) vec4f {
  let c = coord.xy / canvas.size;
  if (c.x < 0.33333) {
    return textureLoad(gBufferPosition, vec2i(floor(coord.xy)), 0);
  }
  if (c.x < 0.66667) {
    let packed = textureLoad(gBufferNormal, vec2i(floor(coord.xy)), 0);
    return vec4((packed.xyz + 1) * 0.5, packed.w);
  }
  return textureLoad(gBufferAlbedo, vec2i(floor(coord.xy)), 0);
}
