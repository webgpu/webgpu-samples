// In Sebastian Lague's code
// gpuSort.setBuffers(spatialIndices (VEC3 Of index, key, hash) and spatial offsets (uint))

// For more on bitonic merge sort, check the bitonicSort example.
export const NaiveBitonicCompute = (workgroupSize: number) => {
  if (workgroupSize % 2 !== 0 || workgroupSize > 256) {
    workgroupSize = 256;
  }
  return `

struct AlgoInfo {
  algo: u32,
  stepBlockHeight: u32,
  highestBlockHeight: u32,
  dispatchSize: u32,
}

struct SpatialEntry {
  index: u32,
  hash: u32,
  key: u32
}

var<workgroup> local_data: array<SpatialEntry, ${workgroupSize * 2}>;

@group(0) @binding(0) var<storage, read_write> input_spatial_indices: array<SpatialEntry>;
@group(0) @binding(1) var<storage, read_write> output_spatial_indices: array<SpatialEntry>;
@group(1) @binding(0) var<storage, read_write> algo_info: array<AlgoInfo>;

fn local_compare_and_swap(idx_before: u32, idx_after: u32) {
  if (local_data[idx_after].key < local_data[idx_before].key) {
    var temp: SpatialEntry = local_data[idx_before];
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
  if (input_spatial_indices[idx_after].key < input_spatial_indices[idx_before].key) {
    output_spatial_indices[idx_before] = input_spatial_indices[idx_after];
    output_spatial_indices[idx_after] = input_spatial_indices[idx_before];
  } 
}

const ALGO_NONE: u32 = 0;
const ALGO_FLIP_LOCAL: u32 = 1;
const ALGO_DISPERSE_LOCAL: u32 = 2;
const ALGO_FLIP_GLOBAL: u32 = 3;
const ALGO_DISPERSE_GLOBAL: u32 = 4;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  var testEntry: SpatialEntry;
  testEntry.key = 2;
  input_spatial_indices[local_id.x * 2] = testEntry;
  input_spatial_indices[local_id.x * 2 + 1] = testEntry;
}`;
};
