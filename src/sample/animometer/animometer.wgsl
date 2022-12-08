struct Time {
  value : f32,
}

struct Uniforms {
  scale : f32,
  offsetX : f32,
  offsetY : f32,
  scalar : f32,
  scalarOffset : f32,
}

@binding(0) @group(0) var<uniform> time : Time;
@binding(0) @group(1) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f,
}

const PI = 3.14159265359;

@vertex
fn vert_main(
  @location(0) pos_in : vec4f,
  @location(1) color : vec4f
) -> VertexOutput {
  var fade = fract(uniforms.scalarOffset + time.value * uniforms.scalar / 10);
  if (fade < 0.5) {
    fade = fade * 2;
  } else {
    fade = (1 - fade) * 2;
  }
  var angle = PI * 2 * fade;
  var pos = pos_in.xy;
  pos *= uniforms.scale;
  pos *= mat2x2(cos(angle), -sin(angle), sin(angle), cos(angle));
  pos += vec2(uniforms.offsetX, uniforms.offsetY);

  var output : VertexOutput;
  output.color = vec4(fade, 1 - fade, 0, 1) + color;
  output.position = vec4(pos.xy, 0, 1);
  return output;
}

@fragment
fn frag_main(@location(0) color : vec4f) -> @location(0) vec4f {
  return color;
}
