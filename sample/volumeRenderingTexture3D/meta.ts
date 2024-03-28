export default {
  name: 'Volume Rendering - Texture 3D',
  description: `This example shows how to render volumes with WebGPU using a 3D
texture. It demonstrates simple direct volume rendering for photometric content
through ray marching in a fragment shader, where a full-screen triangle
determines the color from ray start and step size values as set in the vertex
shader. This implementation employs data from the BrainWeb Simulated Brain
Database, with decompression streams, to save disk space and network traffic.

The original raw data is generated using
[the BrainWeb Simulated Brain Database](https://brainweb.bic.mni.mcgill.ca/brainweb/)
before processing in
[a custom Python script](https://github.com/webgpu/webgpu-samples/tree/main/public/assets/img/volume/t1_icbm_normal_1mm_pn0_rf0.py).`,
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: 'volume.wgsl' }],
};
