import glslangModule from '../glslang';

export const title = 'Video Texture';
export const description = 'This example shows how to upload video frame to WebGPU.';

export async function init(canvas: HTMLCanvasElement) {
  // Set video element
  const video = document.createElement('video');
  video.loop = true;
  video.autoplay = true;
  video.muted = true;
  video.src = 'assets/video/pano.webm';
  await video.play();

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();
  const context = canvas.getContext('gpupresent');

  const swapChainFormat = "bgra8unorm";

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

  const pipeline = device.createRenderPipeline({
    vertexStage: {
      module: device.createShaderModule({
        code: glslShaders.vertex,
        transform: (glsl) => glslang.compileGLSL(glsl, "vertex"),
      }),
      entryPoint: "main"
    },
    fragmentStage: {
      module: device.createShaderModule({
        code: glslShaders.fragment,
        transform: (glsl) => glslang.compileGLSL(glsl, "fragment"),
      }),
      entryPoint: "main"
    },

    primitiveTopology: "triangle-list",
    vertexState: {
      vertexBuffers: [{
        arrayStride: 20,
        attributes: [{
          // position
          shaderLocation: 0,
          offset: 0,
          format: "float3"
        }, {
          // uv
          shaderLocation: 1,
          offset: 12,
          format: "float2"
        }]
      }],
    },

    colorStates: [{
      format: swapChainFormat,
    }],
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  const videoTexture = device.createTexture({
    size: {
      width: video.videoWidth,
      height: video.videoHeight,
      depth: 1,
    },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.SAMPLED,
  });

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: sampler,
    }, {
      binding: 1,
      resource: videoTexture.createView(),
    }],
  });

  function updateVideoFrame() {
    // get the image bitmap, and then copy the new frame into |videoTexture|
    createImageBitmap(video).then(videoFrame => {
      device.defaultQueue.copyImageBitmapToTexture(
        {imageBitmap:videoFrame, origin: {x:0, y: 0} },
        {texture: videoTexture},
        {width: video.videoWidth, height:video.videoHeight, depth: 1}
      );
    });
  }

  let currentTime = 0;
  return function frame() { 
    if (
      video.currentTime - currentTime > 0.01 || // check frame update
      video.currentTime < currentTime // video clip restart
    ) {
      currentTime = video.currentTime;
      updateVideoFrame();
    }

    const commandEncoder = device.createCommandEncoder();
    const textureView = swapChain.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [{
        attachment: textureView,
        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    device.defaultQueue.submit([commandEncoder.finish()]);
  }
}

export const glslShaders = {
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
