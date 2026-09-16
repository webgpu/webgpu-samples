import { GUI } from 'dat.gui';
import packedWGSL from './packed.wgsl';
import { quitIfWebGPUNotAvailableOrMissingFeatures } from '../util';

type vec4i = readonly [number, number, number, number];
// Pack four signed 8-bit components into a u32, low byte first.
function pack4xI8([x, y, z, w]: vec4i): number {
  // `&` operator applies sign extension to i32 before operating.
  // `>>> 0` converts the final i32 to u32.
  /*prettier-ignore*/
  return ((x & 0xff) |
          ((y & 0xff) << 8) |
          ((z & 0xff) << 16) |
          ((w & 0xff) << 24)) >>> 0;
}

const outputElement = document.querySelector('#output') as HTMLElement;
if (
  !navigator.gpu?.wgslLanguageFeatures.has('packed_4x8_integer_dot_product')
) {
  result.textContent =
    "This sample requires the WGSL language feature 'packed_4x8_integer_dot_product'.";
} else {
  const adapter = await navigator.gpu.requestAdapter({
    featureLevel: 'compatibility',
  });
  const device = await adapter?.requestDevice();
  quitIfWebGPUNotAvailableOrMissingFeatures(adapter, device);

  const kInputSize = 2 * Uint32Array.BYTES_PER_ELEMENT;
  const inputBuffer = device.createBuffer({
    size: kInputSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
  });

  const kOutputSize = Int32Array.BYTES_PER_ELEMENT;
  const outputBuffer = device.createBuffer({
    size: kOutputSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readbackBuffer = device.createBuffer({
    size: kOutputSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const pipeline = await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module: device.createShaderModule({ code: packedWGSL }) },
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
    ],
  });

  async function updateResult() {
    // If an update is still in progress just wait until it's done.
    if (readbackBuffer.mapState !== 'unmapped') {
      setTimeout(updateResult, 0);
      return;
    }

    const lhs = [settings.lhs0, settings.lhs1, settings.lhs2, settings.lhs3];
    const rhs = [settings.rhs0, settings.rhs1, settings.rhs2, settings.rhs3];

    device.queue.writeBuffer(
      inputBuffer,
      0,
      new Uint32Array([lhs, rhs].map(pack4xI8))
    );
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(1);
    pass.end();
    encoder.copyBufferToBuffer(outputBuffer, 0, readbackBuffer, 0, kOutputSize);
    device.queue.submit([encoder.finish()]);

    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const result = new Int32Array(readbackBuffer.getMappedRange())[0];

    // Result should be the same in JS, show that for comparison.
    const expected =
      lhs[0] * rhs[0] + lhs[1] * rhs[1] + lhs[2] * rhs[2] + lhs[3] * rhs[3];

    const lhsStr = `[${lhs
      .map((x) => x.toString().padStart(4))
      .join(', ')}] (0x${pack4xI8(lhs).toString(16).padStart(8, '0')})`;
    const rhsStr = `[${rhs
      .map((x) => x.toString().padStart(4))
      .join(', ')}] (0x${pack4xI8(rhs).toString(16).padStart(8, '0')})`;
    const outStr = result.toString().padStart(6);
    const expStr = expected.toString().padStart(6);
    outputElement.textContent = `

WGSL dot4I8Packed of ${lhsStr}
                  by ${rhsStr} gave ${outStr} (JS gave ${expStr})`;

    readbackBuffer.unmap();
  }

  const settings = {
    lhs0: 1,
    lhs1: -2,
    lhs2: 3,
    lhs3: -4,
    rhs0: -5,
    rhs1: 6,
    rhs2: -7,
    rhs3: 8,
  };
  const gui = new GUI();
  gui.add(settings, 'lhs0', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'lhs1', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'lhs2', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'lhs3', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'rhs0', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'rhs1', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'rhs2', -127, 128, 1).onChange(updateResult);
  gui.add(settings, 'rhs3', -127, 128, 1).onChange(updateResult);
  updateResult();
}
