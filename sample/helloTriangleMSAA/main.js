var triangleVertWGSL = `@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5)
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}
`;

var redFragWGSL = `@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;

const canvas = document.querySelector('canvas');
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
});
const sampleCount = 4;
const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: device.createShaderModule({
            code: triangleVertWGSL,
        }),
    },
    fragment: {
        module: device.createShaderModule({
            code: redFragWGSL,
        }),
        targets: [
            {
                format: presentationFormat,
            },
        ],
    },
    primitive: {
        topology: 'triangle-list',
    },
    multisample: {
        count: sampleCount,
    },
});
const texture = device.createTexture({
    size: [canvas.width, canvas.height],
    sampleCount,
    format: presentationFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
const view = texture.createView();
function frame() {
    const commandEncoder = device.createCommandEncoder();
    const renderPassDescriptor = {
        colorAttachments: [
            {
                view,
                resolveTarget: context.getCurrentTexture().createView(),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'discard',
            },
        ],
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
