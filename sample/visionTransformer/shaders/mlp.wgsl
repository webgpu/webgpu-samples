// MLP (feed-forward network): the "thinking" part of each transformer block.
//
// After attention gathers information from other tokens, the MLP processes
// each token independently through two linear layers with a GELU activation:
//   hidden = GELU(input @ W1 + b1)    — expand from 192 to 768 dims
//   output = hidden @ W2 + b2          — project back from 768 to 192 dims
//
// The 4x expansion lets the network learn richer intermediate representations.
// Two entry points share the same binding layout: 'linearGelu' (fused first
// layer + activation) and 'linear' (plain second layer).

struct Params {
  numRows: u32,  // number of tokens
  inDim: u32,    // input dimension
  outDim: u32,   // output dimension
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> input: array<f32>;
@group(0) @binding(2) var<storage, read> weight: array<f32>;
@group(0) @binding(3) var<storage, read> bias: array<f32>;
@group(0) @binding(4) var<storage, read_write> output: array<f32>;

// Tanh-based GELU approximation. WGSL does not have erf(), so we use the
// standard approximation from Hendrycks & Gimpel (2016). The max error vs
// exact GELU is ~3e-4, which is negligible for inference.
fn gelu(x: f32) -> f32 {
  let c = 0.7978845608; // sqrt(2/pi)
  let inner = c * (x + 0.044715 * x * x * x);
  return 0.5 * x * (1.0 + tanh(inner));
}

// Linear + GELU: output = GELU(input @ weight + bias)
@compute @workgroup_size(256)
fn linearGelu(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let numRows = params.numRows;
  let inDim = params.inDim;
  let outDim = params.outDim;

  if (idx >= numRows * outDim) { return; }

  let row = idx / outDim;
  let col = idx % outDim;

  var val = bias[col];
  for (var k = 0u; k < inDim; k++) {
    val += input[row * inDim + k] * weight[k * outDim + col];
  }
  output[idx] = gelu(val);
}

// Plain linear: output = input @ weight + bias
@compute @workgroup_size(256)
fn linear(@builtin(global_invocation_id) gid: vec3u) {
  let idx = gid.x;
  let numRows = params.numRows;
  let inDim = params.inDim;
  let outDim = params.outDim;

  if (idx >= numRows * outDim) { return; }

  let row = idx / outDim;
  let col = idx % outDim;

  var val = bias[col];
  for (var k = 0u; k < inDim; k++) {
    val += input[row * inDim + k] * weight[k * outDim + col];
  }
  output[idx] = val;
}
