const canvas = document.querySelector('canvas') as HTMLCanvasElement;

// The web worker is created by passing a path to the worker's source file, which will then be
// executed on a separate thread.
const worker = new Worker(new URL('./worker.js', import.meta.url));

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
