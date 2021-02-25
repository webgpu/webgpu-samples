import type { GUI } from 'dat.gui';
import { makeBasicExample } from '../../components/basicExample';
import glslangModule from '../../glslang';

const tileDim = 256;
const batch = [4, 4];

async function init(canvas: HTMLCanvasElement, _useWGSL: boolean, gui?: GUI) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();
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
    computeStage: {
      module: device.createShaderModule({
        code: glslShaders.blur,
        transform: (glsl) => glslang.compileGLSL(glsl, 'compute'),
      }),
      entryPoint: 'main',
    },
  });

  const pipeline = device.createRenderPipeline({
    vertexStage: {
      module: device.createShaderModule({
        code: glslShaders.vertex,
        transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
      }),
      entryPoint: 'main',
    },
    fragmentStage: {
      module: device.createShaderModule({
        code: glslShaders.fragment,
        transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
      }),
      entryPoint: 'main',
    },

    primitiveTopology: 'triangle-list',
    vertexState: {
      vertexBuffers: [
        {
          arrayStride: 20,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: 0,
              format: 'float3',
            },
            {
              // uv
              shaderLocation: 1,
              offset: 12,
              format: 'float2',
            },
          ],
        },
      ],
    },

    colorStates: [
      {
        format: swapChainFormat,
      },
    ],
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
    computePass.dispatch(2, Math.ceil(srcHeight / batch[1]));

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
          attachment: swapChain.getCurrentTexture().createView(),
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
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

const glslShaders = {
  // prettier-ignore
  blur: `#version 450
  layout(set = 0, binding = 0) uniform sampler samp;
  layout(set = 0, binding = 1) uniform Params {
    uint uFilterDim;
    uint uBlockDim;
  };
  layout(set = 1, binding = 1) uniform texture2D inputTex;
  layout(set = 1, binding = 2, rgba8) uniform writeonly image2D outputTex;
  layout(set = 1, binding = 3) uniform Uniforms {
    uint uFlip;
  };

  // This shader blurs the input texture in one diection, depending on whether
  // |uFlip| is 0 or 1.
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

  shared vec3[${tileDim}] tile[${batch[1]}];

  layout(local_size_x = ${tileDim / batch[0]}, local_size_y = 1, local_size_z = 1) in;
  void main() {
    int filterOffset = int(uFilterDim - 1) / 2;
    ivec2 dims = textureSize(sampler2D(inputTex, samp), 0);

    ivec2 baseIndex = ivec2(
      gl_WorkGroupID.xy * uvec2(uBlockDim, ${batch[1]}) +
      gl_LocalInvocationID.xy * uvec2(${batch[0]}, 1)
    ) - ivec2(filterOffset, 0);

    for (uint r = 0; r < ${batch[1]}; ++r) {
      for (uint c = 0; c < ${batch[0]}; ++c) {
        ivec2 loadIndex = baseIndex + ivec2(c, r);
        if (uFlip != 0) {
          loadIndex = loadIndex.yx;
        }

        tile[r][${batch[0]} * gl_LocalInvocationID.x + c] =
          texture(
            sampler2D(inputTex, samp),
            (vec2(loadIndex) + vec2(0.25)) / vec2(dims)).rgb;
      }
    }

    barrier();

    for (uint r = 0; r < ${batch[1]}; ++r) {
      for (uint c = 0; c < ${batch[0]}; ++c) {
        ivec2 writeIndex = baseIndex + ivec2(c, r);
        if (uFlip != 0) {
          writeIndex = writeIndex.yx;
        }

        uint center = ${batch[0]} * gl_LocalInvocationID.x + c;
        if (center >= filterOffset &&
            center < ${tileDim} - filterOffset &&
            all(lessThan(writeIndex, dims))) {
          vec3 acc = vec3(0.0);
          for (uint f = 0; f < uFilterDim; ++f) {
            uint i = center + f - filterOffset;
            acc += (1.0 / float(uFilterDim)) * tile[r][i];
          }
          imageStore(outputTex, writeIndex, vec4(acc, 1.0));
        }
      }
    }
  }
  `,

  vertex: `#version 450
layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

layout(location = 0) out vec2 fragUV;

void main() {
  gl_Position = vec4(position, 1.0);
  fragUV = uv;
}
`,

  fragment: `#version 450
layout(set = 0, binding = 0) uniform sampler mySampler;
layout(set = 0, binding = 1) uniform texture2D myTexture;

layout(location = 0) in vec2 fragUV;
layout(location = 0) out vec4 outColor;

void main() {
  outColor = texture(sampler2D(myTexture, mySampler), fragUV);
}
`,
};

export default makeBasicExample({
  name: 'Image Blur',
  description:
    'This example shows how to blur an image using a WebGPU compute shader.',
  slug: 'imageBlur',
  init,
  glslShaders,
  source: __SOURCE__,
  gui: true,
});
