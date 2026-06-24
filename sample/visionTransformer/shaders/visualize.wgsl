// Attention map visualization render shader.
//
// Blends the original input image with a viridis-colored heatmap showing
// attention intensities. The attention map is a 14x14 grid (one value per
// image patch) that gets bilinearly upsampled to the full image resolution
// by the texture sampler.
//
// The viridis colormap maps low attention (dark purple/blue) to high
// attention (yellow/green), making it easy to see where the model "looks."

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen triangle
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  output.uv = (pos[vertexIndex] + 1.0) * 0.5;
  output.uv.y = 1.0 - output.uv.y; // flip Y for image coordinates
  return output;
}

@group(0) @binding(0) var imageTex: texture_2d<f32>;
@group(0) @binding(1) var attnTex: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

struct VisParams {
  overlayAlpha: f32,
  showOverlay: u32,
}
@group(0) @binding(3) var<uniform> visParams: VisParams;

// Viridis-like colormap
fn viridis(t: f32) -> vec3f {
  let c0 = vec3f(0.267, 0.004, 0.329);
  let c1 = vec3f(0.282, 0.141, 0.458);
  let c2 = vec3f(0.254, 0.265, 0.530);
  let c3 = vec3f(0.207, 0.372, 0.553);
  let c4 = vec3f(0.164, 0.471, 0.558);
  let c5 = vec3f(0.128, 0.567, 0.551);
  let c6 = vec3f(0.135, 0.659, 0.518);
  let c7 = vec3f(0.267, 0.749, 0.441);
  let c8 = vec3f(0.478, 0.821, 0.318);
  let c9 = vec3f(0.741, 0.873, 0.150);
  let c10 = vec3f(0.993, 0.906, 0.144);

  let s = clamp(t, 0.0, 1.0) * 10.0;
  let i = u32(floor(s));
  let f = fract(s);

  var colors = array<vec3f, 11>(c0, c1, c2, c3, c4, c5, c6, c7, c8, c9, c10);

  let lo = min(i, 10u);
  let hi = min(i + 1u, 10u);
  return mix(colors[lo], colors[hi], f);
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4f {
  let imageColor = textureSample(imageTex, linearSampler, input.uv).rgb;

  if (visParams.showOverlay == 0u) {
    return vec4f(imageColor, 1.0);
  }

  let attnValue = textureSample(attnTex, linearSampler, input.uv).r;
  let heatmapColor = viridis(attnValue);

  let blended = mix(imageColor, heatmapColor, visParams.overlayAlpha);
  return vec4f(blended, 1.0);
}
