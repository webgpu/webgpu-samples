// Input holds as snapshot of input state
export default interface Input {
  // Digital input (e.g keyboard state)
  readonly digital: {
    readonly forward: boolean;
    readonly backward: boolean;
    readonly left: boolean;
    readonly right: boolean;
    readonly up: boolean;
    readonly down: boolean;
  };
  // Analog input (e.g mouse, touchscreen)
  readonly analog: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly touching: boolean;
  };
}

// InputHandler is a function that when called, returns the current Input state.
export type InputHandler = () => Input;

// createInputHandler returns an InputHandler by attaching event handlers to the window and canvas.
export function createInputHandler(
  window: Window,
  canvas: HTMLCanvasElement
): InputHandler {
  const digital = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  };
  const analog = {
    x: 0,
    y: 0,
    zoom: 0,
  };
  let mouseDown = false;

  const setDigital = (e: KeyboardEvent, value: boolean) => {
    switch (e.code) {
      case 'KeyW':
        digital.forward = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'KeyS':
        digital.backward = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'KeyA':
        digital.left = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'KeyD':
        digital.right = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'Space':
        digital.up = value;
        e.preventDefault();
        e.stopPropagation();
        break;
      case 'ShiftLeft':
      case 'ControlLeft':
      case 'KeyC':
        digital.down = value;
        e.preventDefault();
        e.stopPropagation();
        break;
    }
  };

  window.addEventListener('keydown', (e) => setDigital(e, true));
  window.addEventListener('keyup', (e) => setDigital(e, false));

  canvas.style.touchAction = 'pinch-zoom';
  canvas.addEventListener('pointerdown', () => {
    mouseDown = true;
  });
  canvas.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (e) => {
    mouseDown = e.pointerType == 'mouse' ? (e.buttons & 1) !== 0 : true;
    if (mouseDown) {
      analog.x += e.movementX;
      analog.y += e.movementY;
    }
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      mouseDown = (e.buttons & 1) !== 0;
      if (mouseDown) {
        // The scroll value varies substantially between user agents / browsers.
        // Just use the sign.
        analog.zoom += Math.sign(e.deltaY);
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false }
  );

  return () => {
    const out = {
      digital,
      analog: {
        x: analog.x,
        y: analog.y,
        zoom: analog.zoom,
        touching: mouseDown,
      },
    };
    // Clear the analog values, as these accumulate.
    analog.x = 0;
    analog.y = 0;
    analog.zoom = 0;
    return out;
  };
}
