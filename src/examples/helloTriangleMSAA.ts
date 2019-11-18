import glslangModule from '../glslang';

export const title = 'Hello Triangle MSAA';
export const description = 'Shows rendering a basic triangle with multisampling.';

export async function init(canvas: HTMLCanvasElement) {
    const vertexShaderGLSL = `#version 450
      const vec2 pos[3] = vec2[3](vec2(0.0f, 0.5f), vec2(-0.5f, -0.5f), vec2(0.5f, -0.5f));

      void main() {
          gl_Position = vec4(pos[gl_VertexIndex], 0.0, 1.0);
      }
    `;

    const fragmentShaderGLSL = `#version 450
      layout(location = 0) out vec4 outColor;

      void main() {
          outColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const glslang = await glslangModule();

    const context = canvas.getContext('gpupresent');

    const swapChainFormat = "bgra8unorm";

    // @ts-ignore:
    const swapChain: GPUSwapChain = context.configureSwapChain({
      device,
      format: swapChainFormat,
    });

    const sampleCount = 4;

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [] }),

      vertexStage: {
        module: device.createShaderModule({
          code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),

          // @ts-ignore
          source: vertexShaderGLSL,
          transform: source => glslang.compileGLSL(source, "vertex"),
        }),
        entryPoint: "main"
      },
      fragmentStage: {
        module: device.createShaderModule({
          code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),

          // @ts-ignore
          source: fragmentShaderGLSL,
          transform: source => glslang.compileGLSL(source, "fragment"),
        }),
        entryPoint: "main"
      },

      primitiveTopology: "triangle-list",

      colorStates: [{
        format: swapChainFormat,
      }],

      sampleCount,
    });

    const texture = device.createTexture({
      size: {
        width: canvas.width,
        height: canvas.height,
        depth: 1,
      },
      sampleCount,
      format: swapChainFormat,
      usage: GPUTextureUsage.OUTPUT_ATTACHMENT,
    });
    const attachment = texture.createView();

    function frame() {
      const commandEncoder = device.createCommandEncoder({});

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [{
          attachment: attachment,
          resolveTarget: swapChain.getCurrentTexture().createView(),
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        }],
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.draw(3, 1, 0, 0);
      passEncoder.endPass();

      device.defaultQueue.submit([commandEncoder.finish()]);
    }

    return frame;
}
