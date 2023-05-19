@group(0) @binding(0) var tex: texture_2d<f32>;

struct Varying {
  @builtin(position) pos: vec4f,
  @location(0) texelCoord: vec2f,
  @location(1) mipLevel: f32,
}

const kMipLevels = 4;
const baseMipSize: u32 = 16;

@vertex
fn vmain(
  @builtin(instance_index) instance_index: u32, // used as mipLevel
  @builtin(vertex_index) vertex_index: u32,
) -> Varying {
  var square = array(
    vec2f(0, 0), vec2f(0, 1), vec2f(1, 0),
    vec2f(1, 0), vec2f(0, 1), vec2f(1, 1),
  );
  let uv = square[vertex_index];
  let pos = vec4(uv * 2 - vec2(1, 1), 0.0, 1.0);

  let mipLevel = instance_index;
  let mipSize = f32(1 << (kMipLevels - mipLevel));
  let texelCoord = uv * mipSize;
  return Varying(pos, texelCoord, f32(mipLevel));
}

@fragment
fn fmain(vary: Varying) -> @location(0) vec4f {
  return textureLoad(tex, vec2u(vary.texelCoord), u32(vary.mipLevel));
}
