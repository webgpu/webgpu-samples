import {
  BindGroupCluster,
  createBindGroupCluster,
  BaseFullscreenShaderClass,
} from '../sampleUtils';

import bitonicDisplay from './bitonicDisplay.frag.wgsl';

interface BitonicDisplayRenderArgs {
  highlight: number;
}

export default class BitonicDisplayRenderer extends BaseFullscreenShaderClass {
  switchBindGroup: (name: string) => void;
  setArguments: (args: BitonicDisplayRenderArgs) => void;
  computeBGDescript: BindGroupCluster;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    computeBGDescript: BindGroupCluster,
    label: string
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    this.computeBGDescript = computeBGDescript;

    const uniformBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgCluster = createBindGroupCluster({
      device,
      label,
      bindingLayouts: [
        {
          visibility: GPUShaderStage.FRAGMENT,
          bindingMember: 'buffer',
          bindingLayout: { type: 'uniform' },
        },
      ],
      resourceLayouts: [[{ buffer: uniformBuffer }]],
    });

    this.currentBindGroup = bgCluster.bindGroups[0];

    this.pipeline = super.createFullscreenShaderPipeline(
      device,
      label,
      [this.computeBGDescript.bindGroupLayout, bgCluster.bindGroupLayout],
      bitonicDisplay,
      presentationFormat
    );

    this.setArguments = (args: BitonicDisplayRenderArgs) => {
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        new Uint32Array([args.highlight])
      );
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: BitonicDisplayRenderArgs) {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.computeBGDescript.bindGroups[0],
      this.currentBindGroup,
    ]);
  }
}
