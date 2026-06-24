// Attention map visualization
// Extracts CLS token attention over spatial patches, renders as heatmap overlay

import { DEIT_CONFIG } from './weights';
import visualizeWGSL from './shaders/visualize.wgsl';

const C = DEIT_CONFIG;

export class AttentionVisualizer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private pipeline!: GPURenderPipeline;
  private sampler!: GPUSampler;
  private imageTexture!: GPUTexture;
  private attnTexture!: GPUTexture;
  private visParamsBuffer!: GPUBuffer;
  private presentationFormat: GPUTextureFormat;

  private currentLayer = 0;
  private currentHead = 0;
  private overlayAlpha = 0.6;

  constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    presentationFormat: GPUTextureFormat
  ) {
    this.device = device;
    this.context = context;
    this.presentationFormat = presentationFormat;
  }

  initialize() {
    const device = this.device;

    const module = device.createShaderModule({ code: visualizeWGSL });

    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: {
        module,
        entryPoint: 'fs',
        targets: [{ format: this.presentationFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    this.imageTexture = device.createTexture({
      size: [C.imgSize, C.imgSize],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Attention map texture: 14x14 (one per grid cell), bilinear upsampled by the shader
    const gridSize = C.imgSize / C.patchSize; // 14
    this.attnTexture = device.createTexture({
      size: [gridSize, gridSize],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    this.visParamsBuffer = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.updateVisParams();
  }

  // Upload the source image as RGBA8
  uploadImage(rgbaData: Uint8ClampedArray, width: number, height: number) {
    this.device.queue.writeTexture(
      { texture: this.imageTexture },
      rgbaData,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height }
    );
  }

  // Update attention map from inference results
  updateAttentionMap(attnWeights: Float32Array, layer: number, head: number) {
    this.currentLayer = layer;
    this.currentHead = head;

    const gridSize = C.imgSize / C.patchSize; // 14
    const N = C.numTokens; // 197

    // Extract CLS token (row 0) attention over spatial tokens (columns 1..196)
    const offset = (layer * C.numHeads + head) * N * N;
    const clsAttnRaw = new Float32Array(gridSize * gridSize);

    // Normalize to [0, 1] for visualization
    let maxVal = 0;
    for (let i = 0; i < gridSize * gridSize; i++) {
      clsAttnRaw[i] = attnWeights[offset + i + 1]; // skip CLS-to-CLS attention
      maxVal = Math.max(maxVal, clsAttnRaw[i]);
    }
    if (maxVal > 0) {
      for (let i = 0; i < clsAttnRaw.length; i++) {
        clsAttnRaw[i] /= maxVal;
      }
    }

    // Pack into RGBA8 (attention value in R channel, rest zero)
    const rgba = new Uint8Array(gridSize * gridSize * 4);
    for (let i = 0; i < gridSize * gridSize; i++) {
      rgba[i * 4] = Math.round(clsAttnRaw[i] * 255);
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 255;
    }

    this.device.queue.writeTexture(
      { texture: this.attnTexture },
      rgba,
      { bytesPerRow: gridSize * 4, rowsPerImage: gridSize },
      { width: gridSize, height: gridSize }
    );
  }

  setOverlayAlpha(alpha: number) {
    this.overlayAlpha = alpha;
    this.updateVisParams();
  }

  private updateVisParams() {
    const data = new ArrayBuffer(8);
    const view = new DataView(data);
    view.setFloat32(0, this.overlayAlpha, true);
    view.setUint32(4, 1, true); // showOverlay always on
    this.device.queue.writeBuffer(
      this.visParamsBuffer,
      0,
      new Uint8Array(data)
    );
  }

  render() {
    const encoder = this.device.createCommandEncoder();

    const textureView = this.context.getCurrentTexture().createView();

    const bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.imageTexture.createView() },
        { binding: 1, resource: this.attnTexture.createView() },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: { buffer: this.visParamsBuffer } },
      ],
    });

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3); // full-screen triangle
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}

export async function loadImageNetLabels(url: string): Promise<string[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load labels: ${response.status}`);
  }
  return response.json();
}

// Get top-K predictions from logits
export function topK(
  logits: Float32Array,
  labels: string[],
  k: number
): Array<{ label: string; probability: number; index: number }> {
  // Softmax
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    maxLogit = Math.max(maxLogit, logits[i]);
  }
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - maxLogit);
    sum += exps[i];
  }
  for (let i = 0; i < exps.length; i++) {
    exps[i] /= sum;
  }

  // Find top-K
  const indices = Array.from({ length: logits.length }, (_, i) => i);
  indices.sort((a, b) => exps[b] - exps[a]);

  return indices.slice(0, k).map((i) => ({
    label: labels[i] || `class_${i}`,
    probability: exps[i],
    index: i,
  }));
}
