import {
  BindGroupDescriptor,
  createBindGroupDescriptor,
  Base2DRendererClass,
  ShaderKeyInterface,
} from './utils';
import { BitonicDisplayShader, argKeys } from './renderShader';

type BitonicDisplayRenderArgs = ShaderKeyInterface<typeof argKeys>;

export default class BitonicDisplayRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
  setArguments: (args: BitonicDisplayRenderArgs) => void;
  computeBGDescript: BindGroupDescriptor;

  constructor(
    device: GPUDevice,
    presentationFormat: GPUTextureFormat,
    renderPassDescriptor: GPURenderPassDescriptor,
    bindGroupNames: string[],
    computeBGDescript: BindGroupDescriptor,
    label: string
  ) {
    super();
    this.renderPassDescriptor = renderPassDescriptor;
    this.computeBGDescript = computeBGDescript;

    const uniformBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * argKeys.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgDescript = createBindGroupDescriptor(
      [0],
      [GPUShaderStage.FRAGMENT],
      ['buffer'],
      [{ type: 'uniform' }],
      [[{ buffer: uniformBuffer }]],
      label,
      device
    );

    this.currentBindGroup = bgDescript.bindGroups[0];
    this.currentBindGroupName = bindGroupNames[0];

    this.bindGroupMap = {};

    bgDescript.bindGroups.forEach((bg, idx) => {
      this.bindGroupMap[bindGroupNames[idx]] = bg;
    });

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [bgDescript.bindGroupLayout, this.computeBGDescript.bindGroupLayout],
      BitonicDisplayShader(),
      presentationFormat
    );

    this.switchBindGroup = (name: string) => {
      this.currentBindGroup = this.bindGroupMap[name];
      this.currentBindGroupName = name;
    };

    this.setArguments = (args: BitonicDisplayRenderArgs) => {
      super.setUniformArguments(device, uniformBuffer, args, argKeys);
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
