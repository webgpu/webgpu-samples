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

    const vertexShaderWGSL = `
      var<private> pos : array<vec2<f32>, 3> = array<vec2<f32>, 3>(
          vec2<f32>(0.0, 0.5),
          vec2<f32>(-0.5, -0.5),
          vec2<f32>(0.5, -0.5));

      [[builtin position]] var<out> Position : vec4<f32>;
      [[builtin vertex_idx]] var<in> VertexIndex : i32;

      fn vtx_main() -> void {
        Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        return;
      }
      entry_point vertex as "main" = vtx_main;
    `;

    const fragmentShaderGLSL = `#version 450
      layout(location = 0) out vec4 outColor;

      void main() {
          outColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `;

    const fragmentShaderWGSL = `
      [[location 0]] var<out> outColor : vec4<f32>;
      fn frag_main() -> void {
        outColor = vec4<f32>(1.0, 0.0, 0.0, 1.0);
        return;
      }
      entry_point fragment as "main" = frag_main;
    `;

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const glslang = await glslangModule();
    const useWGSL =
      new URLSearchParams(window.location.search).get("wgsl") != "0";

    const context = canvas.getContext('gpupresent');

    const swapChainFormat = "bgra8unorm";

    const swapChain: GPUSwapChain = context.configureSwapChain({
      device,
      format: swapChainFormat,
    });

    const sampleCount = 4;

    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [] }),

      vertexStage: {
        module: useWGSL
          ? device.createShaderModule({
              code: vertexShaderWGSL,
            })
          : device.createShaderModule({
              code: vertexShaderGLSL,
              transform: (glsl) => glslang.compileGLSL(glsl, "vertex"),
            }),
        entryPoint: "main",
      },
      fragmentStage: {
        module: useWGSL
          ? device.createShaderModule({
              code: fragmentShaderWGSL,
            })
          : device.createShaderModule({
              code: fragmentShaderGLSL,
              transform: (glsl) => glslang.compileGLSL(glsl, "fragment"),
            }),
        entryPoint: "main",
      },

      primitiveTopology: "triangle-list",

      colorStates: [
        {
          format: swapChainFormat,
        },
      ],

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
