import type { GUI } from 'dat.gui';
import { makeBasicExample } from '../../components/basicExample';

const tileDim = 256;
const batch = [4, 4];

async function init(canvas: HTMLCanvasElement, gui?: GUI) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('gpupresent');

  const swapChainFormat = 'bgra8unorm';

  // prettier-ignore
  const rectVerts = new Float32Array([
    1.0,  1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, 0.0, 1.0, 1.0,
    -1.0, -1.0, 0.0, 0.0, 1.0,
    1.0,  1.0, 0.0, 1.0, 0.0,
    -1.0, -1.0, 0.0, 0.0, 1.0,
    -1.0,  1.0, 0.0, 0.0, 0.0,
  ]);

  const verticesBuffer = device.createBuffer({
    size: rectVerts.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(rectVerts);
  verticesBuffer.unmap();

  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
  });

  const blurPipeline = device.createComputePipeline({
    compute: {
      module: device.createShaderModule({
        code: wgslShaders.blur,
      }),
      entryPoint: 'main',
    },
  });

  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertex,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 20,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
              format: 'float32x3',
            },
            {
              // uv
              shaderLocation: 1,
              offset: 12,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: wgslShaders.fragment,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: swapChainFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const img = document.createElement('img');
  img.src = require('../../../assets/img/Di-3d.png');
  await img.decode();
  const imageBitmap = await createImageBitmap(img);

  const [srcWidth, srcHeight] = [imageBitmap.width, imageBitmap.height];
  const cubeTexture = device.createTexture({
    size: [srcWidth, srcHeight, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST,
  });
  device.queue.copyImageBitmapToTexture(
    { imageBitmap },
    { texture: cubeTexture },
    [imageBitmap.width, imageBitmap.height, 1]
  );

  const textures = [0, 1].map(() => {
    return device.createTexture({
      size: {
        width: srcWidth,
        height: srcHeight,
      },
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.STORAGE |
        GPUTextureUsage.SAMPLED,
    });
  });

  const buffer0 = (() => {
    const buffer = device.createBuffer({
      size: 4,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM,
    });
    new Uint32Array(buffer.getMappedRange())[0] = 0;
    buffer.unmap();
    return buffer;
  })();

  const buffer1 = (() => {
    const buffer = device.createBuffer({
      size: 4,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM,
    });
    new Uint32Array(buffer.getMappedRange())[0] = 1;
    buffer.unmap();
    return buffer;
  })();

  const blurParamsBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  const computeConstants = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: {
          buffer: blurParamsBuffer,
        },
      },
    ],
  });

  const computeBindGroup0 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: cubeTexture.createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer0,
        },
      },
    ],
  });

  const computeBindGroup1 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: textures[0].createView(),
      },
      {
        binding: 2,
        resource: textures[1].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer1,
        },
      },
    ],
  });

  const computeBindGroup2 = device.createBindGroup({
    layout: blurPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 1,
        resource: textures[1].createView(),
      },
      {
        binding: 2,
        resource: textures[0].createView(),
      },
      {
        binding: 3,
        resource: {
          buffer: buffer0,
        },
      },
    ],
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: sampler,
      },
      {
        binding: 1,
        resource: textures[1].createView(),
      },
    ],
  });

  const settings = {
    filterSize: 15,
    iterations: 2,
  };

  let blockDim: number;
  const updateSettings = () => {
    blockDim = tileDim - (settings.filterSize - 1);
    device.queue.writeBuffer(
      blurParamsBuffer,
      0,
      new Uint32Array([settings.filterSize, blockDim])
    );
  };
  gui.add(settings, 'filterSize', 1, 33).step(2).onChange(updateSettings);
  gui.add(settings, 'iterations', 1, 10).step(1);

  updateSettings();

  return function frame() {
    const commandEncoder = device.createCommandEncoder();

    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(blurPipeline);
    computePass.setBindGroup(0, computeConstants);

    computePass.setBindGroup(1, computeBindGroup0);
    computePass.dispatch(
      Math.ceil(srcWidth / blockDim),
      Math.ceil(srcHeight / batch[1])
    );

    computePass.setBindGroup(1, computeBindGroup1);
    computePass.dispatch(
      Math.ceil(srcHeight / blockDim),
      Math.ceil(srcWidth / batch[1])
    );

    for (let i = 0; i < settings.iterations - 1; ++i) {
      computePass.setBindGroup(1, computeBindGroup2);
      computePass.dispatch(
        Math.ceil(srcWidth / blockDim),
        Math.ceil(srcHeight / batch[1])
      );

      computePass.setBindGroup(1, computeBindGroup1);
      computePass.dispatch(
        Math.ceil(srcHeight / blockDim),
        Math.ceil(srcWidth / batch[1])
      );
    }

    computePass.endPass();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: swapChain.getCurrentTexture().createView(),
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          storeOp: 'store',
        },
      ],
    });
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);
  };
}

