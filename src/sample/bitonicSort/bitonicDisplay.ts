import {
  BindGroupCluster,
  createBindGroupCluster,
  Base2DRendererClass,
} from './utils';

import bitonicDisplay from './bitonicDisplay.frag.wgsl';

interface BitonicDisplayRenderArgs {
  width: number;
  height: number;
}

export default class BitonicDisplayRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: BitonicDisplayRenderArgs) => void;
  computeBGDescript: BindGroupCluster;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    computeBGDescript: BindGroupCluster,
    label: string
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    this.computeBGDescript = computeBGDescript;

    const uniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 2,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgCluster = createBindGroupCluster(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
      label,
      device
    );

    this.currentBindGroup = bgCluster.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};

    bgCluster.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [bgCluster.bindGroupLayout, this.computeBGDescript.bindGroupLayout],
      bitonicDisplay,
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: BitonicDisplayRenderArgs) => {
      super.setUniformArguments(device, uniformBuffer, args, [
        'width',
        'height',
      ]);
    };
  }

  startRun(commandEncoder: GPUCommandEncoder, args: BitonicDisplayRenderArgs) {
    this.setArguments(args);
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.currentBindGroup,
      this.computeBGDescript.bindGroups[0],
    ]);
  }
}
