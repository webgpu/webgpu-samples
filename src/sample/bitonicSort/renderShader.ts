import { createWGSLUniform } from './utils';

// Pass screen width and height in cells/elements as uniforms
export const argKeys = ['width', 'height'];

export const BitonicDisplayShader = () => {
  return `
${createWGSLUniform('Uniforms', argKeys)}

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<storage, read> data: array<u32>;

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

  var color: vec3<f32> = vec3f(
    1.0 - subtracter
  );

  return vec4<f32>(color.rgb, 1.0);
}
`;
};
