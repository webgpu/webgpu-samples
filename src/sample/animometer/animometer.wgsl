struct Time {
  value : f32;
};

struct Uniforms {
  scale : f32;
  offsetX : f32;
  offsetY : f32;
  scalar : f32;
  scalarOffset : f32;
};

@binding(0) @group(0) var<uniform> time : Time;
@binding(0) @group(1) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>;
  @location(0) v_color : vec4<f32>;
};

@stage(vertex)
fn vert_main(@location(0) position : vec4<f32>,
        @location(1) color : vec4<f32>) -> VertexOutput {
    var fade : f32 = (uniforms.scalarOffset + time.value * uniforms.scalar / 10.0) % 1.0;
    if (fade < 0.5) {
        fade = fade * 2.0;
    } else {
        fade = (1.0 - fade) * 2.0;
    }
    var xpos : f32 = position.x * uniforms.scale;
    var ypos : f32 = position.y * uniforms.scale;
    var angle : f32 = 3.14159 * 2.0 * fade;
    var xrot : f32 = xpos * cos(angle) - ypos * sin(angle);
    var yrot : f32 = xpos * sin(angle) + ypos * cos(angle);
    xpos = xrot + uniforms.offsetX;
    ypos = yrot + uniforms.offsetY;
    var output : VertexOutput;
    output.v_color = vec4<f32>(fade, 1.0 - fade, 0.0, 1.0) + color;
    output.Position = vec4<f32>(xpos, ypos, 0.0, 1.0);
    return output;
}

@stage(fragment)
fn frag_main(@location(0) v_color : vec4<f32>) -> @location(0) vec4<f32> {
  return v_color;
}