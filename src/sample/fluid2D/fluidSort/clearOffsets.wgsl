// Storage Buffers
@group(0) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

// Prepare spatial offsets for offset calc step by clearing them
@compute @workgroup_size(256, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  spatial_offsets[global_id.x] = 9999999;
}