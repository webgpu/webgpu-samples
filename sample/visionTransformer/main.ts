// Vision Transformer (DeiT-Tiny) — WebGPU Compute Inference + Attention Visualization
//
// This sample demonstrates how to run a real neural network (a vision
// transformer) entirely in WebGPU compute shaders. It takes an input image,
// splits it into patches, processes them through 12 transformer layers of
// self-attention and feed-forward networks, and outputs both a classification
// (what's in the image?) and attention maps (what did the model look at?).
//
// The attention visualization is the key output: by selecting different layers
// and heads, you can see how the model's focus shifts from local texture
// features in early layers to global semantic understanding in later layers.

import {
  quitIfAdapterNotAvailable,
  quitIfWebGPUNotAvailableOrMissingFeatures,
  quitIfLimitLessThan,
} from '../util';
import { loadWeights, DEIT_CONFIG } from './weights';
import { VitInference } from './inference';
import { AttentionVisualizer, topK, loadImageNetLabels } from './visualize';

const C = DEIT_CONFIG;

const canvas = document.querySelector('canvas') as HTMLCanvasElement;
const dropZone = document.querySelector('#dropZone') as HTMLDivElement;
const layerSlider = document.querySelector('#layerSlider') as HTMLInputElement;
const headSlider = document.querySelector('#headSlider') as HTMLInputElement;
const alphaSlider = document.querySelector('#alphaSlider') as HTMLInputElement;
const layerValue = document.querySelector('#layerValue') as HTMLSpanElement;
const headValue = document.querySelector('#headValue') as HTMLSpanElement;
const alphaValue = document.querySelector('#alphaValue') as HTMLSpanElement;
const resultsDiv = document.querySelector('#results') as HTMLDivElement;
const statusDiv = document.querySelector('#status') as HTMLDivElement;

const adapter = await navigator.gpu?.requestAdapter({
  featureLevel: 'compatibility',
});
quitIfAdapterNotAvailable(adapter);

const limits: Record<string, GPUSize32> = {};
quitIfLimitLessThan(adapter, 'maxComputeWorkgroupSizeX', 256, limits);
quitIfLimitLessThan(adapter, 'maxComputeInvocationsPerWorkgroup', 256, limits);
const device = await adapter.requestDevice({ requiredLimits: limits });
quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);

canvas.width = C.imgSize * 2; // 448 for retina
canvas.height = C.imgSize * 2;

const context = canvas.getContext('webgpu')!;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format: presentationFormat });

// --- Initialize components ---
const inference = new VitInference(device);
const visualizer = new AttentionVisualizer(device, context, presentationFormat);
visualizer.initialize();

// --- Load weights and labels ---
statusDiv.textContent = 'Loading model weights...';

let labels: string[] = [];
let currentAttnWeights: Float32Array | null = null;
let modelReady = false;

try {
  const [weights, loadedLabels] = await Promise.all([
    loadWeights('../../assets/models/deit-tiny-int8.bin'),
    loadImageNetLabels('../../assets/models/imagenet-labels.json'),
  ]);
  labels = loadedLabels;
  await inference.initialize(weights);
  modelReady = true;
  statusDiv.textContent = 'Ready. Drag and drop an image to classify.';
} catch (e) {
  statusDiv.textContent = `Failed to load: ${
    e instanceof Error ? e.message : String(e)
  }`;
  console.error(e);
}

