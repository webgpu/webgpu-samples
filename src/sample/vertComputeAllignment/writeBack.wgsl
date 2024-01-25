// Shader which repopulates vertex buffer with the correct data
@group(0) @binding(1) var<storage, read_write> current_positions: array<f32>;
@group(1) @binding(0) var<storage, read> correct_positions: array<f32>;
@group(1) @binding(1) var<uniform> num_floats: u32;

@compute @workgroup_size(64)
fn writeBack(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let index = global_id.x;
  // Return early if the vertex index is higher than half the number of vertices
  if (index >= num_floats) { 
    return; 
  }
  current_positions[index] = correct_positions[index];
}