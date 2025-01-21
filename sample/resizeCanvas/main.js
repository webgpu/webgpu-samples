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

/** Shows an error dialog if getting an adapter wasn't successful. */
function quitIfAdapterNotAvailable(adapter) {
    if (!('gpu' in navigator)) {
        fail('navigator.gpu is not defined - WebGPU not available in this browser');
    }
    if (!adapter) {
        fail("requestAdapter returned null - this sample can't run on this system");
    }
}
/**
 * Shows an error dialog if getting a adapter or device wasn't successful,
 * or if/when the device is lost or has an uncaptured error.
 */
function quitIfWebGPUNotAvailable(adapter, device) {
    if (!device) {
        quitIfAdapterNotAvailable(adapter);
        fail('Unable to get a device for an unknown reason');
        return;
    }
    device.lost.then((reason) => {
        fail(`Device lost ("${reason.reason}"):\n${reason.message}`);
    });
    device.onuncapturederror = (ev) => {
        fail(`Uncaptured error:\n${ev.error.message}`);
    };
}
/** Fail by showing a console error, and dialog box if possible. */
const fail = (() => {
    function createErrorOutput() {
        if (typeof document === 'undefined') {
            // Not implemented in workers.
            return {
                show(msg) {
                    console.error(msg);
                },
            };
        }
        const dialogBox = document.createElement('dialog');
        dialogBox.close();
        document.body.append(dialogBox);
        const dialogText = document.createElement('pre');
        dialogText.style.whiteSpace = 'pre-wrap';
        dialogBox.append(dialogText);
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'OK';
        closeBtn.onclick = () => dialogBox.close();
        dialogBox.append(closeBtn);
        return {
            show(msg) {
                // Don't overwrite the dialog message while it's still open
                // (show the first error, not the most recent error).
                if (!dialogBox.open) {
                    dialogText.textContent = msg;
                    dialogBox.showModal();
                }
            },
        };
    }
    let output;
    return (message) => {
        if (!output)
            output = createErrorOutput();
        output.show(message);
        throw new Error(message);
    };
})();

const canvas = document.querySelector('canvas');
const adapter = await navigator.gpu?.requestAdapter();
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailable(adapter, device);
const context = canvas.getContext('webgpu');
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
context.configure({
    device,
    format: presentationFormat,
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
let renderTarget = undefined;
let renderTargetView;
function frame() {
    const currentWidth = canvas.clientWidth * devicePixelRatio;
    const currentHeight = canvas.clientHeight * devicePixelRatio;
    // The canvas size is animating via CSS.
    // When the size changes, we need to reallocate the render target.
    // We also need to set the physical size of the canvas to match the computed CSS size.
    if ((currentWidth !== canvas.width ||
        currentHeight !== canvas.height ||
        !renderTargetView) &&
        currentWidth &&
        currentHeight) {
        if (renderTarget !== undefined) {
            // Destroy the previous render target
            renderTarget.destroy();
        }
        // Setting the canvas width and height will automatically resize the textures returned
        // when calling getCurrentTexture() on the context.
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        // Resize the multisampled render target to match the new canvas size.
        renderTarget = device.createTexture({
            size: [canvas.width, canvas.height],
            sampleCount,
            format: presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        renderTargetView = renderTarget.createView();
    }
    if (renderTargetView) {
        const commandEncoder = device.createCommandEncoder();
        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: renderTargetView,
                    resolveTarget: context.getCurrentTexture().createView(),
                    clearValue: [0.2, 0.2, 0.2, 1.0],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.draw(3);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
