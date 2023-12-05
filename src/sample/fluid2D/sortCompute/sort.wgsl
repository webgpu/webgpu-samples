// In Sebastian Lague's code
// gpuSort.setBuffers(spatialIndices (VEC3 Of index, key, hash) and spatial offsets (uint))

// Entries is the same as spatialIndices
// Offsets is the same as spatialOffsets

// For more on bitonic merge sort, check the bitonicSort example.
// For this sort, one should be reasonably assured that once a sort op touches a piece of data within the workload, it never touches it again

struct Uniforms {
  algo: u32,
  blockHeight: u32,
}

struct SpatialEntry {
  index: u32,
  hash: u32, 
  key: u32
}

var<workgroup> local_data: array<SpatialEntry, 512>;

@group(0) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

fn local_compare_and_swap(idx_before: u32, idx_after: u32) {
  if (local_data[idx_after] < local_data[idx_before]) {
    var temp: u32 = local_data[idx_before];
    local_data[idx_before] = local_data[idx_after];
    local_data[idx_after] = temp;
  }
  return;
}

fn get_flip_indices(thread_id: u32, block_height: u32) -> vec2<u32> {
  let block_offset: u32 = ((2 * thread_id) / block_height) * block_height;
  let half_height = block_height / 2;
  var idx: vec2<u32> = vec2<u32>(
    thread_id % half_height, block_height - (thread_id % half_height) - 1,
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn get_disperse_indices(thread_id: u32, block_height: u32) -> vec2<u32> {
  var block_offset: u32 = ((2 * thread_id) / block_height) * block_height;
  let half_height = block_height / 2;
	var idx: vec2<u32> = vec2<u32>(
    thread_id % half_height, (thread_id % half_height) + half_height
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn global_compare_and_swap(idx_before: u32, idx_after: u32) {
  if (spatial_indices[idx_after].key < spatial_indices[idx_before].key) {
    var temp: SpatialEntry = spatial_indices[idx_before];
    spatial_indices[idx_before] = spatial_indices[idx_after];
    spatial_indices[idx_after] = temp;
  } 
}

@compute @workgroup_size(256, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {

  let offset = ${threadsPerWorkgroup} * 2 * workgroup_id.x;
  if (uniforms.algo <= 2) {
    local_data[local_id.x * 2] = spatial_indices[offset + local_id.x * 2];
    local_data[local_id.x * 2 + 1] = input_data[offset + local_id.x * 2 + 1];
  }

  workgroupBarrier();

  switch uniforms.algo {
    case 1: { // Local Flip
      let idx = get_flip_indices(local_id.x, uniforms.blockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 2: { // Local Disperse
      let idx = get_disperse_indices(local_id.x, uniforms.blockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 3: { // Global Flip
      let idx = get_flip_indices(global_id.x, uniforms.blockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    case 4: { 
      let idx = get_disperse_indices(global_id.x, uniforms.blockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    default: { 
      
    }
  }

  workgroupBarrier();

  if (uniforms.algo <= 2) {
    output_data[offset + local_id.x * 2] = local_data[local_id.x * 2];
    output_data[offset + local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];
  }
}
