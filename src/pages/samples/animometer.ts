import type { GUI } from 'dat.gui';
import { makeBasicExample } from '../../components/basicExample';

async function init(canvas: HTMLCanvasElement, gui: GUI) {
  const perfDisplayContainer = document.createElement('div');
  perfDisplayContainer.style.color = 'white';
  perfDisplayContainer.style.background = 'black';
  perfDisplayContainer.style.position = 'absolute';
  perfDisplayContainer.style.top = '10px';
  perfDisplayContainer.style.left = '10px';

  const perfDisplay = document.createElement('pre');
  perfDisplayContainer.appendChild(perfDisplay);
  canvas.parentNode.appendChild(perfDisplayContainer);

  const params = new URLSearchParams(window.location.search);
  const settings = {
    numTriangles: Number(params.get('numTriangles')) || 20000,
    renderBundles: Boolean(params.get('renderBundles')),
    dynamicOffsets: Boolean(params.get('dynamicOffsets')),
  };

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext('gpupresent');

  const swapChainFormat = 'bgra8unorm';

  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const timeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
          minBindingSize: 4,
        },
      },
    ],
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
          minBindingSize: 20,
        },
      },
    ],
  });

  const dynamicBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
          hasDynamicOffset: true,
          minBindingSize: 20,
        },
      },
    ],
  });

  const vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [timeBindGroupLayout, bindGroupLayout],
  });
  const dynamicPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [timeBindGroupLayout, dynamicBindGroupLayout],
  });
  const pipelineDesc: GPURenderPipelineDescriptor = {
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertex,
      }),
      entryPoint: 'main',
      buffers: [
        {
          // vertex buffer
          arrayStride: 2 * vec4Size,
          stepMode: 'vertex',
          attributes: [
            {
              // vertex positions
              shaderLocation: 0,
              offset: 0,
              format: 'float32x4',
            },
            {
              // vertex colors
              shaderLocation: 1,
              offset: vec4Size,
              format: 'float32x4',
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
      frontFace: 'ccw',
      cullMode: 'none',
    },
  };

  const pipeline = device.createRenderPipeline({
    ...pipelineDesc,
    layout: pipelineLayout,
  });

  const dynamicPipeline = device.createRenderPipeline({
    ...pipelineDesc,
    layout: dynamicPipelineLayout,
  });

  const vertexBuffer = device.createBuffer({
    size: 2 * 3 * vec4Size,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  // prettier-ignore
  new Float32Array(vertexBuffer.getMappedRange()).set([
    // position data  /**/ color data
    0, 0.1, 0, 1,     /**/ 1, 0, 0, 1,
    -0.1, -0.1, 0, 1, /**/ 0, 1, 0, 1,
    0.1, -0.1, 0, 1,  /**/ 0, 0, 1, 1,
  ]);
  vertexBuffer.unmap();

  function configure() {
    const numTriangles = settings.numTriangles;
    const uniformBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
    const alignedUniformBytes = Math.ceil(uniformBytes / 256) * 256;
    const alignedUniformFloats =
      alignedUniformBytes / Float32Array.BYTES_PER_ELEMENT;
    const uniformBuffer = device.createBuffer({
      size: numTriangles * alignedUniformBytes + Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    const uniformBufferData = new Float32Array(
      numTriangles * alignedUniformFloats
    );
    const bindGroups = new Array(numTriangles);
    for (let i = 0; i < numTriangles; ++i) {
      uniformBufferData[alignedUniformFloats * i + 0] =
        Math.random() * 0.2 + 0.2; // scale
      uniformBufferData[alignedUniformFloats * i + 1] =
        0.9 * 2 * (Math.random() - 0.5); // offsetX
      uniformBufferData[alignedUniformFloats * i + 2] =
        0.9 * 2 * (Math.random() - 0.5); // offsetY
      uniformBufferData[alignedUniformFloats * i + 3] =
        Math.random() * 1.5 + 0.5; // scalar
      uniformBufferData[alignedUniformFloats * i + 4] = Math.random() * 10; // scalarOffset

      bindGroups[i] = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: {
              buffer: uniformBuffer,
              offset: i * alignedUniformBytes,
              size: 6 * Float32Array.BYTES_PER_ELEMENT,
            },
          },
        ],
      });
    }

    const dynamicBindGroup = device.createBindGroup({
      layout: dynamicBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            offset: 0,
            size: 6 * Float32Array.BYTES_PER_ELEMENT,
          },
        },
      ],
    });

    const timeOffset = numTriangles * alignedUniformBytes;
    const timeBindGroup = device.createBindGroup({
      layout: timeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            offset: timeOffset,
            size: Float32Array.BYTES_PER_ELEMENT,
          },
        },
      ],
    });

    // writeBuffer too large may OOM. TODO: The browser should internally chunk uploads.
    const maxMappingLength =
      (14 * 1024 * 1024) / Float32Array.BYTES_PER_ELEMENT;
    for (
      let offset = 0;
      offset < uniformBufferData.length;
      offset += maxMappingLength
    ) {
      const uploadCount = Math.min(
        uniformBufferData.length - offset,
        maxMappingLength
      );

      device.queue.writeBuffer(
        uniformBuffer,
        offset * Float32Array.BYTES_PER_ELEMENT,
        uniformBufferData.buffer,
        uniformBufferData.byteOffset + offset * Float32Array.BYTES_PER_ELEMENT,
        uploadCount * Float32Array.BYTES_PER_ELEMENT
      );
    }

    function recordRenderPass(
      passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder
    ) {
      if (settings.dynamicOffsets) {
        passEncoder.setPipeline(dynamicPipeline);
      } else {
        passEncoder.setPipeline(pipeline);
      }
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setBindGroup(0, timeBindGroup);
      const dynamicOffsets = [0];
      for (let i = 0; i < numTriangles; ++i) {
        if (settings.dynamicOffsets) {
          dynamicOffsets[0] = i * alignedUniformBytes;
          passEncoder.setBindGroup(1, dynamicBindGroup, dynamicOffsets);
        } else {
          passEncoder.setBindGroup(1, bindGroups[i]);
        }
        passEncoder.draw(3, 1, 0, 0);
      }
    }

    let startTime = undefined;
    const uniformTime = new Float32Array([0]);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later
          loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          storeOp: 'store',
        },
      ],
    };

    const renderBundleEncoder = device.createRenderBundleEncoder({
      colorFormats: [swapChainFormat],
    });
    recordRenderPass(renderBundleEncoder);
    const renderBundle = renderBundleEncoder.finish();

    return function doDraw(timestamp) {
      if (startTime === undefined) {
        startTime = timestamp;
      }
      uniformTime[0] = (timestamp - startTime) / 1000;
      device.queue.writeBuffer(uniformBuffer, timeOffset, uniformTime.buffer);

      renderPassDescriptor.colorAttachments[0].view = swapChain
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      if (settings.renderBundles) {
        passEncoder.executeBundles([renderBundle]);
      } else {
        recordRenderPass(passEncoder);
      }

      passEncoder.endPass();
      device.queue.submit([commandEncoder.finish()]);
    };
  }

  let doDraw = configure();

  const updateSettings = () => {
    doDraw = configure();
  };
  gui
    .add(settings, 'numTriangles', 0, 200000)
    .step(1)
    .onFinishChange(updateSettings);
  gui.add(settings, 'renderBundles');
  gui.add(settings, 'dynamicOffsets');

  let previousFrameTimestamp = undefined;
  let jsTimeAvg = undefined;
  let frameTimeAvg = undefined;
  let updateDisplay = true;

  return function frame(timestamp) {
    let frameTime = 0;
    if (previousFrameTimestamp !== undefined) {
      frameTime = timestamp - previousFrameTimestamp;
    }
    previousFrameTimestamp = timestamp;

    const start = performance.now();
    doDraw(timestamp);
    const jsTime = performance.now() - start;
    if (frameTimeAvg === undefined) {
      frameTimeAvg = frameTime;
    }
    if (jsTimeAvg === undefined) {
      jsTimeAvg = jsTime;
    }

    const w = 0.2;
    frameTimeAvg = (1 - w) * frameTimeAvg + w * frameTime;
    jsTimeAvg = (1 - w) * jsTimeAvg + w * jsTime;

    if (updateDisplay) {
      perfDisplay.innerHTML = `Avg Javascript: ${jsTimeAvg.toFixed(
        2
      )} ms\nAvg Frame: ${frameTimeAvg.toFixed(2)} ms`;
      updateDisplay = false;
      setTimeout(() => {
        updateDisplay = true;
      }, 100);
    }
  };
}

