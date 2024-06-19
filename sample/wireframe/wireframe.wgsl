struct Uniforms {
  worldViewProjectionMatrix: mat4x4f,
  worldMatrix: mat4x4f,
  color: vec4f,
};

struct LineUniforms {
  stride: u32,
  thickness: f32,
  alphaThreshold: f32,
};

struct VSOut {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> indices: array<u32>;
@group(0) @binding(3) var<uniform> line: LineUniforms;

@vertex fn vsIndexedU32(@builtin(vertex_index) vNdx: u32) -> VSOut {
  // indices make a triangle so for every 3 indices we need to output
  // 6 values
  let triNdx = vNdx / 6;
  // 0 1 0 1 0 1  0 1 0 1 0 1  vNdx % 2
  // 0 0 1 1 2 2  3 3 4 4 5 5  vNdx / 2
  // 0 1 1 2 2 3  3 4 4 5 5 6  vNdx % 2 + vNdx / 2
  // 0 1 1 2 2 0  0 1 1 2 2 0  (vNdx % 2 + vNdx / 2) % 3
  let vertNdx = (vNdx % 2 + vNdx / 2) % 3;
  let index = indices[triNdx * 3 + vertNdx];

  // note:
  //
  // * if your indices are U16 you could use this
  //
  //    let indexNdx = triNdx * 3 + vertNdx;
  //    let twoIndices = indices[indexNdx / 2];  // indices is u32 but we want u16
  //    let index = (twoIndices >> ((indexNdx & 1) * 16)) & 0xFFFF;
  //
  // * if you're not using indices you could use this
  //
  //    let index = triNdx * 3 + vertNdx;

  let pNdx = index * line.stride;
  let position = vec4f(positions[pNdx], positions[pNdx + 1], positions[pNdx + 2], 1);

  var vOut: VSOut;
  vOut.position = uni.worldViewProjectionMatrix * position;
  return vOut;
}

@fragment fn fs() -> @location(0) vec4f {
  return uni.color + vec4f(0.5);
}

struct BarycentricCoordinateBasedVSOutput {
  @builtin(position) position: vec4f,
  @location(0) barycenticCoord: vec3f,
};

@vertex fn vsIndexedU32BarycentricCoordinateBasedLines(
  @builtin(vertex_index) vNdx: u32
) -> BarycentricCoordinateBasedVSOutput {
  let vertNdx = vNdx % 3;
  let index = indices[vNdx];

  // note:
  //
  // * if your indices are U16 you could use this
  //
  //    let twoIndices = indices[vNdx / 2];  // indices is u32 but we want u16
  //    let index = (twoIndices >> ((vNdx & 1) * 16)) & 0xFFFF;
  //
  // * if you're not using indices you could use this
  //
  //    let index = vNdx;

  let pNdx = index * line.stride;
  let position = vec4f(positions[pNdx], positions[pNdx + 1], positions[pNdx + 2], 1);

  var vsOut: BarycentricCoordinateBasedVSOutput;
  vsOut.position = uni.worldViewProjectionMatrix * position;

  // emit a barycentric coordinate
  vsOut.barycenticCoord = vec3f(0);
  vsOut.barycenticCoord[vertNdx] = 1.0;
  return vsOut;
}

fn edgeFactor(bary: vec3f) -> f32 {
  let d = fwidth(bary);
  let a3 = smoothstep(vec3f(0.0), d * line.thickness, bary);
  return min(min(a3.x, a3.y), a3.z);
}

@fragment fn fsBarycentricCoordinateBasedLines(
  v: BarycentricCoordinateBasedVSOutput
) -> @location(0) vec4f {
  let a = 1.0 - edgeFactor(v.barycenticCoord);
  if (a < line.alphaThreshold) {
    discard;
  }

  return vec4((uni.color.rgb + 0.5) * a, a);
}
