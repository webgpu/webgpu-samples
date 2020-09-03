interface HTMLCanvasElement extends HTMLElement {
  getContext(
    contextId: "gpupresent"
  ): GPUCanvasContext | null;
}
