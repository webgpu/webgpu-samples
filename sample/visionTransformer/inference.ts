// DeiT-Tiny inference engine
// All compute dispatches use at most 7 storage/uniform bindings per bind group.

import { ModelWeights, createTensorBuffer, DEIT_CONFIG } from './weights';
import patchEmbedWGSL from './shaders/patchEmbed.wgsl';
import layerNormWGSL from './shaders/layerNorm.wgsl';
import mlpWGSL from './shaders/mlp.wgsl';
import attnScoresWGSL from './shaders/attnScores.wgsl';
import attnSoftmaxWGSL from './shaders/attnSoftmax.wgsl';
import attnApplyWGSL from './shaders/attnApply.wgsl';

const C = DEIT_CONFIG;

function ceilDiv(a: number, b: number): number {
  return Math.ceil(a / b);
}

// Reusable pool of uniform buffers to avoid per-dispatch GPU memory allocation.
// Buffers are allocated on first use and retained for subsequent inference runs.
class UniformBufferPool {
  private device: GPUDevice;
  private buffers: GPUBuffer[] = [];
  private index = 0;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  // Reset the pool index at the start of each run. No buffers are freed.
  reset() {
    this.index = 0;
  }

  // Get a uniform buffer, writing the given data into it.
  get(data: ArrayBuffer): GPUBuffer {
    const size = Math.max(data.byteLength, 16);
    if (this.index >= this.buffers.length) {
      this.buffers.push(
        this.device.createBuffer({
          size,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
      );
    }
    const buf = this.buffers[this.index++];
    this.device.queue.writeBuffer(buf, 0, new Uint8Array(data));
    return buf;
  }
}

/**
 * VitInference runs a full DeiT-Tiny vision transformer forward pass in
 * WebGPU compute shaders.
 *
 * The forward pass follows the standard ViT architecture:
 *   1. Patch embedding: split image into 14x14 grid of 16x16 patches,
 *      project each to a 192-dim token, prepend a CLS token, add position embeddings.
 *   2. 12 transformer blocks, each containing:
 *      - Layer norm → multi-head self-attention (3 heads, 64 dims each) → residual add
 *      - Layer norm → MLP (192 → 768 with GELU → 768 → 192) → residual add
 *   3. Final layer norm → classify using the CLS token → 1000-class logits
 *
 * Attention weights from each layer/head are stored for visualization,
 * allowing interactive exploration of what image regions the model attends to.
 */
export class VitInference {
  private device: GPUDevice;
  private uniformPool!: UniformBufferPool;

  // Compute pipelines — each shader uses at most 7 bindings per bind group
  private patchEmbedPipeline!: GPUComputePipeline;
  private layerNormPipeline!: GPUComputePipeline;
  private linearPipeline!: GPUComputePipeline; // plain linear projection
  private linearGeluPipeline!: GPUComputePipeline; // linear + GELU
  private attnScoresPipeline!: GPUComputePipeline;
  private attnSoftmaxPipeline!: GPUComputePipeline;
  private attnApplyPipeline!: GPUComputePipeline;
  private residualAddPipeline!: GPUComputePipeline;

  // Buffers
  private imageBuffer!: GPUBuffer;
  private tokenBuffer!: GPUBuffer; // (197, 192) main token state
  private normBuffer!: GPUBuffer; // (197, 192) output of layer norm
  private qBuffer!: GPUBuffer; // (197, 192)
  private kBuffer!: GPUBuffer; // (197, 192)
  private vBuffer!: GPUBuffer; // (197, 192)
  private attnOutBuffer!: GPUBuffer; // (197, 192) attention-weighted output
  private projOutBuffer!: GPUBuffer; // (197, 192) after output projection
  private scoreBuffer!: GPUBuffer; // (3, 197, 197)
  private hiddenBuffer!: GPUBuffer; // (197, 768) MLP hidden
  private mlpOutBuffer!: GPUBuffer; // (197, 192) MLP output
  private classLogitsBuffer!: GPUBuffer; // (1000)
  private attnWeightsBuffer!: GPUBuffer; // (12, 3, 197, 197) all attention weights
  private logitsReadbackBuffer!: GPUBuffer;
  private attnReadbackBuffer!: GPUBuffer;

  // Weight buffers
  private layerWeights: Map<string, GPUBuffer>[] = [];
  private patchEmbedWeights!: {
    projWeight: GPUBuffer;
    projBias: GPUBuffer;
    clsToken: GPUBuffer;
    posEmbed: GPUBuffer;
  };
  private classHeadWeights!: { weight: GPUBuffer; bias: GPUBuffer };
  private finalNormWeights!: { gamma: GPUBuffer; beta: GPUBuffer };

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async initialize(weights: ModelWeights) {
    this.uniformPool = new UniformBufferPool(this.device);
    this.createPipelines();
    this.createBuffers();
    this.uploadWeights(weights);
  }

  private createPipelines() {
    const device = this.device;

    const makePipeline = (label: string, code: string, entryPoint: string) =>
      device.createComputePipeline({
        label,
        layout: 'auto',
        compute: {
          module: device.createShaderModule({ label, code }),
          entryPoint,
        },
      });

    // Patch embedding: image pixels → token embeddings
    this.patchEmbedPipeline = makePipeline(
      'patchEmbed',
      patchEmbedWGSL,
      'main'
    );
    // Layer normalization: stabilizes activations between layers
    this.layerNormPipeline = makePipeline('layerNorm', layerNormWGSL, 'main');

    // Linear projections (used for Q/K/V, output projection, MLP, and class head).
    // The MLP shader has two entry points with identical bindings: 'linear' (plain)
    // and 'linearGelu' (with GELU activation fused into the output).
    const mlpModule = device.createShaderModule({
      label: 'mlp',
      code: mlpWGSL,
    });
    this.linearGeluPipeline = device.createComputePipeline({
      label: 'linearGelu',
      layout: 'auto',
      compute: { module: mlpModule, entryPoint: 'linearGelu' },
    });
    this.linearPipeline = device.createComputePipeline({
      label: 'linear',
      layout: 'auto',
      compute: { module: mlpModule, entryPoint: 'linear' },
    });

    // Attention is split into three stages to keep bindings per shader low:
    //   1. Scores: Q·K^T scaled by 1/sqrt(head_dim) — measures query-key similarity
    //   2. Softmax: normalizes scores to attention probabilities
    //   3. Apply: weighted sum of values using attention probabilities
    this.attnScoresPipeline = makePipeline(
      'attnScores',
      attnScoresWGSL,
      'computeScores'
    );
    this.attnSoftmaxPipeline = makePipeline(
      'attnSoftmax',
      attnSoftmaxWGSL,
      'main'
    );
    this.attnApplyPipeline = makePipeline('attnApply', attnApplyWGSL, 'main');

    // Element-wise residual addition: enables gradient flow through deep networks
    const residualModule = device.createShaderModule({
      label: 'residualAdd',
      code: `
        @group(0) @binding(0) var<storage, read_write> dst: array<f32>;
        @group(0) @binding(1) var<storage, read> src: array<f32>;
        @group(0) @binding(2) var<uniform> count: u32;

        @compute @workgroup_size(256)
        fn main(@builtin(global_invocation_id) gid: vec3u) {
          if (gid.x >= count) { return; }
          dst[gid.x] = dst[gid.x] + src[gid.x];
        }
      `,
    });
    this.residualAddPipeline = device.createComputePipeline({
      label: 'residualAdd',
      layout: 'auto',
      compute: { module: residualModule, entryPoint: 'main' },
    });
  }

  private createBuffers() {
    const device = this.device;
    const T = C.numTokens * C.dim * 4; // token buffer size in bytes

    const storage = (label: string, size: number, extra = 0) =>
      device.createBuffer({
        label,
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | extra,
      });

    // Input image as normalized float32 RGB
    this.imageBuffer = storage(
      'image',
      C.imgSize * C.imgSize * C.channels * 4,
      GPUBufferUsage.COPY_DST
    );
    // Token embeddings: (197 tokens, 192 dims) — the main state through the network
    this.tokenBuffer = storage('tokens', T, GPUBufferUsage.COPY_DST);
    // Scratch buffer for layer norm output
    this.normBuffer = storage('norm', T);
    // Query, Key, Value projections for attention
    this.qBuffer = storage('Q', T);
    this.kBuffer = storage('K', T);
    this.vBuffer = storage('V', T);
    // Attention-weighted value sum (before output projection)
    this.attnOutBuffer = storage('attnOut', T);
    // Output of attention block (after output projection)
    this.projOutBuffer = storage('projOut', T);
    // Attention scores: (3 heads, 197 queries, 197 keys)
    this.scoreBuffer = storage(
      'attnScores',
      C.numHeads * C.numTokens * C.numTokens * 4
    );
    // MLP hidden activations: expanded from 192 to 768 dims
    this.hiddenBuffer = storage('mlpHidden', C.numTokens * C.mlpHiddenDim * 4);
    // MLP output: projected back from 768 to 192 dims
    this.mlpOutBuffer = storage('mlpOut', T);
    // Classification logits: one score per ImageNet class
    this.classLogitsBuffer = storage('classLogits', C.numClasses * 4);
    // Stored attention weights from all layers for visualization readback
    this.attnWeightsBuffer = storage(
      'attnWeights',
      C.numLayers * C.numHeads * C.numTokens * C.numTokens * 4
    );
    this.logitsReadbackBuffer = device.createBuffer({
      label: 'logitsReadback',
      size: C.numClasses * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    this.attnReadbackBuffer = device.createBuffer({
      label: 'attnReadback',
      size: C.numLayers * C.numHeads * C.numTokens * C.numTokens * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  }

  private uploadWeights(weights: ModelWeights) {
    const device = this.device;
    const t = weights.tensors;

    this.patchEmbedWeights = {
      projWeight: createTensorBuffer(device, t.get('patch_embed.proj.weight')!),
      projBias: createTensorBuffer(device, t.get('patch_embed.proj.bias')!),
      clsToken: createTensorBuffer(device, t.get('cls_token')!),
      posEmbed: createTensorBuffer(device, t.get('pos_embed')!),
    };

    for (let l = 0; l < C.numLayers; l++) {
      const bufs = new Map<string, GPUBuffer>();
      const prefix = `blocks.${l}`;
      for (const name of [
        'attn.qkv.weight',
        'attn.qkv.bias',
        'attn.proj.weight',
        'attn.proj.bias',
        'norm1.weight',
        'norm1.bias',
        'norm2.weight',
        'norm2.bias',
        'mlp.fc1.weight',
        'mlp.fc1.bias',
        'mlp.fc2.weight',
        'mlp.fc2.bias',
      ]) {
        const tensor = t.get(`${prefix}.${name}`);
        if (tensor) bufs.set(name, createTensorBuffer(device, tensor));
      }
      this.layerWeights.push(bufs);
    }

    this.finalNormWeights = {
      gamma: createTensorBuffer(device, t.get('norm.weight')!),
      beta: createTensorBuffer(device, t.get('norm.bias')!),
    };
    this.classHeadWeights = {
      weight: createTensorBuffer(device, t.get('head.weight')!),
      bias: createTensorBuffer(device, t.get('head.bias')!),
    };
  }

  uploadImage(imageData: Float32Array) {
    this.device.queue.writeBuffer(this.imageBuffer, 0, imageData);
  }

  /**
   * Run the full forward pass: image → classification logits + attention maps.
   *
   * All compute work is recorded into a single command encoder and submitted
   * in one GPU queue submission. The results are read back asynchronously
   * via two mapAsync calls in parallel.
   */
  async run(): Promise<{
    logits: Float32Array;
    attnWeights: Float32Array;
    elapsedMs: number;
  }> {
    const device = this.device;
    const startTime = performance.now();
    this.uniformPool.reset();
    const encoder = device.createCommandEncoder();

    // Stage 1: Convert the 224x224 RGB image into 197 token embeddings.
    // The image is split into a 14x14 grid of 16x16-pixel patches, each
    // linearly projected to 192 dimensions. A learnable CLS (classification)
    // token is prepended, and position embeddings are added.
    this.encodePatchEmbed(encoder);

    // Stage 2: Pass tokens through 12 transformer blocks. Each block lets
    // every token attend to every other token (self-attention), then processes
    // each token independently through an MLP. The token representations are
    // progressively refined — early layers detect local features like edges
    // and textures, while later layers capture global semantic relationships.
    for (let l = 0; l < C.numLayers; l++) {
      this.encodeTransformerBlock(encoder, l);
    }

    // Stage 3: Final layer norm + classification. The CLS token (index 0)
    // has aggregated information from all image patches via attention. We
    // project it to 1000 dimensions — one logit per ImageNet class.
    this.encodeLayerNorm(
      encoder,
      this.tokenBuffer,
      this.normBuffer,
      this.finalNormWeights.gamma,
      this.finalNormWeights.beta
    );
    this.encodeClassHead(encoder);

    // Copy both logits and attention weights for readback in one submit
    const attnBytes = C.numLayers * C.numHeads * C.numTokens * C.numTokens * 4;
    encoder.copyBufferToBuffer(
      this.classLogitsBuffer,
      0,
      this.logitsReadbackBuffer,
      0,
      C.numClasses * 4
    );
    encoder.copyBufferToBuffer(
      this.attnWeightsBuffer,
      0,
      this.attnReadbackBuffer,
      0,
      attnBytes
    );

    device.queue.submit([encoder.finish()]);

    // Read both results after a single submit
    const [logits, attnWeights] = await Promise.all([
      this.logitsReadbackBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const data = new Float32Array(
          this.logitsReadbackBuffer.getMappedRange(0, C.numClasses * 4).slice(0)
        );
        this.logitsReadbackBuffer.unmap();
        return data;
      }),
      this.attnReadbackBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const data = new Float32Array(
          this.attnReadbackBuffer.getMappedRange(0, attnBytes).slice(0)
        );
        this.attnReadbackBuffer.unmap();
        return data;
      }),
    ]);

    return { logits, attnWeights, elapsedMs: performance.now() - startTime };
  }

  // --- Dispatch helpers (each uses <= 7 bindings) ---

  private encodePatchEmbed(encoder: GPUCommandEncoder) {
    const device = this.device;
    const params = this.uniformPool.get(
      new Uint32Array([C.imgSize, C.patchSize, C.numPatches, C.channels, C.dim])
        .buffer
    );

    const bg = device.createBindGroup({
      layout: this.patchEmbedPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: this.imageBuffer } },
        { binding: 2, resource: { buffer: this.patchEmbedWeights.projWeight } },
        { binding: 3, resource: { buffer: this.patchEmbedWeights.projBias } },
        { binding: 4, resource: { buffer: this.patchEmbedWeights.clsToken } },
        { binding: 5, resource: { buffer: this.patchEmbedWeights.posEmbed } },
        { binding: 6, resource: { buffer: this.tokenBuffer } },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.patchEmbedPipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(ceilDiv(C.numTokens * C.dim, 256));
    pass.end();
  }

  private encodeLayerNorm(
    encoder: GPUCommandEncoder,
    input: GPUBuffer,
    output: GPUBuffer,
    gamma: GPUBuffer,
    beta: GPUBuffer
  ) {
    const device = this.device;
    const paramsData = new ArrayBuffer(16);
    const v = new DataView(paramsData);
    v.setUint32(0, C.numTokens, true);
    v.setUint32(4, C.dim, true);
    v.setFloat32(8, 1e-6, true);
    const params = this.uniformPool.get(paramsData);

    const bg = device.createBindGroup({
      layout: this.layerNormPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: input } },
        { binding: 2, resource: { buffer: gamma } },
        { binding: 3, resource: { buffer: beta } },
        { binding: 4, resource: { buffer: output } },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.layerNormPipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(C.numTokens);
    pass.end();
  }

  private encodeLinear(
    encoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    input: GPUBuffer,
    weight: GPUBuffer,
    bias: GPUBuffer,
    output: GPUBuffer,
    numRows: number,
    inDim: number,
    outDim: number
  ) {
    const device = this.device;
    const params = this.uniformPool.get(
      new Uint32Array([numRows, inDim, outDim]).buffer
    );

    const bg = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: input } },
        { binding: 2, resource: { buffer: weight } },
        { binding: 3, resource: { buffer: bias } },
        { binding: 4, resource: { buffer: output } },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(ceilDiv(numRows * outDim, 256));
    pass.end();
  }

