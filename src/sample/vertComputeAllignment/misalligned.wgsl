// We only index and write into half of the mesh's vertices...
// Since the vertex information passed into our compute shader will be misalligned, it will skip a f32 of vertex data during each invocation
// Meaning later invocations would be attempting to write to data that doesn't exist
// Example:
// 4 vertices with 1 vec3<f32> position element
//    v1         v2        v3           v4
// 1, 0, 1,   0, 1, 0,   0, 0, 1,    1, 0, -1
// Data shader will access if vertex data is passed in as vec3<f32>
//    v1      skip     v2     skip      v3     skip       v4
//  1, 0, 1   |0|   1, 0, 0   |0|    1, 1, 0   |-1|      error

// Although the correct shader could properly index into each vertex if our shader took vec3<f32> allignment of 16 bytes into account
// We only index into half the vertices across both so the effect of improper alligment is made clear.

struct VertexUniforms {
  count: u32,
  position_stride: u32,
}

@group(0) @binding(0) var<uniform> vertex_uniforms: VertexUniforms;
// In WGSL compute shaders, vec3<f32> arrays are alligned to 16 bytes per element
// A tightly packed array of 12 byte vec3<f32> elements will be misalligned
// since the shader will access that data in 16 byte chunks
@group(0) @binding(1) var<storage, read_write> current_positions: array<vec3<f32>>;
@group(1) @binding(1) var<storage, read> correct_positions: array<f32>;

@compute @workgroup_size(64)
fn passThrough(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  // Return early if the vertex index is higher than half the number of vertices
  if (index >= vertex_uniforms.count) { 
    return; 
  }
  
  let position_offset = index * vertex_uniforms.position_stride;
  // Access current position
  let current_position = vec3<f32>(
    correct_positions[position_offset],
    correct_positions[position_offset + 1],
    correct_positions[position_offset + 2]
  );

  current_positions[index] = current_position;
}