// --- Image preprocessing ---
function preprocessImage(img: HTMLImageElement | HTMLCanvasElement): {
  normalized: Float32Array;
  rgba: Uint8ClampedArray;
} {
  // Resize to 224x224
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = C.imgSize;
  tmpCanvas.height = C.imgSize;
  const ctx = tmpCanvas.getContext('2d')!;

  // Center crop: scale shortest side to 224, then center crop
  const scale = Math.max(C.imgSize / img.width, C.imgSize / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (C.imgSize - sw) / 2;
  const sy = (C.imgSize - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);

  const imageData = ctx.getImageData(0, 0, C.imgSize, C.imgSize);
  const rgba = imageData.data;

  // ImageNet normalization: (pixel/255 - mean) / std
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  const normalized = new Float32Array(C.imgSize * C.imgSize * C.channels);
  for (let i = 0; i < C.imgSize * C.imgSize; i++) {
    for (let c = 0; c < 3; c++) {
      normalized[i * 3 + c] =
        (imageData.data[i * 4 + c] / 255.0 - mean[c]) / std[c];
    }
  }

  return { normalized, rgba };
}

// --- Run inference ---
let isRunning = false;
async function classifyImage(img: HTMLImageElement | HTMLCanvasElement) {
  if (isRunning || !modelReady) return;
  isRunning = true;
  try {
    statusDiv.textContent = 'Running inference...';

    const { normalized, rgba } = preprocessImage(img);

    // Upload image for visualization
    visualizer.uploadImage(rgba, C.imgSize, C.imgSize);

    // Upload normalized image for inference
    inference.uploadImage(normalized);

    // Run forward pass
    const { logits, attnWeights, elapsedMs } = await inference.run();
    currentAttnWeights = attnWeights;

    // Display results
    const predictions = topK(logits, labels, 5);
    resultsDiv.innerHTML = predictions
      .map(
        (p) =>
          `<div class="prediction"><span>${p.label}</span><span class="prob">${(
            p.probability * 100
          ).toFixed(1)}%</span></div>`
      )
      .join('');

    statusDiv.textContent = `Inference: ${elapsedMs.toFixed(0)}ms`;

    // Update attention visualization
    const layer = parseInt(layerSlider.value);
    const head = parseInt(headSlider.value);
    visualizer.updateAttentionMap(attnWeights, layer, head);
    visualizer.render();
  } finally {
    isRunning = false;
  }
}

// --- UI event handlers ---
layerSlider.addEventListener('input', () => {
  const layer = parseInt(layerSlider.value);
  layerValue.textContent = String(layer + 1);
  if (currentAttnWeights) {
    visualizer.updateAttentionMap(
      currentAttnWeights,
      layer,
      parseInt(headSlider.value)
    );
    visualizer.render();
  }
});

headSlider.addEventListener('input', () => {
  const head = parseInt(headSlider.value);
  headValue.textContent = String(head + 1);
  if (currentAttnWeights) {
    visualizer.updateAttentionMap(
      currentAttnWeights,
      parseInt(layerSlider.value),
      head
    );
    visualizer.render();
  }
});

alphaSlider.addEventListener('input', () => {
  const alpha = parseInt(alphaSlider.value);
  alphaValue.textContent = `${alpha}%`;
  visualizer.setOverlayAlpha(alpha / 100);
  if (currentAttnWeights) {
    visualizer.render();
  }
});

// --- Drag and drop ---
function handleFile(file: File) {
  if (!file.type.startsWith('image/')) return;

  const img = new Image();
  img.onload = () => {
    classifyImage(img);
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
}

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer?.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
});

// Also support click to upload
canvas.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    if (input.files?.length) {
      handleFile(input.files[0]);
    }
  };
  input.click();
});

// --- Sample image buttons ---
const sampleImagesDiv = document.querySelector(
  '#sampleImages'
) as HTMLDivElement;

async function loadSampleImage(filename: string) {
  statusDiv.textContent = `Loading ${filename}...`;

  // Highlight active button
  sampleImagesDiv.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-img') === filename);
  });

  try {
    const response = await fetch(`../../assets/img/vit-samples/${filename}`);
    if (!response.ok) throw new Error(`${response.status}`);
    const blob = await response.blob();
    const img = new Image();
    img.onload = () => {
      classifyImage(img);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(blob);
  } catch (e) {
    statusDiv.textContent = `Failed to load ${filename}: ${e}`;
  }
}

sampleImagesDiv.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;
  const imgFile = btn.getAttribute('data-img');
  if (imgFile) loadSampleImage(imgFile);
});

// Load first sample image on start (only if model loaded successfully)
if (modelReady) {
  loadSampleImage('golden-retriever.jpg');
}
