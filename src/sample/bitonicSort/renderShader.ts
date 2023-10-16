/* eslint-disable prettier/prettier */

import { createWGSLUniform } from "./utils";

export const argKeys = [
  //screen width in cells/elements
  'width',
  //screen height in cells/elements
  'height',
];

export const BitonicDisplayShader = () => {
return `
${createWGSLUniform('Uniforms', argKeys)}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> data: array<u32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  //WEBGL shader, uvs are in range of 0 -> 1
  var uv: vec2<f32> = vec2<f32>(
    input.v_uv.x * uniforms.width,
    input.v_uv.y * uniforms.height
  );

  var pixel: vec2<u32> = vec2<u32>(
    u32(floor(uv.x)),
    u32(floor(uv.y)),
  );
  
  var elementIndex = u32(uniforms.width) * pixel.y + pixel.x;
  var colorChanger = data[elementIndex];

  var subtracter = f32(colorChanger) / (uniforms.width * uniforms.height);

  var color: vec3<f32> = vec3f(
    1.0 - subtracter
  );

  return vec4<f32>(color.rgb, 1.0);
}
`;
};