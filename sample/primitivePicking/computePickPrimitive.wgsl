struct Frame {
  viewProjectionMatrix : mat4x4f,
  invViewProjectionMatrix : mat4x4f,
  pickCoord: vec2f,
  pickedPrimitive: u32,
}
@group(0) @binding(0) var<storage, read_write> frame : Frame;
@group(0) @binding(1) var primitiveTex: texture_2d<u32>;

@compute @workgroup_size(1)
fn main() {
  let texel = vec2u(frame.pickCoord);
  frame.pickedPrimitive = textureLoad(primitiveTex, texel, 0).x;
}
