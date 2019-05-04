import * as Shaderc from '@webgpu/shaderc';

let shaderc = null;
export const ready = Shaderc.instantiate().then(result => {
  shaderc = result;
});

export function compile(type, source) {
  const compiler = new shaderc.Compiler();
  const opts = new shaderc.CompileOptions();
  const result = compiler.CompileGlslToSpv(source,
    type === "f" ? shaderc.shader_kind.fragment :
      type === "v" ? shaderc.shader_kind.vertex :
        type === "c" ? shaderc.shader_kind.compute : null,
    "a.glsl", "main", opts);
  const err = result.GetErrorMessage();
  if (err) {
    console.warn(err);
  }
  return result.GetBinary();
}

export async function createTextureFromImage(device, src, usage) {
  const img = document.createElement('img');
  img.src = src;
  await img.decode();

  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = img.width;
  imageCanvas.height = img.height;

  const imageCanvasContext = imageCanvas.getContext('2d');
  imageCanvasContext.drawImage(img, 0, 0, img.width, img.height);
  const imageData = imageCanvasContext.getImageData(0, 0, img.width, img.height);

  let data = null;

  const rowPitch = Math.ceil(img.width * 4 / 256) * 256;
  if (rowPitch == img.width * 4) {
    data = imageData.data;
  } else {
    data = new Uint8Array(rowPitch * img.height);
    for (let y = 0; y < canvas.height; ++y) {
      for (let x = 0; x < canvas.width; ++x) {
        let i = x * 4 + y * rowPitch;
        data[i] = imageData.data[i];
        data[i + 1] = imageData.data[i + 1];
        data[i + 2] = imageData.data[i + 2];
        data[i + 3] = imageData.data[i + 3];
      }
    }
  }

  const texture = device.createTexture({
    size: {
      width: img.width,
      height: img.height,
      depth: 1,
    },
    arrayLayerCount: 1,
    mipLevelCount: 1,
    sampleCount: 1,
    dimension: "2d",
    format: "rgba8unorm",
    usage: GPUTextureUsage.TRANSFER_DST | usage,
  });

  const textureDataBuffer = device.createBuffer({
    size: data.byteLength,
    usage: GPUBufferUsage.TRANSFER_DST | GPUBufferUsage.TRANSFER_SRC,
  });

  textureDataBuffer.setSubData(0, data);

  const commandEncoder = device.createCommandEncoder({});
  commandEncoder.copyBufferToTexture({
    buffer: textureDataBuffer,
    rowPitch: rowPitch,
    arrayLayer: 0,
    mipLevel: 0,
    imageHeight: 0,
  }, {
      texture: texture,
      mipLevel: 0,
      arrayLayer: 0,
      origin: { x: 0, y: 0, z: 0 }
    }, {
      width: img.width,
      height: img.height,
      depth: 1,
    });

  device.getQueue().submit([commandEncoder.finish()]);

  return texture;
}