const wgslShaders = {
  // prettier-ignore
  blur: `
  [[block]] struct Params {
    filterDim : u32;
    blockDim : u32;
  };

  [[group(0), binding(0)]] var samp : sampler;
  [[group(0), binding(1)]] var<uniform> params : Params;
  [[group(1), binding(1)]] var inputTex : texture_2d<f32>;
  [[group(1), binding(2)]] var outputTex : [[access(write)]] texture_storage_2d<rgba8unorm>;

  [[block]] struct Flip {
    value : u32;
  };
  [[group(1), binding(3)]] var<uniform> flip : Flip;

  // This shader blurs the input texture in one direction, depending on whether
  // |flip.value| is 0 or 1.
  // It does so by running ${tileDim / batch[0]} threads per workgroup to load ${tileDim}
  // texels into ${batch[1]} rows of shared memory. Each thread loads a
  // ${batch[0]} x ${batch[1]} block of texels to take advantage of the texture sampling
  // hardware.
  // Then, each thread computes the blur result by averaging the adjacent texel values
  // in shared memory.
  // Because we're operating on a subset of the texture, we cannot compute all of the
  // results since not all of the neighbors are available in shared memory.
  // Specifically, with ${tileDim} x ${tileDim} tiles, we can only compute and write out
  // square blocks of size ${tileDim} - (filterSize - 1). We compute the number of blocks
  // needed and dispatch that amount.

  var<workgroup> tile : array<array<vec3<f32>, ${tileDim}>, ${batch[1]}>;

  [[stage(compute), workgroup_size(${tileDim / batch[0]}, 1, 1)]]
  fn main(
    [[builtin(workgroup_id)]] WorkGroupID : vec3<u32>,
    [[builtin(local_invocation_id)]] LocalInvocationID : vec3<u32>
  ) {
    let filterOffset : u32 = (params.filterDim - 1u) / 2u;
    let dims : vec2<i32> = textureDimensions(inputTex, 0);

    let baseIndex : vec2<i32> = vec2<i32>(
      WorkGroupID.xy * vec2<u32>(params.blockDim, ${batch[1]}u) +
      LocalInvocationID.xy * vec2<u32>(${batch[0]}u, 1u)
    ) - vec2<i32>(i32(filterOffset), 0);

    for (var r : u32 = 0u; r < ${batch[1]}u; r = r + 1u) {
      for (var c : u32 = 0u; c < ${batch[0]}u; c = c + 1u) {
        var loadIndex : vec2<i32> = baseIndex + vec2<i32>(i32(c), i32(r));
        if (flip.value != 0u) {
          loadIndex = loadIndex.yx;
        }

        tile[r][${batch[0]}u * LocalInvocationID.x + c] =
          textureSampleLevel(inputTex, samp,
            (vec2<f32>(loadIndex) + vec2<f32>(0.25, 0.25)) / vec2<f32>(dims), 0.0).rgb;
      }
    }

    workgroupBarrier();

    for (var r : u32 = 0u; r < ${batch[1]}u; r = r + 1u) {
      for (var c : u32 = 0u; c < ${batch[0]}u; c = c + 1u) {
        var writeIndex : vec2<i32> = baseIndex + vec2<i32>(i32(c), i32(r));
        if (flip.value != 0u) {
          writeIndex = writeIndex.yx;
        }

        let center : u32 = ${batch[0]}u * LocalInvocationID.x + c;
        if (center >= filterOffset &&
            center < ${tileDim}u - filterOffset &&
            all(writeIndex < dims)) {
          var acc : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
          for (var f : u32 = 0u; f < params.filterDim; f = f + 1u) {
            var i : u32 = center + f - filterOffset;
            acc = acc + (1.0 / f32(params.filterDim)) * tile[r][i];
          }
          textureStore(outputTex, writeIndex, vec4<f32>(acc, 1.0));
        }
      }
    }
  }
  `,

  vertex: `
[[location(0)]] var<out> fragUV : vec2<f32>;
[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main(
  [[location(0)]] position : vec3<f32>,
  [[location(1)]] uv : vec2<f32>
) {
  Position = vec4<f32>(position, 1.0);
  fragUV = uv;
}
`,

  fragment: `
[[group(0), binding(0)]] var mySampler : sampler;
[[group(0), binding(1)]] var myTexture : texture_2d<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

[[stage(fragment)]]
fn main([[location(0)]] fragUV : vec2<f32>) {
  outColor = textureSample(myTexture, mySampler, fragUV);
}
`,
};

export default makeBasicExample({
  name: 'Image Blur',
  description:
    'This example shows how to blur an image using a WebGPU compute shader.',
  slug: 'imageBlur',
  init,
  source: __SOURCE__,
  gui: true,
});
