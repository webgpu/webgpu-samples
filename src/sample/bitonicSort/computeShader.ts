export const computeArgKeys = ['width', 'height', 'algo', 'blockHeight'];

export const NaiveBitonicCompute = (threadsPerWorkgroup: number) => {
  if (threadsPerWorkgroup % 2 !== 0 || threadsPerWorkgroup > 256) {
    threadsPerWorkgroup = 256;
  }
  //Ensure that workgroupSize is half the number of elements
  return `

struct Uniforms {
  width: f32,
  height: f32,
  algo: u32,
  blockHeight: u32,
}

//Create local workgroup data that can contain all elements
var<workgroup> local_data: array<u32, ${threadsPerWorkgroup * 2}>;

//Swap values in local_data
fn swap(idx_before: u32, idx_after: u32) {
  //idx_before should always be < idx_after
  if (local_data[idx_after] < local_data[idx_before]) {
    var temp: u32 = local_data[idx_before];
    local_data[idx_before] = local_data[idx_after];
    local_data[idx_after] = temp;
  }
  return;
}

//thread_id goes from 0 to threadsPerWorkgroup
fn prepare_flip(thread_id: u32, block_height: u32) {
  let q: u32 = ((2 * thread_id) / block_height) * block_height;
  let half_height = block_height / 2;
  var idx: vec2<u32> = vec2<u32>(
    thread_id % half_height, block_height - (thread_id % half_height) - 1,
  );
  idx.x += q;
  idx.y += q;
  swap(idx.x, idx.y);
}

fn prepare_disperse(thread_id: u32, block_height: u32) {
  var q: u32 = ((2 * thread_id) / block_height) * block_height;
  let half_height = block_height / 2;
	var idx: vec2<u32> = vec2<u32>(
    thread_id % half_height, (thread_id % half_height) + half_height
  );
  idx.x += q;
  idx.y += q;
	swap(idx.x, idx.y);
}

fn prepare_flip_and_disperse(thread_id: u32, block_height: u32) {
  swap(0, 0);
}

@group(0) @binding(0) var<storage, read> input_data: array<u32>;
@group(0) @binding(1) var<storage, read_write> output_data: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

//Our compute shader will execute specified # of threads or elements / 2 threads
@compute @workgroup_size(${threadsPerWorkgroup}, 1, 1)
fn computeMain(
  @builtin(global_invocation_id) global_id: vec3<u32>,
  @builtin(local_invocation_id) local_id: vec3<u32>,
) {
  //Each thread will populate the workgroup data... (1 thread for every 2 elements)
  local_data[local_id.x * 2] = input_data[local_id.x * 2];
  local_data[local_id.x * 2 + 1] = input_data[local_id.x * 2 + 1];

  //...and wait for each other to finish their own bit of data population.
  workgroupBarrier();

  var num_elements = uniforms.width * uniforms.height;

  switch uniforms.algo {
    case 1: { //Local Flip
      prepare_flip(local_id.x, uniforms.blockHeight);
    }
    case 2: { //Local Disperse
      prepare_disperse(local_id.x, uniforms.blockHeight);
    }
    case 3, default: { //Local Flip and Disperse
      prepare_flip_and_disperse(local_id.x, uniforms.blockHeight);
    }
  }

  //Ensure that all threads have swapped their own regions of data
  workgroupBarrier();

  //Repopulate global data with local data
  output_data[local_id.x * 2] = local_data[local_id.x * 2];
  output_data[local_id.x * 2 + 1] = local_data[local_id.x * 2 + 1];

}`;
};