const wgslShaders = {
  vertex: `
[[block]] struct Time {
  value : f32;
};

[[block]] struct Uniforms {
  scale : f32;
  offsetX : f32;
  offsetY : f32;
  scalar : f32;
  scalarOffset : f32;
};

[[binding(0), group(0)]] var<uniform> time : Time;
[[binding(0), group(1)]] var<uniform> uniforms : Uniforms;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] v_color : vec4<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec4<f32>,
        [[location(1)]] color : vec4<f32>) -> VertexOutput {
    var fade : f32 = (uniforms.scalarOffset + time.value * uniforms.scalar / 10.0) % 1.0;
    if (fade < 0.5) {
        fade = fade * 2.0;
    } else {
        fade = (1.0 - fade) * 2.0;
    }
    var xpos : f32 = position.x * uniforms.scale;
    var ypos : f32 = position.y * uniforms.scale;
    var angle : f32 = 3.14159 * 2.0 * fade;
    var xrot : f32 = xpos * cos(angle) - ypos * sin(angle);
    var yrot : f32 = xpos * sin(angle) + ypos * cos(angle);
    xpos = xrot + uniforms.offsetX;
    ypos = yrot + uniforms.offsetY;
    var output : VertexOutput;
    output.v_color = vec4<f32>(fade, 1.0 - fade, 0.0, 1.0) + color;
    output.Position = vec4<f32>(xpos, ypos, 0.0, 1.0);
    return output;
}
`,

  fragment: `
[[stage(fragment)]]
fn main([[location(0)]] v_color : vec4<f32>) -> [[location(0)]] vec4<f32> {
  return v_color;
}
`,
};

export default makeBasicExample({
  name: 'Animometer',
  slug: 'animometer',
  description: 'A WebGPU of port of the Animometer MotionMark benchmark.',
  gui: true,
  init,
  source: __SOURCE__,
});
