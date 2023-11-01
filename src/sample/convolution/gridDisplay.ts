import { BindGroupCluster, Base2DRendererClass } from './utils';
import gridDisplay from './gridDisplay.frag.wgsl';

export default class GridDisplayRenderer extends Base2DRendererClass {
  static sourceInfo = {
    name: __filename.substring(__dirname.length + 1),
    contents: __SOURCE__,
  };

  switchBindGroup: (name: string) => void;
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

    this.pipeline = super.create2DRenderPipeline(
      device,
      label,
      [this.computeBGDescript.bindGroupLayout],
      gridDisplay,
      presentationFormat
    );
  }

  startRun(commandEncoder: GPUCommandEncoder) {
    super.executeRun(commandEncoder, this.renderPassDescriptor, this.pipeline, [
      this.computeBGDescript.bindGroups[0],
    ]);
  }
}
