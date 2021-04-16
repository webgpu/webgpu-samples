import { makeBasicExample } from '../../components/basicExample';
import glslangModule from '../../glslang';

async function init(canvas: HTMLCanvasElement, useWGSL: boolean) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const context = canvas.getContext('gpupresent');

  const swapChainFormat = 'bgra8unorm';

  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
  });

  const pipeline = device.createRenderPipeline({
    vertex: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertex,
          })
        : device.createShaderModule({
            code: glslShaders.vertex,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
          }),
      entryPoint: 'main',
    },
    fragment: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragment,
          })
        : device.createShaderModule({
            code: glslShaders.fragment,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
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

  function frame() {
    const commandEncoder = device.createCommandEncoder();
    const textureView = swapChain.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          attachment: textureView,
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.endPass();

    device.queue.submit([commandEncoder.finish()]);
  }

  return frame;
}

const glslShaders = {
  vertex: `#version 450
const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));

void main() {
    gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
}
`,

  fragment: `#version 450
  layout(location = 0) out vec4 outColor;

  void main() {
      outColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`,
};

const wgslShaders = {
  vertex: `
let pos : array<vec2<f32>, 3> = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.5),
    vec2<f32>(-0.5, -0.5),
    vec2<f32>(0.5, -0.5));

[[stage(vertex)]]
fn main([[builtin(vertex_index)]] VertexIndex : u32)
     -> [[builtin(position)]] vec4<f32> {
  return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`,
  fragment: `
[[stage(fragment)]]
fn main() -> [[location(0)]] vec4<f32> {
  return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
`,
};

// import ma from '../../components/BasicExample';

const HelloTriangle = makeBasicExample({
  name: 'Hello Triangle',
  description: 'Shows rendering a basic triangle.',
  slug: 'helloTriangle',
  wgslShaders,
  glslShaders,
  init,
  source: __SOURCE__,
});

export default HelloTriangle;
