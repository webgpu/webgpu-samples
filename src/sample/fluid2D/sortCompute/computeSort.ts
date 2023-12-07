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
@group(1) @binding(0) var<storage, read_write> algorithm_info: array<AlgoInfo>;

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

const ALGO_NONE = 0;
const ALGO_FLIP_LOCAL = 1;
const ALGO_DISPERSE_LOCAL = 2;
const ALGO_FLIP_GLOBAL = 3;
const ALGO_DISPERSE_GLOBAL = 4;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {

  let offset = ${workgroupSize} * 2 * workgroup_id.x;
  if (algorithm_info[0] <= 2) {
    local_data[local_id.x * 2] = input_spatial_indices[offset + local_id.x * 2];
    local_data[local_id.x * 2 + 1] = input_spatial_indices[offset + local_id.x * 2 + 1];
  }

  //...and wait for each other to finish their own bit of data population.
  workgroupBarrier();

  switch algorithm_info[0].algo {
    case ALGO_FLIP_LOCAL: { // Local Flip
      let idx = get_flip_indices(local_id.x, algo_information[0].stepBlockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case ALGO_DISPERSE_LOCAL: { // Local Disperse
      let idx = get_disperse_indices(local_id.x, algo_information[0].stepBlockHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case ALGO_FLIP_GLOBAL: { // Global Flip
      let idx = get_flip_indices(global_id.x, algo_information[0].stepBlockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    case ALGO_DISPERSE_GLOBAL: { // Global Disperse
      let idx = get_disperse_indices(global_id.x, algo_information[0].stepBlockHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    default: { 
      
    }
  }

  workgroupBarrier();

  if (algorithm_info[0].algo <= ALGO_DISPERSE_LOCAL) {
    output_spatial_indices[offset + local_id.x * 2] = local_data[local_id.x * 2];
    output_spatial_indices[offset + local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];
  }

  // Ensure that every workgroup and every invocation within each workgroup has executed before changing
  workgroupBarrier();
  
  // If this invocation is the last invocation within the work-load (not workgroup!)
  if (global_id.x == ${workgroupSize} * algo_information[0].dispatchSize - 1) {
    // Get the maximum span of a swap in the next step
    var nextBlockHeight = algo_information[0].stepBlockHeight;
    nextBlockHeight /= 2;
    // If the calculated span is equal to 1
    if (nextBlockHeight === 1) {
      // Assign the next highest swap span to highestBlockHeight
      let highestBlockHeight = algo_information[0].highestBlockHeight * 2;
      algo_information[0].highestBlockHeight = highestBlockHeight;
      // The next step's swap span will also be highestBlockHeight
      algo_information[0].stepBlockHeight = highestBlockHeight;
      // The algo will execute locally or globally depending on whether the span reaches outside the bounds of a single workgroup
      algo_information[0].algo = select(ALGO_FLIP_LOCAL, ALGO_FLIP_GLOBAL, highestBlockHeight > ${workgroupSize} * 2);
    // Otherwise...
    } else {
      // Use the originally calculated swap span (which shrink by a factor of 2 with each disperse)
      algo_information[0].stepBlockHeight = nextBlockHeight;
      // Calculate whether nextBlockHeight swaps outside the range of a single workgroup
      algo_information[0].algo = select(ALGO_DISPERSE_LOCAL, ALGO_DISPERSE_GLOBAL, nextBlockHeight > ${workgroupSize} * 2);
    }
  }
}`;
};
