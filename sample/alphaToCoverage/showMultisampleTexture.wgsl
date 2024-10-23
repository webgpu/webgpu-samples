@group(0) @binding(0) var tex: texture_multisampled_2d<f32>;
@group(0) @binding(1) var resolved: texture_2d<f32>;

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

// Standard sample positions for 4xMSAA (assuming the device conforms to spec)
const kSampleCount = 4;
const kSamplePositions: array<vec2f, kSampleCount> = array(
  vec2f(0.375, 0.125),
  vec2f(0.875, 0.375),
  vec2f(0.125, 0.625),
  vec2f(0.625, 0.875),
);

// Compute dimensions for drawing a nice-looking visualization
const kSampleDistanceFromCloseEdge = 0.125; // from the standard sample positions
const kGridEdgeHalfWidth = 0.025;
const kSampleInnerRadius = kSampleDistanceFromCloseEdge - kGridEdgeHalfWidth;
const kSampleOuterRadius = kSampleDistanceFromCloseEdge + kGridEdgeHalfWidth;

@fragment
fn fmain(vary: Varying) -> @location(0) vec4f {
  let dim = textureDimensions(tex);
  let dimMax = max(dim.x, dim.y);

  let xy = vary.uv * f32(dimMax);
  let xyInt = vec2u(xy);
  let xyFrac = xy % vec2f(1, 1);

  // Show the visualization only if the resolution is large enough to see it
  if (dpdx(xy.x) < kGridEdgeHalfWidth * 2) & (dpdy(xy.y) < kGridEdgeHalfWidth * 2) {
    // Check if we're close to a sample; if so, visualize the sample value
    for (var sampleIndex = 0; sampleIndex < kSampleCount; sampleIndex += 1) {
      let distanceFromSample = distance(xyFrac, kSamplePositions[sampleIndex]);
      if distanceFromSample < kSampleInnerRadius {
        // Draw a circle for the sample value
        let val = textureLoad(tex, xyInt, sampleIndex).rgb;
        return vec4f(val, 1);
      } else if distanceFromSample < kSampleOuterRadius {
        // Draw a ring around the circle
        return vec4f(0, 0, 0, 1);
      }
    }

    // If close to a grid edge, render the grid
    let distanceToGridEdge = abs((xyFrac + 0.5) % 1 - 0.5);
    if min(distanceToGridEdge.x, distanceToGridEdge.y) < kGridEdgeHalfWidth {
      return vec4f(0, 0, 0, 1);
    }
  }

  // Otherwise, show the multisample-resolved result as the background
  let val = textureLoad(resolved, xyInt, /*level*/ 0).rgb;
  return vec4f(val, 1);
}
