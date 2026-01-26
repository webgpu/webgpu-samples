enable primitive_index;

struct Frame {
  viewProjectionMatrix : mat4x4f,
  invViewProjectionMatrix : mat4x4f,
  pickCoord : vec2f,
  pickedPrimitive : u32,
}
@group(0) @binding(1) var<uniform> frame : Frame;

struct PassOutput {
  @location(0) color : vec4f,
  @location(1) primitive : u32,
}

@fragment
fn main(
  @location(0) fragNormal : vec3f,
  @builtin(primitive_index) primIndex : u32
) -> PassOutput {
  // Very simple N-dot-L lighting model
  let lightDirection = normalize(vec3f(4, 10, 6));
  let light = dot(normalize(fragNormal), lightDirection) * 0.5 + 0.5;
  let surfaceColor = vec4f(0.8, 0.8, 0.8, 1.0);

  var output : PassOutput;

  // Highlight the primitive if it's the selected one, otherwise shade normally.
  if (primIndex+1 == frame.pickedPrimitive) {
    output.color = vec4f(1.0, 1.0, 0.0, 1.0);
  } else {
    output.color = vec4f(surfaceColor.xyz * light, surfaceColor.a);
  }

  // Adding one to each primitive index so that 0 can mean "nothing picked"
  output.primitive = primIndex+1;
  return output;
}
