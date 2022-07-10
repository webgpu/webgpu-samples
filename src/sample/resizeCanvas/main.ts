import { makeSample, SampleInit } from '../../components/SampleLayout';

import triangleVertWGSL from '../../shaders/triangle.vert.wgsl';
import redFragWGSL from '../../shaders/red.frag.wgsl';

import styles from './animatedCanvasSize.module.css';

const init: SampleInit = async ({ canvasRef }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = canvasRef.current;
  
  if (canvas === null) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const presentationSize = [canvas.width, canvas.height];

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'opaque',
  });

  const sampleCount = 4;

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: triangleVertWGSL,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: redFragWGSL,
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
    multisample: {
      count: 4,
    },
  });

  const renderTarget = device.createTexture({
    size: presentationSize,
    sampleCount,
    format: presentationFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  canvas.classList.add(styles.animatedCanvasSize);

  function frame() {
    // Sample is no longer the active page.
    if (!canvas) return;

    const commandEncoder = device.createCommandEncoder();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: renderTarget.createView(),
          resolveTarget: context.getCurrentTexture().createView(),
          clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

const ResizeCanvas: () => JSX.Element = () =>
  makeSample({
    name: 'Resize Canvas',
    description:
      'Shows multisampled rendering a basic triangle on a dynamically sized canvas.',
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/triangle.vert.wgsl',
        contents: triangleVertWGSL,
        editable: true,
      },
      {
        name: '../../shaders/red.frag.wgsl',
        contents: redFragWGSL,
        editable: true,
      },
      {
        name: './animatedCanvasSize.module.css',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./animatedCanvasSize.module.css')
          .default,
      },
    ],
    filename: __filename,
  });

export default ResizeCanvas;
