struct SpatialEntry {
  index: u32,
  hash: u32,
  key: u32,
}

// Storage Buffers
@group(0) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(0) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

@compute @workgroup_size(256, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let i = global_id.x;
  let key = spatial_indices[i].key;
  let prevKey = select(spacial_indices[i-1].key, 9999999, i == 0);
  if (key != prevKey) {
    spatial_offsets[key] = i;
  }
}
