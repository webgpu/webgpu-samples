let displayedNotSupportedError = false;
export function checkWebGPUSupport() {
  if (!navigator.gpu) {
    document.getElementById('not-supported').style.display = 'block';
    if (!displayedNotSupportedError) {
      alert('WebGPU not supported! Please visit webgpu.io to see the current implementation status.');
    }
    displayedNotSupportedError = true;
  }
  return !!navigator.gpu;
}

export async function createTextureFromImage(device: GPUDevice, src: string, usage: GPUTextureUsageFlags) {
  const img = document.createElement('img');
  img.src = src;
  await img.decode();

  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = img.width;
  imageCanvas.height = img.height;

  const imageCanvasContext = imageCanvas.getContext('2d');
  imageCanvasContext.translate(0, img.height);
  imageCanvasContext.scale(1, -1);
  imageCanvasContext.drawImage(img, 0, 0, img.width, img.height);
  const imageData = imageCanvasContext.getImageData(0, 0, img.width, img.height);

  let data = null;

  const bytesPerRow = Math.ceil(img.width * 4 / 256) * 256;
  if (bytesPerRow == img.width * 4) {
    data = imageData.data;
  } else {
    data = new Uint8Array(bytesPerRow * img.height);
    let imagePixelIndex = 0;
    for (let y = 0; y < img.height; ++y) {
      for (let x = 0; x < img.width; ++x) {
        let i = x * 4 + y * bytesPerRow;
        data[i] = imageData.data[imagePixelIndex];
        data[i + 1] = imageData.data[imagePixelIndex + 1];
        data[i + 2] = imageData.data[imagePixelIndex + 2];
        data[i + 3] = imageData.data[imagePixelIndex + 3];
        imagePixelIndex += 4;
      }
    }
  }

  const texture = device.createTexture({
    size: {
      width: img.width,
      height: img.height,
      depth: 1,
    },
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | usage,
  });

  const [textureDataBuffer, mapping] = device.createBufferMapped({
    size: data.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  new Uint8Array(mapping).set(data);
  textureDataBuffer.unmap();

  const commandEncoder = device.createCommandEncoder({});
  commandEncoder.copyBufferToTexture({
    buffer: textureDataBuffer,
    bytesPerRow,
  }, {
    texture: texture,
  }, {
    width: img.width,
    height: img.height,
    depth: 1,
  });

  device.defaultQueue.submit([commandEncoder.finish()]);
  textureDataBuffer.destroy();

  return texture;
}

export function updateBufferData(
  device: GPUDevice,
  dst: GPUBuffer, dstOffset: number,
  src: Float32Array | Uint32Array,
  commandEncoder?: GPUCommandEncoder): {
    commandEncoder: GPUCommandEncoder,
    uploadBuffer: GPUBuffer,
  } {
  const [uploadBuffer, mapping] = device.createBufferMapped({
    size: src.byteLength,
    usage: GPUBufferUsage.COPY_SRC,
  });

  // @ts-ignore
  new src.constructor(mapping).set(src);
  uploadBuffer.unmap();

  commandEncoder = commandEncoder || device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(uploadBuffer, 0, dst, dstOffset, src.byteLength);

  return { commandEncoder, uploadBuffer };
}
