// Apply attention weights to value vectors.
//
// For each token, computes a weighted sum of all value vectors using the
// attention probabilities from softmax. Tokens that received high attention
// scores contribute more to the output. This is how the model "reads from"
// the patches it decided to attend to.
//
// Each thread computes one element of the (N, D) output, where the column
// index maps to a specific head and position within that head.

struct Params {
  N: u32,        // number of tokens (197)
  D: u32,        // model dimension (192)
  numHeads: u32, // number of attention heads (3)
  headDim: u32,  // dimension per head (64)
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> scoreBuf: array<f32>;  // (numHeads, N, N)
@group(0) @binding(2) var<storage, read> vBuf: array<f32>;      // (N, D)
@group(0) @binding(3) var<storage, read_write> output: array<f32>; // (N, D)

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let N = params.N;
  let D = params.D;
  let numHeads = params.numHeads;
  let headDim = params.headDim;

  if (idx >= N * D) { return; }

  let row = idx / D;
  let col = idx % D;
  let head = col / headDim;
  let d = col % headDim;

  var val = 0.0;
  let scoreBase = head * N * N + row * N;
  for (var j = 0u; j < N; j++) {
    val += scoreBuf[scoreBase + j] * vBuf[j * D + head * headDim + d];
  }
  output[idx] = val;
}
