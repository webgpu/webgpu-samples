struct AlgoInfo {
  algo: u32,
  stepHeight: u32,
  highestHeight: u32,
  dispatchSize: u32,
}

var<workgroup> local_data: array<SpatialEntry, 512>;

@group(0) @binding(0) var<storage, read_write> input_spatial_indices: array<SpatialEntry>;
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
    input_spatial_indices[idx_before] = input_spatial_indices[idx_after];
    input_spatial_indices[idx_after] = input_spatial_indices[idx_before];
  } 
}

const ALGO_NONE: u32 = 0;
const ALGO_FLIP_LOCAL: u32 = 1;
const ALGO_DISPERSE_LOCAL: u32 = 2;
const ALGO_FLIP_GLOBAL: u32 = 3;
const ALGO_DISPERSE_GLOBAL: u32 = 4;

@compute @workgroup_size(256, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {
  let offset = 256 * 2 * workgroup_id.x;
  // If we will perform a local swap, then populate the local data
  if (algo_info[0].algo <= 2) {
    // Assign range of input_data to local_data.
    // Range cannot exceed maxWorkgroupsX * 2
    // Each thread will populate the workgroup data... (1 thread for every 2 elements)
    local_data[local_id.x * 2] = input_spatial_indices[offset + local_id.x * 2];
    local_data[local_id.x * 2 + 1] = input_spatial_indices[offset + local_id.x * 2 + 1];
  }

  //...and wait for each other to finish their own bit of data population.
  workgroupBarrier();

  switch algo_info[0].algo {
    case 1: { // Local Flip
      let idx = get_flip_indices(local_id.x, algo_info[0].stepHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 2: { // Local Disperse
      let idx = get_disperse_indices(local_id.x, algo_info[0].stepHeight);
      local_compare_and_swap(idx.x, idx.y);
    } 
    case 3: { // Global Flip
      let idx = get_flip_indices(global_id.x, algo_info[0].stepHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    case 4: { 
      let idx = get_disperse_indices(global_id.x, algo_info[0].stepHeight);
      global_compare_and_swap(idx.x, idx.y);
    }
    default: { 
      
    }
  }

  // Ensure that all threads have swapped their own regions of data
  workgroupBarrier();

  if (algo_info[0].algo <= ALGO_DISPERSE_LOCAL) {
    //Repopulate global data with local data
    input_spatial_indices[offset + local_id.x * 2] = local_data[local_id.x * 2];
    input_spatial_indices[offset + local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];
  }

  workgroupBarrier();

  if (global_id.x == (256 * algo_info[0].dispatchSize) - 1) {
    let info = &algo_info[0];
    (*info).stepHeight /= 2;
    if ((*info).stepHeight == 1) {
      let highest = (*info).highestHeight * 2;
      (*info).highestHeight = highest;
      (*info).stepHeight = highest;
      (*info).algo = select(ALGO_FLIP_LOCAL, ALGO_FLIP_GLOBAL, highest > 512);
    } else {
      (*info).algo = select(ALGO_DISPERSE_LOCAL, ALGO_DISPERSE_GLOBAL, (*info).stepHeight > 512);
    }
  }
}
