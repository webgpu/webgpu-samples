// Softmax normalization of attention scores.
//
// Converts raw attention scores into a probability distribution: for each
// query token, the attention weights over all key tokens sum to 1.0.
// Uses the numerically stable form: subtract the row maximum before
// exponentiating to prevent overflow.
//
// The resulting attention weights are also stored to a readback buffer
// for visualization — they show which image patches the model attends to.

struct Params {
  N: u32,
  numHeads: u32,
  layerIdx: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> scoreBuf: array<f32>;    // (numHeads, N, N)
@group(0) @binding(2) var<storage, read_write> attnWeights: array<f32>; // (numLayers, numHeads, N, N)

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let N = params.N;
  let numHeads = params.numHeads;
  let totalRows = numHeads * N;

  if (idx >= totalRows) { return; }

  let base = idx * N;

  // Find max for numerical stability
  var m = -1e30;
  for (var i = 0u; i < N; i++) {
    m = max(m, scoreBuf[base + i]);
  }

  // Exp and sum
  var s = 0.0;
  for (var i = 0u; i < N; i++) {
    let e = exp(scoreBuf[base + i] - m);
    scoreBuf[base + i] = e;
    s += e;
  }

  // Normalize and store
  let layerOffset = params.layerIdx * numHeads * N * N;
  for (var i = 0u; i < N; i++) {
    let val = scoreBuf[base + i] / s;
    scoreBuf[base + i] = val;
    attnWeights[layerOffset + idx * N + i] = val;
  }
}
