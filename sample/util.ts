/** Shows an error dialog if getting an adapter wasn't successful. */
export function quitIfAdapterNotAvailable(
  adapter: GPUAdapter | null
): asserts adapter {
  if (!('gpu' in navigator)) {
    throw fail(
      'navigator.gpu is not defined - WebGPU not available in this browser'
    );
  }

  if (!adapter) {
    throw fail(
      "requestAdapter returned null - this sample can't run on this system"
    );
  }
}

export function quitIfLimitLessThan(
  adapter: GPUAdapter,
  limit: string,
  requiredValue: number,
  limits: Record<string, GPUSize32>
) {
  if (limit in adapter.limits) {
    const limitKey = limit as keyof GPUSupportedLimits;
    const limitValue = adapter.limits[limitKey] as number;
    if (limitValue < requiredValue) {
      throw fail(
        `This sample can't run on this system. ${limit} is ${limitValue}, and this sample requires at least ${requiredValue}.`
      );
    }
    limits[limit] = requiredValue;
  }
}

/**
 * Shows an error dialog if getting a adapter or device wasn't successful,
 * or if/when the device is lost or has an uncaptured error.
 */
export function quitIfWebGPUNotAvailable(
  adapter: GPUAdapter | null,
  device: GPUDevice | null
): asserts device {
  if (!device) {
    quitIfAdapterNotAvailable(adapter);
    throw fail('Unable to get a device for an unknown reason');
  }

  device.lost.then((reason) => {
    fail(`Device lost ("${reason.reason}"):\n${reason.message}`);
  });
  device.addEventListener('uncapturederror', (ev) => {
    fail(`Uncaptured error:\n${ev.error.message}`);
  });
}

/**
 * Create a MessageChannel, and forward messages to fail() to show an error
 * dialog. Return a MessagePort for the worker to send messages back on.
 */
export function mainThreadCreateErrorMessagePortForWorker() {
  if (typeof window === 'undefined') throw new Error('Called on wrong thread!');
  const mc = new MessageChannel();
  mc.port1.onmessage = (ev: MessageEvent<string>) => {
    fail(ev.data);
  };
  return mc.port2;
}

let errorMessagePort: MessagePort | null = null;
export function workerRegisterErrorMessagePort(port: MessagePort) {
  if (typeof window !== 'undefined') throw new Error('Called on wrong thread!');
  errorMessagePort = port;
}

/**
 * Fail by showing a console error, and dialog box if possible.
 *
 * Returns an Error object, which may be thrown if execution should stop here.
 * (Throwing the error will generally trigger one of the global listeners,
 * 'unhandledrejection' or 'error', but this won't do anything because the
 * dialog is already open at that point, and we don't overwrite it.)
 */
const fail: (message: string) => Error = (() => {
  type ErrorOutput = { show(msg: string): void };

  function createErrorOutput() {
    if (typeof document === 'undefined') {
      return {
        show(msg: string) {
          if (errorMessagePort) {
            errorMessagePort.postMessage(msg);
          } else {
            console.warn('workerRegisterErrorMessagePort has not been called!');
            console.error(msg);
          }
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
      show(msg: string) {
        // Don't overwrite the dialog message while it's still open
        // (show the first error, not the most recent error).
        if (!dialogBox.open) {
          dialogText.textContent = msg;
          dialogBox.showModal();
        }
      },
    };
  }

  let output: ErrorOutput | undefined;

  return (message: string) => {
    if (!output) output = createErrorOutput();

    output.show(message);
    return new Error(message);
  };
})();
