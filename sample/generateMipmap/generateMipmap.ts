import generateMipmapWGSL from './generateMipmap.wgsl';

export function numMipLevels(...sizes: number[]) {
  const maxSize = Math.max(...sizes);
  return (1 + Math.log2(maxSize)) | 0;
}

/**
 * Get the default viewDimension
 * Note: It's only a guess. The user needs to tell us to be
 * correct in all cases because we can't distinguish between
 * a 2d texture and a 2d-array texture with 1 layer, nor can
 * we distinguish between a 2d-array texture with 6 layers and
 * a cubemap.
 */
export function getDefaultViewDimensionForTexture(
  dimension: GPUTextureDimension,
  depthOrArrayLayers: number
) {
  switch (dimension) {
    case '1d':
      return '1d';
    default:
    case '2d':
      return depthOrArrayLayers > 1 ? '2d-array' : '2d';
    case '3d':
      return '3d';
  }
}

type DeviceSpecificInfo = {
  sampler: GPUSampler;
  module: GPUShaderModule;
  pipelineByFormatAndView: Map<string, GPURenderPipeline>;
};

function createDeviceSpecificInfo(device: GPUDevice): DeviceSpecificInfo {
  const module = device.createShaderModule({
    label: 'textured quad shaders for mip level generation',
    code: generateMipmapWGSL,
  });

  const sampler = device.createSampler({
    minFilter: 'linear',
    magFilter: 'linear',
  });

  return {
    module,
    sampler,
    pipelineByFormatAndView: new Map(),
  };
}

const s_deviceToDeviceSpecificInfo = new WeakMap<
  GPUDevice,
  DeviceSpecificInfo
>();

/**
 * Generates mip levels 1 to texture.mipLevelCount - 1 using
 * mip level 0 as the source.
 * @param device The device
 * @param texture The texture to generate mips for
 * @param textureBindingViewDimension The view dimension, needed for
 *   compatibility mode if the texture is a cube map OR if the texture
 *   is a 1 layer 2d-array.
 */
export function generateMips(
  device: GPUDevice,
  texture: GPUTexture,
  textureBindingViewDimension?: GPUTextureViewDimension
) {
  textureBindingViewDimension =
    textureBindingViewDimension ??
    getDefaultViewDimensionForTexture(
      texture.dimension,
      texture.depthOrArrayLayers
    );
  const deviceSpecificInfo =
    s_deviceToDeviceSpecificInfo.get(device) ??
    createDeviceSpecificInfo(device);
  s_deviceToDeviceSpecificInfo.set(device, deviceSpecificInfo);
  const { sampler, module, pipelineByFormatAndView } = deviceSpecificInfo;

  const id = `${texture.format}.${textureBindingViewDimension}`;

  if (!pipelineByFormatAndView.get(id)) {
    // Choose an fragment shader based on the viewDimension (removes the '-' from 2d-array and cube-array)
    const entryPoint = `fs${textureBindingViewDimension.replace('-', '')}`;
    pipelineByFormatAndView.set(
      id,
      device.createRenderPipeline({
        label: `mip level generator pipeline for ${textureBindingViewDimension}, format: ${texture.format}`,
        layout: 'auto',
        vertex: {
          module,
        },
        fragment: {
          module,
          entryPoint,
          targets: [{ format: texture.format }],
        },
      })
    );
  }

  const pipeline = pipelineByFormatAndView.get(id);
  const encoder = device.createCommandEncoder({
    label: 'mip gen encoder',
  });

  // For each mip level > 0, sample the previous mip level
  // while rendering into this one.
  for (
    let baseMipLevel = 1;
    baseMipLevel < texture.mipLevelCount;
    ++baseMipLevel
  ) {
    for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          {
            binding: 1,
            resource: texture.createView({
              dimension: textureBindingViewDimension,
              baseMipLevel: baseMipLevel - 1,
              mipLevelCount: 1,
            }),
          },
        ],
      });

      const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
          {
            view: texture.createView({
              dimension: '2d',
              baseMipLevel,
              mipLevelCount: 1,
              baseArrayLayer: layer,
              arrayLayerCount: 1,
            }),
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      };

      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      // draw 3 vertices, 1 instance, first instance (instance_index) = layer
      pass.draw(3, 1, 0, layer);
      pass.end();
    }
  }

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
}
