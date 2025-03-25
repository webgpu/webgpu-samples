struct VSInput {
  @location(0) position: vec4f,
  @location(1) texcoord: vec3f,
  @builtin(instance_index) iNdx: u32,
};

struct VSOutputFSInput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec3f,
  @location(1) @interpolate(flat, either) instanceNdx: u32,
};

struct Uniforms {
  matrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var s: sampler;
@group(0) @binding(2) var t_2d: texture_2d<f32>;
@group(0) @binding(2) var t_2d_array: texture_2d_array<f32>;
@group(0) @binding(2) var t_cube: texture_cube<f32>;
@group(0) @binding(2) var t_cube_array: texture_cube_array<f32>;

@vertex fn vs_2d(v: VSInput) -> VSOutputFSInput {
  return VSOutputFSInput(
    uni.matrix * v.position,
    v.texcoord,
    v.iNdx,
  );
}

@vertex fn vs_2d_array(v: VSInput) -> VSOutputFSInput {
  return VSOutputFSInput(
    uni.matrix * v.position,
    v.texcoord,
    v.iNdx,
  );
}

@vertex fn vs_cube(v: VSInput) -> VSOutputFSInput {
  return VSOutputFSInput(
    uni.matrix * v.position,
    v.position.xyz,
    v.iNdx,
  );
}

@vertex fn vs_cube_array(v: VSInput) -> VSOutputFSInput {
  return VSOutputFSInput(
    uni.matrix * v.position,
    v.position.xyz,
    v.iNdx,
  );
}

@fragment fn fs_2d(f: VSOutputFSInput) -> @location(0) vec4f {
  return textureSample(t_2d, s, f.texcoord.xy);
}

@fragment fn fs_2d_array(f: VSOutputFSInput) -> @location(0) vec4f {
  return textureSample(t_2d_array, s, f.texcoord.xy, f.instanceNdx % textureNumLayers(t_2d_array));
}

@fragment fn fs_cube(f: VSOutputFSInput) -> @location(0) vec4f {
  return textureSample(t_cube, s, f.texcoord);
}

@fragment fn fs_cube_array(f: VSOutputFSInput) -> @location(0) vec4f {
  return textureSample(t_cube_array, s, f.texcoord, f.instanceNdx % textureNumLayers(t_cube_array));
}