  private encodeResidualAdd(
    encoder: GPUCommandEncoder,
    dst: GPUBuffer,
    src: GPUBuffer
  ) {
    const device = this.device;
    const count = C.numTokens * C.dim;
    const countBuf = this.uniformPool.get(new Uint32Array([count]).buffer);

    const bg = device.createBindGroup({
      layout: this.residualAddPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: dst } },
        { binding: 1, resource: { buffer: src } },
        { binding: 2, resource: { buffer: countBuf } },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(this.residualAddPipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(ceilDiv(count, 256));
    pass.end();
  }

  /**
   * Encodes one transformer block (pre-norm architecture):
   *   norm1 → attention → residual add → norm2 → MLP → residual add
   *
   * Each block refines the token representations. Early layers learn local
   * features (edges, textures), later layers learn global relationships.
   * The residual connections let information flow directly through the network.
   */
  private encodeTransformerBlock(encoder: GPUCommandEncoder, layerIdx: number) {
    const lw = this.layerWeights[layerIdx];

    // 1. Layer norm stabilizes activations before attention
    this.encodeLayerNorm(
      encoder,
      this.tokenBuffer,
      this.normBuffer,
      lw.get('norm1.weight')!,
      lw.get('norm1.bias')!
    );

    // 2. Self-attention: normBuffer -> projOutBuffer
    this.encodeAttention(encoder, layerIdx, lw);

    // 3. Residual: tokenBuffer += projOutBuffer
    this.encodeResidualAdd(encoder, this.tokenBuffer, this.projOutBuffer);

    // 4. LayerNorm2: tokenBuffer -> normBuffer
    this.encodeLayerNorm(
      encoder,
      this.tokenBuffer,
      this.normBuffer,
      lw.get('norm2.weight')!,
      lw.get('norm2.bias')!
    );

    // 5. MLP: normBuffer -> hidden (GELU) -> mlpOutBuffer
    this.encodeLinear(
      encoder,
      this.linearGeluPipeline,
      this.normBuffer,
      lw.get('mlp.fc1.weight')!,
      lw.get('mlp.fc1.bias')!,
      this.hiddenBuffer,
      C.numTokens,
      C.dim,
      C.mlpHiddenDim
    );

    this.encodeLinear(
      encoder,
      this.linearPipeline,
      this.hiddenBuffer,
      lw.get('mlp.fc2.weight')!,
      lw.get('mlp.fc2.bias')!,
      this.mlpOutBuffer,
      C.numTokens,
      C.mlpHiddenDim,
      C.dim
    );

    // 6. Residual: tokenBuffer += mlpOutBuffer
    this.encodeResidualAdd(encoder, this.tokenBuffer, this.mlpOutBuffer);
  }

  /**
   * Multi-head self-attention: lets each token "look at" every other token.
   *
   * Each token is projected into Query (what am I looking for?), Key (what do
   * I contain?), and Value (what information do I carry?) vectors. Attention
   * scores = Q·K^T / sqrt(head_dim) measure how relevant each key is to each
   * query. After softmax normalization, these scores weight the values to
   * produce the output. Multiple heads allow attending to different aspects
   * simultaneously (e.g., color, shape, position).
   *
   * The attention weights (softmax output) are stored for visualization —
   * they reveal which image patches the model focuses on at each layer/head.
   */
  private encodeAttention(
    encoder: GPUCommandEncoder,
    layerIdx: number,
    lw: Map<string, GPUBuffer>
  ) {
    const device = this.device;

    const qkvWeight = lw.get('attn.qkv.weight')!;
    const qkvBias = lw.get('attn.qkv.bias')!;
    const wSize = C.dim * C.dim * 4;
    const bSize = C.dim * 4;

    // Q projection (5 bindings)
    this.encodeLinearWithOffsets(
      encoder,
      this.linearPipeline,
      this.normBuffer,
      qkvWeight,
      0,
      wSize,
      qkvBias,
      0,
      bSize,
      this.qBuffer,
      C.numTokens,
      C.dim,
      C.dim
    );

    // K projection (5 bindings)
    this.encodeLinearWithOffsets(
      encoder,
      this.linearPipeline,
      this.normBuffer,
      qkvWeight,
      wSize,
      wSize,
      qkvBias,
      bSize,
      bSize,
      this.kBuffer,
      C.numTokens,
      C.dim,
      C.dim
    );

    // V projection (5 bindings)
    this.encodeLinearWithOffsets(
      encoder,
      this.linearPipeline,
      this.normBuffer,
      qkvWeight,
      2 * wSize,
      wSize,
      qkvBias,
      2 * bSize,
      bSize,
      this.vBuffer,
      C.numTokens,
      C.dim,
      C.dim
    );

    // Attention scores: Q, K -> scoreBuf (4 bindings)
    {
      const paramsData = new ArrayBuffer(24);
      const v = new DataView(paramsData);
      v.setUint32(0, C.numTokens, true);
      v.setUint32(4, C.dim, true);
      v.setUint32(8, C.numHeads, true);
      v.setUint32(12, C.headDim, true);
      v.setFloat32(16, C.scale, true);
      v.setUint32(20, layerIdx, true);
      const params = this.uniformPool.get(paramsData);

      const bg = device.createBindGroup({
        layout: this.attnScoresPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: this.qBuffer } },
          { binding: 2, resource: { buffer: this.kBuffer } },
          { binding: 3, resource: { buffer: this.scoreBuffer } },
        ],
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.attnScoresPipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(
        ceilDiv(C.numHeads * C.numTokens * C.numTokens, 256)
      );
      pass.end();
    }

    // Softmax + store attention weights (3 bindings)
    {
      const paramsData = new ArrayBuffer(16);
      const v = new DataView(paramsData);
      v.setUint32(0, C.numTokens, true);
      v.setUint32(4, C.numHeads, true);
      v.setUint32(8, layerIdx, true);
      const params = this.uniformPool.get(paramsData);

      const bg = device.createBindGroup({
        layout: this.attnSoftmaxPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: this.scoreBuffer } },
          { binding: 2, resource: { buffer: this.attnWeightsBuffer } },
        ],
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.attnSoftmaxPipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(ceilDiv(C.numHeads * C.numTokens, 256));
      pass.end();
    }

