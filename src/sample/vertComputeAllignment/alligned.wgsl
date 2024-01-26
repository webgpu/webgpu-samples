struct VertexUniforms {
  count: u32,
  position_stride: u32,
  scale: f32,
  padding: f32,
}

@group(0) @binding(0) var<uniform> vertex_uniforms: VertexUniforms;
@group(0) @binding(1) var<storage, read_write> current_positions: array<f32>;
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
  var current_position = vec3<f32>(
    correct_positions[position_offset],
    correct_positions[position_offset + 1],
    correct_positions[position_offset + 2]
  );

  current_positions[position_offset] = current_position.x;
  current_positions[position_offset + 1] = current_position.y;
  current_positions[position_offset + 2] = current_position.z;
}