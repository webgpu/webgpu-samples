import { makeSample, SampleInit } from '../../components/SampleLayout';

const init: SampleInit = async ({ canvas, pageState }) => {
  if (!pageState.active) return;

  // The web worker is created by passing a path to the worker's source file, which will then be
  // executed on a separate thread.
  const worker = new Worker(new URL('./worker.ts', import.meta.url));

  // The primary way to communicate with the worker is to send and receive messages.
  worker.addEventListener('message', (ev) => {
    // The format of the message can be whatever you'd like, but it's helpful to decide on a
    // consistent convention so that you can tell the message types apart as your apps grow in
    // complexity. Here we establish a convention that all messages to and from the worker will
    // have a `type` field that we can use to determine the content of the message.
    switch (ev.data.type) {
      default: {
        console.error(`Unknown Message Type: ${ev.data.type}`);
      }
    }
  });

  try {
    // In order for the worker to display anything on the page, an OffscreenCanvas must be used.
    // Here we can create one from our normal canvas by calling transferControlToOffscreen().
    // Anything drawn to the OffscreenCanvas that call returns will automatically be displayed on
    // the source canvas on the page.
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const devicePixelRatio = window.devicePixelRatio;
    offscreenCanvas.width = canvas.clientWidth * devicePixelRatio;
    offscreenCanvas.height = canvas.clientHeight * devicePixelRatio;

    // Send a message to the worker telling it to initialize WebGPU with the OffscreenCanvas. The
    // array passed as the second argument here indicates that the OffscreenCanvas is to be
    // transferred to the worker, meaning this main thread will lose access to it and it will be
    // fully owned by the worker.
    worker.postMessage({ type: 'init', offscreenCanvas }, [offscreenCanvas]);
  } catch (err) {
    // TODO: This catch is added here because React will call init twice with the same canvas, and
    // the second time will fail the transferControlToOffscreen() because it's already been
    // transferred. I'd love to know how to get around that.
    console.warn(err.message);
    worker.terminate();
  }
};

const WebGPUWorker: () => JSX.Element = () =>
  makeSample({
    name: 'WebGPU in a Worker',
    description: `This example shows one method of using WebGPU in a web worker and presenting to
      the main thread. It uses canvas.transferControlToOffscreen() to produce an offscreen canvas
      which is then transferred to the worker where all the WebGPU calls are made.`,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './worker.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./worker.ts').default,
      },
      {
        name: '../../shaders/basic.vert.wgsl',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../shaders/basic.vert.wgsl').default,
      },
      {
        name: '../../shaders/vertexPositionColor.frag.wgsl',
        contents:
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('!!raw-loader!../../shaders/vertexPositionColor.frag.wgsl')
            .default,
      },
      {
        name: '../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default WebGPUWorker;
