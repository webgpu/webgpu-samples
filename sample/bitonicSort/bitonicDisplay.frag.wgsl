struct ComputeUniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

struct FragmentUniforms {
  // boolean, either 0 or 1
  highlight: u32,
}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>
}

// Uniforms from compute shader
@group(0) @binding(0) var<storage, read> data: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: ComputeUniforms;
// Fragment shader uniforms
@group(1) @binding(0) var<uniform> fragment_uniforms: FragmentUniforms;

@fragment
fn frag_main(input: VertexOutput) -> @location(0) vec4<f32> {
  var uv: vec2<f32> = vec2<f32>(
    input.fragUV.x * uniforms.width,
    input.fragUV.y * uniforms.height
  );

  var pixel: vec2<u32> = vec2<u32>(
    u32(floor(uv.x)),
    u32(floor(uv.y)),
  );
  
  var elementIndex = u32(uniforms.width) * pixel.y + pixel.x;
  var colorChanger = data[elementIndex];

  var subtracter = f32(colorChanger) / (uniforms.width * uniforms.height);

  if (fragment_uniforms.highlight == 1) {
    return select(
      //If element is above halfHeight, highlight green
      vec4<f32>(vec3<f32>(0.0, 1.0 - subtracter, 0.0).rgb, 1.0),
      //If element is below halfheight, highlight red
      vec4<f32>(vec3<f32>(1.0 - subtracter, 0.0, 0.0).rgb, 1.0),
      elementIndex % uniforms.blockHeight < uniforms.blockHeight / 2
    );
  }

  var color: vec3<f32> = vec3f(
    1.0 - subtracter
  );

  return vec4<f32>(color.rgb, 1.0);
}
