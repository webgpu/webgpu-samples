// Attention score computation: how much should query token qi attend to key token ki?
//
// For each attention head, computes the scaled dot product between the query
// vector of token qi and the key vector of token ki:
//   score = (Q[qi] . K[ki]) / sqrt(head_dim)
//
// The scaling by 1/sqrt(head_dim) prevents dot products from growing too large
// with increasing dimension, which would push softmax into saturation.
// Each thread computes one element of the (numHeads, N, N) score tensor.

struct Params {
  N: u32,        // number of tokens (197)
  D: u32,        // model dimension (192)
  numHeads: u32, // number of attention heads (3)
  headDim: u32,  // dimension per head (64)
  scale: f32,    // 1/sqrt(headDim)
  layerIdx: u32, // which layer for attnWeights storage offset
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> qBuf: array<f32>;     // (N, D)
@group(0) @binding(2) var<storage, read> kBuf: array<f32>;     // (N, D)
@group(0) @binding(3) var<storage, read_write> scoreBuf: array<f32>; // (numHeads, N, N)

// Compute raw scores
@compute @workgroup_size(256)
fn computeScores(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let N = params.N;
  let numHeads = params.numHeads;
  let headDim = params.headDim;
  let D = params.D;
  let totalScores = numHeads * N * N;

  if (idx >= totalScores) { return; }

  let head = idx / (N * N);
  let remainder = idx % (N * N);
  let qi = remainder / N;
  let ki = remainder % N;

  let headOffset = head * headDim;

  var dot = 0.0;
  for (var d = 0u; d < headDim; d++) {
    dot += qBuf[qi * D + headOffset + d] * kBuf[ki * D + headOffset + d];
  }

  scoreBuf[idx] = dot * params.scale;
}
