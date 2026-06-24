// Patch embedding compute shader.
// Takes a 224x224x3 image and produces (197, 192) token embeddings:
// 196 patches (14x14 grid of 16x16 patches) + 1 CLS token.
// Each patch is flattened (16*16*3 = 768) then linearly projected to dim 192.
// The inner loop is a naive dot product (768 iterations per thread) for clarity;
// a production implementation would use tiled shared-memory matmul.

struct Params {
  imgSize: u32,   // 224
  patchSize: u32, // 16
  numPatches: u32, // 196
  channels: u32,   // 3
  dim: u32,        // 192
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> image: array<f32>;      // (224*224*3)
@group(0) @binding(2) var<storage, read> projWeight: array<f32>; // (768, 192) = (patchSize*patchSize*channels, dim)
@group(0) @binding(3) var<storage, read> projBias: array<f32>;   // (192)
@group(0) @binding(4) var<storage, read> clsToken: array<f32>;   // (192)
@group(0) @binding(5) var<storage, read> posEmbed: array<f32>;   // (197, 192)
@group(0) @binding(6) var<storage, read_write> output: array<f32>; // (197, 192)

// Compute patch embeddings + CLS token + position embeddings
@compute @workgroup_size(256)
fn main(
  @builtin(global_invocation_id) gid: vec3u,
) {
  let idx = gid.x;
  let numTokens = params.numPatches + 1u; // 197
  let D = params.dim;
  let totalElements = numTokens * D;

  if (idx >= totalElements) { return; }

  let token = idx / D;
  let d = idx % D;

  var val = 0.0;

  if (token == 0u) {
    // CLS token
    val = clsToken[d];
  } else {
    // Patch embedding: flatten patch pixels, project to dim
    let patchIdx = token - 1u;
    let patchSize = params.patchSize;
    let imgSize = params.imgSize;
    let channels = params.channels;
    let patchesPerRow = imgSize / patchSize; // 14

    let patchRow = patchIdx / patchesPerRow;
    let patchCol = patchIdx % patchesPerRow;
    let startY = patchRow * patchSize;
    let startX = patchCol * patchSize;

    // Linear projection: sum over flattened patch
    val = projBias[d];
    let flatDim = patchSize * patchSize * channels; // 768
    for (var i = 0u; i < flatDim; i++) {
      let c = i % channels;
      let pixelInPatch = i / channels;
      let py = pixelInPatch / patchSize;
      let px = pixelInPatch % patchSize;
      let imgY = startY + py;
      let imgX = startX + px;
      let pixelVal = image[(imgY * imgSize + imgX) * channels + c];
      val += pixelVal * projWeight[i * D + d];
    }
  }

  // Add position embedding
  val += posEmbed[idx];

  output[idx] = val;
}
