/** Asserts a condition is truthy; throws an Error if not. */
export function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

/**
 * Tries to get a GPUDevice. Shows an error dialog if initialization fails, or
 * if later there is a device loss or uncaptured error.
 */
export async function initDeviceAndErrorDialog(
  requestAdapterOptions: GPURequestAdapterOptions | undefined = undefined,
  computeDeviceDescriptor: (
    adapter: GPUAdapter
  ) => GPUDeviceDescriptor | undefined = () => undefined
): Promise<GPUDevice> {
  const dialog = initDialog();
  try {
    assert(
      'gpu' in navigator,
      'WebGPU is not available in this browser (navigator.gpu is undefined)'
    );

    const adapter = await navigator.gpu.requestAdapter(requestAdapterOptions);
    assert(
      adapter,
      'WebGPU is not available on this system (requestAdapter() returned null)'
    );

    const deviceDescriptor = computeDeviceDescriptor(adapter);
    const device = await adapter.requestDevice(deviceDescriptor);
    device.lost.then((reason) => {
      dialog.show(`Device lost ("${reason.reason}"):\n${reason.message}`);
    });
    device.onuncapturederror = (error) => {
      dialog.show(`Uncaptured error:\n${error.error.message}`);
    };

    dialog.close();
    return device;
  } catch (ex) {
    dialog.show(
      ex instanceof Error ? (ex.message ? ex.message : ex.stack) : 'error'
    );
    throw ex;
  }
}

function initDialog() {
  if (typeof document === 'undefined') {
    // Not implemented in workers.
    return {
      show(msg: string) {
        console.error(msg);
      },
      close() {},
    };
  }

  const dialogBox = document.createElement('dialog');
  document.body.append(dialogBox);

  const dialogText = document.createElement('pre');
  dialogText.style.whiteSpace = 'pre-wrap';
  dialogBox.append(dialogText);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'OK';
  closeBtn.onclick = () => dialogBox.close();
  dialogBox.append(closeBtn);

  return {
    show(msg: string) {
      // Don't overwrite the dialog message while it's still open
      // (show the first error, not the most recent error).
      if (!dialogBox.open) {
        dialogText.textContent = msg;
        dialogBox.showModal();
      }
    },
    close() {
      dialogText.textContent = '';
      dialogBox.close();
    },
  };
}
