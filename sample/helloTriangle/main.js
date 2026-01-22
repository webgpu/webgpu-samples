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

// Show an error dialog if there's any uncaught exception or promise rejection.
// This gets set up on all pages that include util.ts.
globalThis.addEventListener('unhandledrejection', (ev) => {
    fail(`unhandled promise rejection, please report a bug!
  https://github.com/webgpu/webgpu-samples/issues/new\n${ev.reason}`);
});
globalThis.addEventListener('error', (ev) => {
    fail(`uncaught exception, please report a bug!
  https://github.com/webgpu/webgpu-samples/issues/new\n${ev.error}`);
});
/** Shows an error dialog if getting an adapter wasn't successful. */
function quitIfAdapterNotAvailable(adapter) {
    if (!('gpu' in navigator)) {
        fail('navigator.gpu is not defined - WebGPU not available in this browser');
    }
    if (!adapter) {
        fail("requestAdapter returned null - this sample can't run on this system");
    }
}
function supportsDirectBufferBinding(device) {
    const buffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM,
    });
    const layout = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: {} }],
    });
    try {
        device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: buffer }],
        });
        return true;
    }
    catch {
        return false;
    }
    finally {
        buffer.destroy();
    }
}
function supportsDirectTextureBinding(device) {
    const texture = device.createTexture({
        size: [1],
        usage: GPUTextureUsage.TEXTURE_BINDING,
        format: 'rgba8unorm',
    });
    const layout = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} }],
    });
    try {
        device.createBindGroup({
            layout,
            entries: [{ binding: 0, resource: texture }],
        });
        return true;
    }
    catch {
        return false;
    }
    finally {
        texture.destroy();
    }
}
function supportsDirectTextureAttachments(device) {
    const texture = device.createTexture({
        size: [1],
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'rgba8unorm',
        sampleCount: 4,
    });
    const resolveTarget = device.createTexture({
        size: [1],
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'rgba8unorm',
    });
    const depthTexture = device.createTexture({
        size: [1],
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        format: 'depth16unorm',
        sampleCount: 4,
    });
    const encoder = device.createCommandEncoder();
    try {
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                { view: texture, resolveTarget, loadOp: 'load', storeOp: 'store' },
            ],
            depthStencilAttachment: {
                view: depthTexture,
                depthLoadOp: 'load',
                depthStoreOp: 'store',
            },
        });
        pass.end();
        return true;
    }
    catch (e) {
        console.error(e);
        return false;
    }
    finally {
        encoder.finish();
        texture.destroy();
        resolveTarget.destroy();
    }
}
/**
 * Shows an error dialog if getting a adapter or device wasn't successful,
 * or if/when the device is lost or has an uncaptured error. Also checks
 * for direct buffer binding, direct texture binding, and direct texture attachment binding.
 */
function quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device) {
    if (!device) {
        quitIfAdapterNotAvailable(adapter);
        fail('Unable to get a device for an unknown reason');
        return;
    }
    device.lost.then((reason) => {
        fail(`Device lost ("${reason.reason}"):\n${reason.message}`);
    });
    device.addEventListener('uncapturederror', (ev) => {
        fail(`Uncaptured error:\n${ev.error.message}`);
    });
    if (!supportsDirectBufferBinding(device) ||
        !supportsDirectTextureBinding(device) ||
        !supportsDirectTextureAttachments(device)) {
        fail('Core features of WebGPU are unavailable. Please update your browser to a newer version.');
    }
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
const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: 'compatibility',
});
const device = await adapter?.requestDevice();
quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);
const context = canvas.getContext('webgpu');
const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device,
    format: presentationFormat,
});
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
});
function frame() {
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    const renderPassDescriptor = {
        colorAttachments: [
            {
                view: textureView,
                clearValue: [0, 0, 0, 0], // Clear to transparent
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
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
//# sourceMappingURL=main.js.map