    // Apply attention: scores, V -> attnOutBuffer (4 bindings)
    {
      const paramsData = new ArrayBuffer(16);
      const v = new DataView(paramsData);
      v.setUint32(0, C.numTokens, true);
      v.setUint32(4, C.dim, true);
      v.setUint32(8, C.numHeads, true);
      v.setUint32(12, C.headDim, true);
      const params = this.uniformPool.get(paramsData);

      const bg = device.createBindGroup({
        layout: this.attnApplyPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: params } },
          { binding: 1, resource: { buffer: this.scoreBuffer } },
          { binding: 2, resource: { buffer: this.vBuffer } },
          { binding: 3, resource: { buffer: this.attnOutBuffer } },
        ],
      });

      const pass = encoder.beginComputePass();
      pass.setPipeline(this.attnApplyPipeline);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(ceilDiv(C.numTokens * C.dim, 256));
      pass.end();
    }

    // Output projection: attnOutBuffer @ Wo + bo -> projOutBuffer (5 bindings)
    this.encodeLinear(
      encoder,
      this.linearPipeline,
      this.attnOutBuffer,
      lw.get('attn.proj.weight')!,
      lw.get('attn.proj.bias')!,
      this.projOutBuffer,
      C.numTokens,
      C.dim,
      C.dim
    );
  }

  private encodeLinearWithOffsets(
    encoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    input: GPUBuffer,
    weight: GPUBuffer,
    weightOffset: number,
    weightSize: number,
    bias: GPUBuffer,
    biasOffset: number,
    biasSize: number,
    output: GPUBuffer,
    numRows: number,
    inDim: number,
    outDim: number
  ) {
    const device = this.device;
    const params = this.uniformPool.get(
      new Uint32Array([numRows, inDim, outDim]).buffer
    );

    const bg = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: input } },
        {
          binding: 2,
          resource: { buffer: weight, offset: weightOffset, size: weightSize },
        },
        {
          binding: 3,
          resource: { buffer: bias, offset: biasOffset, size: biasSize },
        },
        { binding: 4, resource: { buffer: output } },
      ],
    });

    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bg);
    pass.dispatchWorkgroups(ceilDiv(numRows * outDim, 256));
    pass.end();
  }

  private encodeClassHead(encoder: GPUCommandEncoder) {
    // Classify using the CLS token (index 0 in the token sequence).
    // normBuffer[0..dim] contains the CLS token after final layer norm.
    this.encodeLinear(
      encoder,
      this.linearPipeline,
      this.normBuffer,
      this.classHeadWeights.weight,
      this.classHeadWeights.bias,
      this.classLogitsBuffer,
      1,
      C.dim,
      C.numClasses
    );
  }
}
