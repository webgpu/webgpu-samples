import * as dat from 'dat.gui';
import glslangModule from '../glslang';
import { updateBufferData } from '../helpers';

export const title = 'Animometer';
export const description = 'A WebGPU of port of the Animometer MotionMark benchmark.';

export async function init(canvas: HTMLCanvasElement) {
  const params = new URLSearchParams(window.location.search);
  const settings = {
    numTriangles: Number(params.get('numTriangles')) || 20000,
    renderBundles: Boolean(params.get('renderBundles')),
    dynamicOffsets: Boolean(params.get('dynamicOffsets')),
  };

  const vertexShaderGLSL = `#version 450
    layout(std140, set = 0, binding = 0) uniform Time {
        float time;
    };
    layout(std140, set = 1, binding = 0) uniform Uniforms {
        float scale;
        float offsetX;
        float offsetY;
        float scalar;
        float scalarOffset;
    };

    layout(location = 0) in vec4 position;
    layout(location = 1) in vec4 color;

    layout(location = 0) out vec4 v_color;

    void main() {
        float fade = mod(scalarOffset + time * scalar / 10.0, 1.0);
        if (fade < 0.5) {
            fade = fade * 2.0;
        } else {
            fade = (1.0 - fade) * 2.0;
        }
        float xpos = position.x * scale;
        float ypos = position.y * scale;
        float angle = 3.14159 * 2.0 * fade;
        float xrot = xpos * cos(angle) - ypos * sin(angle);
        float yrot = xpos * sin(angle) + ypos * cos(angle);
        xpos = xrot + offsetX;
        ypos = yrot + offsetY;
        v_color = vec4(fade, 1.0 - fade, 0.0, 1.0) + color;
        gl_Position = vec4(xpos, ypos, 0.0, 1.0);
    }
  `;

  const fragmentShaderGLSL = `#version 450

    layout(location = 0) in vec4 v_color;
    layout(location = 0) out vec4 outColor;

    void main() {
        outColor = v_color;
    }
  `;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const context = canvas.getContext('gpupresent');

  const swapChainFormat = "bgra8unorm";

  // @ts-ignore:
  const swapChain = context.configureSwapChain({
    device,
    format: swapChainFormat,
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.OUTPUT_ATTACHMENT
  });

  const timeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer" },
    ],
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer" },
    ],
  });

  const dynamicBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, type: "uniform-buffer", hasDynamicOffset: true },
    ],
  });

  const vec4Size = 4 * Float32Array.BYTES_PER_ELEMENT;
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [timeBindGroupLayout, bindGroupLayout] });
  const dynamicPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [timeBindGroupLayout, dynamicBindGroupLayout] });
  const pipelineDesc: GPURenderPipelineDescriptor = {
    layout: undefined,
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
    vertexState: {
      indexFormat: "uint32",
      vertexBuffers: [{
        // vertex buffer
        arrayStride: 2 * vec4Size,
        stepMode: "vertex",
        attributes: [{
          // vertex positions
          shaderLocation: 0,
          offset: 0,
          format: "float4"
        }, {
          // vertex colors
          shaderLocation: 1,
          offset: vec4Size,
          format: "float4"
        }],
      }],
    },
    rasterizationState: {
      frontFace: 'ccw',
      cullMode: 'none',
    },
    colorStates: [{
      format: swapChainFormat,
      alphaBlend: {},
      colorBlend: {},
    }],
  };

  const pipeline = device.createRenderPipeline(Object.assign({}, pipelineDesc, {
      layout: pipelineLayout
  }));

  const dynamicPipeline = device.createRenderPipeline(Object.assign({}, pipelineDesc, {
    layout: dynamicPipelineLayout
  }));

  const [vertexBuffer, vertexMapping] = device.createBufferMapped({
    size: 2 * 3 * vec4Size,
    usage: GPUBufferUsage.VERTEX
  });
  new Float32Array(vertexMapping).set([
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
    const alignedUniformFloats = alignedUniformBytes / Float32Array.BYTES_PER_ELEMENT;
    const uniformBuffer = device.createBuffer({
      size: numTriangles * alignedUniformBytes + Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });
    const uniformBufferData = new Float32Array(numTriangles * alignedUniformFloats);
    const bindGroups = new Array(numTriangles);
    for (let i = 0; i < numTriangles; ++i) {
      uniformBufferData[alignedUniformFloats * i + 0] = Math.random() * 0.2 + 0.2;        // scale
      uniformBufferData[alignedUniformFloats * i + 1] = 0.9 * 2 * (Math.random() - 0.5);  // offsetX
      uniformBufferData[alignedUniformFloats * i + 2] = 0.9 * 2 * (Math.random() - 0.5);  // offsetY
      uniformBufferData[alignedUniformFloats * i + 3] = Math.random() * 1.5 + 0.5;       // scalar
      uniformBufferData[alignedUniformFloats * i + 4] = Math.random() * 10;               // scalarOffset

      bindGroups[i] = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            offset: i * alignedUniformBytes,
            size: 6 * Float32Array.BYTES_PER_ELEMENT,
          }
        }]
      });
    }

    const dynamicBindGroup = device.createBindGroup({
      layout: dynamicBindGroupLayout,
      entries: [{
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: 6 * Float32Array.BYTES_PER_ELEMENT,
        },
      }],
    });

    const timeOffset = numTriangles * alignedUniformBytes;
    const timeBindGroup = device.createBindGroup({
      layout: timeBindGroupLayout,
      entries: [{
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: timeOffset,
          size: Float32Array.BYTES_PER_ELEMENT,
        }
      }]
    });

    const commandEncoder = device.createCommandEncoder();

    // createBufferMapped too large may OOM.
    const maxMappingLength = 14 * 1024 * 1024 / Float32Array.BYTES_PER_ELEMENT;
    for (let offset = 0; offset < uniformBufferData.length; offset += maxMappingLength) {
      const uploadCount = Math.min(uniformBufferData.length - offset, maxMappingLength);
      const [uploadBuffer, uploadMapping] = device.createBufferMapped({
        usage: GPUBufferUsage.COPY_SRC,
        size: uploadCount * Float32Array.BYTES_PER_ELEMENT,
      });

      new Float32Array(uploadMapping).set(new Float32Array(
        uniformBufferData.buffer,
        offset * Float32Array.BYTES_PER_ELEMENT,
        Math.min(uniformBufferData.length - offset, maxMappingLength)));

      uploadBuffer.unmap();

      commandEncoder.copyBufferToBuffer(
        uploadBuffer, 0,
        uniformBuffer, offset * Float32Array.BYTES_PER_ELEMENT,
        uploadCount * Float32Array.BYTES_PER_ELEMENT);
    }
    device.defaultQueue.submit([commandEncoder.finish()]);

    function recordRenderPass(passEncoder: GPURenderBundleEncoder | GPURenderPassEncoder) {
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
    let uniformTime = new Float32Array([0]);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        attachment: undefined, // Assigned later
        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
      }],
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

      const commandEncoder = device.createCommandEncoder();
      uniformTime[0] = (timestamp - startTime) / 1000;
      const { uploadBuffer } = updateBufferData(device, uniformBuffer, timeOffset, uniformTime, commandEncoder);

      renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

      if (settings.renderBundles) {
        passEncoder.executeBundles([renderBundle]);
      } else {
        recordRenderPass(passEncoder);
      }

      passEncoder.endPass();
      device.defaultQueue.submit([commandEncoder.finish()]);

      uploadBuffer.destroy();
    }
  }

  let doDraw = configure();

  const updateSettings = () => { doDraw = configure(); }
  const gui = new dat.GUI({ autoPlace: false });
  gui.add(settings, 'numTriangles', 0, 200000).step(1).onFinishChange(updateSettings);
  gui.add(settings, 'renderBundles');
  gui.add(settings, 'dynamicOffsets');

  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '10px';
  gui.domElement.style.right = '10px';
  canvas.parentNode.appendChild(gui.domElement);

  const perfDisplayContainer = document.createElement('div');
  perfDisplayContainer.style.color = 'white';
  perfDisplayContainer.style.background = 'black';
  perfDisplayContainer.style.position = 'absolute';
  perfDisplayContainer.style.top = '10px';
  perfDisplayContainer.style.left = '10px';

  const perfDisplay = document.createElement('pre');
  perfDisplayContainer.appendChild(perfDisplay);
  canvas.parentNode.appendChild(perfDisplayContainer);

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
      perfDisplay.innerHTML = `Avg Javascript: ${jsTimeAvg.toFixed(2)} ms\nAvg Frame: ${frameTimeAvg.toFixed(2)} ms`;
      updateDisplay = false;
      setTimeout(() => {
        updateDisplay = true;
      }, 100);
    }
  }
}
