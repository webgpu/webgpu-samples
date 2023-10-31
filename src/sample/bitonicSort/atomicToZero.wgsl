@group(0) @binding(3) var<storage, read_write> counter: atomic<u32>;

@compute @workgroup_size(1, 1, 1)
fn atomicToZero() {
  let counterValue = atomicLoad(&counter);
  atomicSub(&counter, counterValue);
}