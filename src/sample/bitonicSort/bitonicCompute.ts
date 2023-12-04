export const computeArgKeys = ['width', 'height', 'algo', 'blockHeight'];

export const NaiveBitonicCompute = (workgroupSize: number) => {
  if (workgroupSize % 2 !== 0 || workgroupSize > 256) {
    workgroupSize = 256;
  }
  // Ensure that workgroupSize is half the number of elements
  return `

struct Uniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

// Create local workgroup data that can contain all elements
var<workgroup> local_data: array<u32, ${workgroupSize * 2}>;

// Define groups (functions refer to this data)
@group(0) @binding(0) var<storage, read> input_data: array<u32>;
@group(0) @binding(1) var<storage, read_write> output_data: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var<storage, read_write> counter: atomic<u32>;

// Compare and swap values in local_data
fn local_compare_and_swap(idx_before: u32, idx_after: u32) {
  //idx_before should always be < idx_after
  if (local_data[idx_after] < local_data[idx_before]) {
    atomicAdd(&counter, 1);
    var temp: u32 = local_data[idx_before];
    local_data[idx_before] = local_data[idx_after];
    local_data[idx_after] = temp;
  }
  return;
}

// invoke_id goes from 0 to workgroupSize
fn get_flip_indices(invoke_id: u32, block_height: u32) -> vec2<u32> {
  // Caculate index offset (i.e move indices into correct block)
  let block_offset: u32 = ((2 * invoke_id) / block_height) * block_height;
  let half_height = block_height / 2;
  // Calculate index spacing
  var idx: vec2<u32> = vec2<u32>(
    invoke_id % half_height, block_height - (invoke_id % half_height) - 1,
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn get_disperse_indices(invoke_id: u32, block_height: u32) -> vec2<u32> {
  var block_offset: u32 = ((2 * invoke_id) / block_height) * block_height;
  let half_height = block_height / 2;
	var idx: vec2<u32> = vec2<u32>(
    invoke_id % half_height, (invoke_id % half_height) + half_height
  );
  idx.x += block_offset;
  idx.y += block_offset;
  return idx;
}

fn global_compare_and_swap(idx_before: u32, idx_after: u32) {
  if (input_data[idx_after] < input_data[idx_before]) {
    output_data[idx_before] = input_data[idx_after];
    output_data[idx_after] = input_data[idx_before];
  } 
}

// Constants/enum
const ALGO_NONE = 0;
const ALGO_LOCAL_FLIP = 1;
const ALGO_LOCAL_DISPERSE = 2;
const ALGO_GLOBAL_FLIP = 3;

// Our compute shader will execute specified # of invocations or elements / 2 invocations
@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
  @builtin(workgroup_id) workgroup_id: vec3<u32>,
) {

  let offset = ${workgroupSize} * 2 * workgroup_id.x;
  // If we will perform a local swap, then populate the local data
  if (uniforms.algo <= 2) {
    // Assign range of input_data to local_data.
    // Range cannot exceed maxWorkgroupsX * 2
    // Each invocation will populate the workgroup data... (1 invocation for every 2 elements)
    local_data[local_id.x * 2] = input_data[offset + local_id.x * 2];
    local_data[local_id.x * 2 + 1] = input_data[offset + local_id.x * 2 + 1];
  }

  //...and wait for each other to finish their own bit of data population.
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

  // Ensure that all invocations have swapped their own regions of data
  workgroupBarrier();

  if (uniforms.algo <= ALGO_LOCAL_DISPERSE) {
    //Repopulate global data with local data
    output_data[offset + local_id.x * 2] = local_data[local_id.x * 2];
    output_data[offset + local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];
  }

}`;
};
