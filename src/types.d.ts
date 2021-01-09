/// <reference types="@webgpu/types" />
/// <reference types="webgpu-shader-module-transform" />

declare module '*.module.css' {
  const styles: { [className: string]: string };
  export default styles;
}
interface HTMLCanvasElement extends HTMLElement {
  getContext(contextId: 'gpupresent'): GPUCanvasContext | null;
}

declare const __SOURCE__: string;

// Defined by webpack.
declare namespace NodeJS {
  interface Process {
    readonly browser: boolean;
  }

  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production' | 'test';
  }
}
