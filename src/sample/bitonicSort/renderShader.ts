/* eslint-disable prettier/prettier */

import { createWGSLUniform } from "./utils";

export const argKeys = [
  //screen width in cells/elements
  'width',
  //screen height in cells/elements
  'height',
  //Hovered element position in uv coordinates
  'hoverPosX',
  'hoverPosY',
  //Swapped element position in uv coordinates
  'swapPosX',
  'swapPosY'
];

export const BitonicDisplayShader = () => {
return `
${createWGSLUniform('Uniforms', argKeys)}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

//Mask is calculated in uv coordinates
fn calculateMask(uv: vec2<f32>, pos: vec2<f32>) -> f32 {
  var top = step(
    uv.y, 
    pos.y + 0.5
  );
  var bottom = step(
    pos.y - 0.5, 
    uv.y
  );
  var right = step(uv.x, pos.x + 0.5);
  var left = step(pos.x - 0.5, uv.x);
  return top * bottom * left * right;
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

  var subtracter = (
    1.0 / (uniforms.width * uniforms.height)
  ) * f32(colorChanger);

  var color: vec3<f32> = vec3f(
    1.0 - subtracter
  );

  var hoverMask = calculateMask(
    uv,
    vec2<f32>(uniforms.hoverPosX, uniforms.hoverPosY)
  );

  var swapMask = calculateMask(
    uv,
    vec2<f32>(uniforms.swapPosX, uniforms.swapPosY)
  );

  var red = vec3f(1.0, 0.0, 0.0);
  var green = vec3f(0.0, 1.0, 0.0);

  color = mix(color, red, hoverMask);
  color = mix(color, green, swapMask);

  return vec4<f32>(color.rgb, 1.0);
}
`;
};