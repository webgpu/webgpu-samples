@group(0) @binding(0) var tex: texture_multisampled_2d<f32>;

struct Varying {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

const kMipLevels = 4;
const baseMipSize: u32 = 16;

const kSquare = array(
  vec2f(0, 0), vec2f(0, 1), vec2f(1, 0),
  vec2f(1, 0), vec2f(0, 1), vec2f(1, 1),
);

@vertex
fn vmain(
  @builtin(vertex_index) vertex_index: u32,
) -> Varying {

  let uv = kSquare[vertex_index];
  let pos = vec4(uv * vec2(2, -2) + vec2(-1, 1), 0.0, 1.0);

  return Varying(pos, uv);
}

const kSampleCount = 4;
const kSamplePositions: array<vec2f, kSampleCount> = array(
  vec2f(0.375, 0.125),
  vec2f(0.875, 0.375),
  vec2f(0.125, 0.625),
  vec2f(0.625, 0.875),
);

@fragment
fn fmain(vary: Varying) -> @location(0) vec4f {
  let dim = textureDimensions(tex);
  let dimMax = max(dim.x, dim.y);

  let xy = vary.uv * f32(dimMax);
  let xyInt = vec2u(xy);
  let xyFrac = xy % vec2f(1, 1);

  if xyInt.x >= dim.x || xyInt.y >= dim.y {
    return vec4f(0, 0, 0, 1);
  }

  // check if we're close to a sample, and return it
  for (var sampleIndex = 0; sampleIndex < kSampleCount; sampleIndex += 1) {
    if distance(xyFrac, kSamplePositions[sampleIndex]) < 0.1 {
      let val = textureLoad(tex, xyInt, sampleIndex).rgb;
      return vec4f(val, 1);
    }
  }

  // if not close to a sample, render background checkerboard
  return vec4f(f32(xyInt.x % 4 + 1) / 8, 0, f32(xyInt.y % 4 + 1) / 8, 1);
}
