let displayedNotSupportedError = false;
export function checkWebGPUSupport() {
  if (!navigator.gpu) {
    document.getElementById('not-supported').style.display = 'block';
    if (!displayedNotSupportedError) {
      alert('WebGPU not supported! Please visit webgpu.io to see the current implementation status.');
    }
    displayedNotSupportedError = true;
  }
  return !!navigator.gpu;
}
