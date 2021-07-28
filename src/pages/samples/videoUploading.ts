import { makeBasicExample } from '../../components/basicExample';

async function init(canvas: HTMLCanvasElement) {
  // Set video element
  const video = document.createElement('video');
  video.loop = true;
  video.autoplay = true;
  video.muted = true;
  video.src = require('../../../assets/video/pano.webm');
  await video.play();

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');

  const devicePixelRatio = window.devicePixelRatio || 1;
  const presentationSize = [
    canvas.clientWidth * devicePixelRatio,
    canvas.clientHeight * devicePixelRatio,
  ];
  const presentationFormat = context.getPreferredFormat(adapter);

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

  context.configure({
    device,
    format: presentationFormat,
    size: presentationSize,
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
          format: presentationFormat,
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

  return function frame() {
    const uniformBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: sampler,
        },
        {
          binding: 1,
          resource: device.importExternalTexture({
            source: video,
          }),
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);
  };
}

const wgslShaders = {
  vertex: `
struct VertexInput {
  [[location(0)]] position : vec3<f32>;
  [[location(1)]] uv : vec2<f32>;
};

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragUV : vec2<f32>;
};

[[stage(vertex)]]
fn main(input : VertexInput) -> VertexOutput {
  return VertexOutput(vec4<f32>(input.position, 1.0), input.uv);
}
`,

  fragment: `
[[binding(0), group(0)]] var mySampler: sampler;
[[binding(1), group(0)]] var myTexture: texture_external;

[[stage(fragment)]]
fn main([[location(0)]] fragUV : vec2<f32>) -> [[location(0)]] vec4<f32> {
  return textureSampleLevel(myTexture, mySampler, fragUV);
}
`,
};

export default makeBasicExample({
  name: 'Video Uploading',
  description: 'This example shows how to upload video frame to WebGPU.',
  slug: 'videoUploading',
  init,
  source: __SOURCE__,
});
