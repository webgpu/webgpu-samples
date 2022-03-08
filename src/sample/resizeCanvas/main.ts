import { makeSample, SampleInit } from '../../components/SampleLayout';

import triangleVertWGSL from '../../shaders/triangle.vert.wgsl';
import redFragWGSL from '../../shaders/red.frag.wgsl';

import styles from './animatedCanvasSize.module.css';

const init: SampleInit = async ({ canvasRef }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;
  const context = canvasRef.current.getContext('webgpu');

  const presentationFormat = context.getPreferredFormat(adapter);

  const devicePixelRatio = window.devicePixelRatio || 1;
  const presentationSize = [
    canvasRef.current.clientWidth * devicePixelRatio,
    canvasRef.current.clientHeight * devicePixelRatio,
  ];

  context.configure({
    device,
    format: presentationFormat,
    size: presentationSize,
  });

  const sampleCount = 4;

  const pipeline = device.createRenderPipeline({
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

  let renderTarget: GPUTexture | undefined = undefined;
  let renderTargetView: GPUTextureView;

  canvasRef.current.classList.add(styles.animatedCanvasSize);

  function frame() {
    // Sample is no longer the active page.
    if (!canvasRef.current) return;

    // The canvas size is animating via CSS.
    // When the size changes, we need to reallocate the render target.
    // We also need to set the physical size of the canvas to match the computed CSS size.
    if (
      canvasRef.current.clientWidth !== presentationSize[0] ||
      canvasRef.current.clientHeight !== presentationSize[1]
    ) {
      if (renderTarget !== undefined) {
        // Destroy the previous render target
        renderTarget.destroy();
      }

      presentationSize[0] = canvasRef.current.clientWidth;
      presentationSize[1] = canvasRef.current.clientHeight;

      // Reconfigure the canvas size.
      context.configure({
        device,
        format: presentationFormat,
        size: presentationSize,
      });

      renderTarget = device.createTexture({
        size: presentationSize,
        sampleCount,
        format: presentationFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      renderTargetView = renderTarget.createView();
    }

    const commandEncoder = device.createCommandEncoder();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: renderTargetView,
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
        name: __filename.substr(__dirname.length + 1),
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
