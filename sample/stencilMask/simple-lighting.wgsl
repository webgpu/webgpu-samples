struct Uniforms {
  world: mat4x4f,
  color: vec4f,
};

struct SharedUniforms {
  viewProjection: mat4x4f,
  lightDirection: vec3f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<uniform> sharedUni: SharedUniforms;

struct MyVSInput {
    @location(0) position: vec4f,
    @location(1) normal: vec3f,
    @location(2) texcoord: vec2f,
};

struct MyVSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) texcoord: vec2f,
};

@vertex
fn myVSMain(v: MyVSInput) -> MyVSOutput {
  var vsOut: MyVSOutput;
  vsOut.position = sharedUni.viewProjection * uni.world * v.position;
  vsOut.normal = (uni.world * vec4f(v.normal, 0.0)).xyz;
  vsOut.texcoord = v.texcoord;
  return vsOut;
}

@fragment
fn myFSMain(v: MyVSOutput) -> @location(0) vec4f {
  let diffuseColor = uni.color;
  let a_normal = normalize(v.normal);
  let l = dot(a_normal, sharedUni.lightDirection) * 0.5 + 0.5;
  return vec4f(diffuseColor.rgb * l, diffuseColor.a);
}