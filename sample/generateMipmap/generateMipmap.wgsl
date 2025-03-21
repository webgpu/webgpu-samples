const faceMat = array(
  mat3x3f( 0,  0,  -2,  0, -2,   0,  1,  1,   1),   // pos-x
  mat3x3f( 0,  0,   2,  0, -2,   0, -1,  1,  -1),   // neg-x
  mat3x3f( 2,  0,   0,  0,  0,   2, -1,  1,  -1),   // pos-y
  mat3x3f( 2,  0,   0,  0,  0,  -2, -1, -1,   1),   // neg-y
  mat3x3f( 2,  0,   0,  0, -2,   0, -1,  1,   1),   // pos-z
  mat3x3f(-2,  0,   0,  0, -2,   0,  1,  1,  -1));  // neg-z

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
  @location(1) @interpolate(flat, either) baseArrayLayer: u32,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) baseArrayLayer: u32,
) -> VSOutput {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
  vsOutput.baseArrayLayer = baseArrayLayer;
  return vsOutput;
}

@group(0) @binding(0) var ourSampler: sampler;

@group(0) @binding(1) var ourTexture2d: texture_2d<f32>;
@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(ourTexture2d, ourSampler, fsInput.texcoord);
}

@group(0) @binding(1) var ourTexture2dArray: texture_2d_array<f32>;
@fragment fn fs2darray(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(
    ourTexture2dArray,
    ourSampler,
    fsInput.texcoord,
    fsInput.baseArrayLayer);
}

@group(0) @binding(1) var ourTextureCube: texture_cube<f32>;
@fragment fn fscube(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(
    ourTextureCube,
    ourSampler,
    faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1));
}

@group(0) @binding(1) var ourTextureCubeArray: texture_cube_array<f32>;
@fragment fn fscubearray(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(
    ourTextureCubeArray,
    ourSampler,
    faceMat[fsInput.baseArrayLayer] * vec3f(fract(fsInput.texcoord), 1), fsInput.baseArrayLayer);
}