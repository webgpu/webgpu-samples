type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

export type BindGroupsObjectsAndLayout = {
  bindGroups: GPUBindGroup[];
  bindGroupLayout: GPUBindGroupLayout;
};

type ResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

/**
 * @param {number[]} bindings - The binding value of each resource in the bind group.
 * @param {number[]} visibilities - The GPUShaderStage visibility of the resource at the corresponding index.
 * @param {ResourceTypeName[]} resourceTypes - The resourceType at the corresponding index.
 * @returns {BindGroupsObjectsAndLayout} An object containing an array of bindGroups and the bindGroupLayout they implement.
 */
export const createBindGroupDescriptor = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[][],
  label: string,
  device: GPUDevice
): BindGroupsObjectsAndLayout => {
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < bindings.length; i++) {
    const layoutEntry: any = {};
    layoutEntry.binding = bindings[i];
    layoutEntry.visibility = visibilities[i % visibilities.length];
    layoutEntry[resourceTypes[i]] = resourceLayouts[i];
    layoutEntries.push(layoutEntry);
  }

  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}.bindGroupLayout`,
    entries: layoutEntries,
  });

  const bindGroups: GPUBindGroup[] = [];
  for (let i = 0; i < resources.length; i++) {
    const groupEntries: GPUBindGroupEntry[] = [];
    for (let j = 0; j < resources[0].length; j++) {
      const groupEntry: any = {};
      groupEntry.binding = j;
      groupEntry.resource = resources[i][j];
      groupEntries.push(groupEntry);
    }
    const newBindGroup = device.createBindGroup({
      label: `${label}.bindGroup${i}`,
      layout: bindGroupLayout,
      entries: groupEntries,
    });
    bindGroups.push(newBindGroup);
  }

  return {
    bindGroups,
    bindGroupLayout,
  };
};

export type ShaderKeyInterface<T extends string[]> = {
  [K in T[number]]: number;
};

interface AttribAcc {
  attributes: GPUVertexAttribute[];
  arrayStride: number;
}

/**
 * @param {GPUVertexFormat} vf - A valid GPUVertexFormat, representing a per-vertex value that can be passed to the vertex shader.
 * @returns {number} The number of bytes present in the value to be passed.
 */
export const convertVertexFormatToBytes = (vf: GPUVertexFormat): number => {
  const splitFormat = vf.split('x');
  const bytesPerElement = parseInt(splitFormat[0].replace(/[^0-9]/g, '')) / 8;

  const bytesPerVec =
    bytesPerElement *
    (splitFormat[1] !== undefined ? parseInt(splitFormat[1]) : 1);

  return bytesPerVec;
};

/** Creates a GPUVertexBuffer Layout that maps to an interleaved vertex buffer.
 * @param {GPUVertexFormat[]} vertexFormats - An array of valid GPUVertexFormats.
 * @returns {GPUVertexBufferLayout} A GPUVertexBufferLayout representing an interleaved vertex buffer.
 */
export const createVBuffer = (
  vertexFormats: GPUVertexFormat[]
): GPUVertexBufferLayout => {
  const initialValue: AttribAcc = { attributes: [], arrayStride: 0 };

  const vertexBuffer = vertexFormats.reduce(
    (acc: AttribAcc, curr: GPUVertexFormat, idx: number) => {
      const newAttribute: GPUVertexAttribute = {
        shaderLocation: idx,
        offset: acc.arrayStride,
        format: curr,
      };
      const nextOffset: number =
        acc.arrayStride + convertVertexFormatToBytes(curr);

      const retVal: AttribAcc = {
        attributes: [...acc.attributes, newAttribute],
        arrayStride: nextOffset,
      };
      return retVal;
    },
    initialValue
  );

  const layout: GPUVertexBufferLayout = {
    arrayStride: vertexBuffer.arrayStride,
    attributes: vertexBuffer.attributes,
  };

  return layout;
};

export const create3DRenderPipeline = (
  device: GPUDevice,
  label: string,
  bgLayouts: GPUBindGroupLayout[],
  vertexShader: string,
  vBufferFormats: GPUVertexFormat[],
  fragmentShader: string,
  presentationFormat: GPUTextureFormat,
  depthTest = false,
  topology: GPUPrimitiveTopology = 'triangle-list',
  cullMode: GPUCullMode = 'back'
) => {
  const pipelineDescriptor: GPURenderPipelineDescriptor = {
    label: `${label}.pipeline`,
    layout: device.createPipelineLayout({
      label: `${label}.pipelineLayout`,
      bindGroupLayouts: bgLayouts,
    }),
    vertex: {
      module: device.createShaderModule({
        label: `${label}.vertexShader`,
        code: vertexShader,
      }),
      entryPoint: 'vertexMain',
      buffers:
        vBufferFormats.length !== 0 ? [createVBuffer(vBufferFormats)] : [],
    },
    fragment: {
      module: device.createShaderModule({
        label: `${label}.fragmentShader`,
        code: fragmentShader,
      }),
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: topology,
      cullMode: cullMode,
    },
  };
  if (depthTest) {
    pipelineDescriptor.depthStencil = {
      depthCompare: 'less',
      depthWriteEnabled: true,
      format: 'depth24plus',
    };
  }
  return device.createRenderPipeline(pipelineDescriptor);
};

export const createTextureFromImage = (
  device: GPUDevice,
  bitmap: ImageBitmap
) => {
  const texture: GPUTexture = device.createTexture({
    size: [bitmap.width, bitmap.height, 1],
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: texture },
    [bitmap.width, bitmap.height]
  );
  return texture;
};

export interface PBRDescriptor {
  diffuse?: GPUTexture;
  normal?: GPUTexture;
  height?: GPUTexture;
}

interface URLLoad {
  url: string;
  type: keyof PBRDescriptor;
}

export const createPBRDescriptor = async (
  device: GPUDevice,
  urls: string[]
): Promise<PBRDescriptor> => {
  const imgAssetPrepend = '/img/';
  const loads = urls.map((url) => {
    const splits = url.split('_');
    const ttype = splits[splits.length - 1].split('.')[0];
    const load: URLLoad = {
      url: imgAssetPrepend + url,
      type: ttype as keyof PBRDescriptor,
    };
    return load;
  });
  console.log(loads);
  const pbr: PBRDescriptor = {};
  for (let i = 0; i < loads.length; i++) {
    console.log(loads[i].url);
    console.log(import.meta.url);
    let texture: GPUTexture;
    {
      const response = await fetch(loads[i].url);
      const imageBitmap = await createImageBitmap(await response.blob());
      texture = createTextureFromImage(device, imageBitmap);
    }

    console.log(loads[i].type);

    switch (loads[i].type) {
      case 'diffuse':
        {
          pbr.diffuse = texture;
        }
        break;
      case 'height':
        {
          pbr.height = texture;
        }
        break;
      case 'normal':
        {
          pbr.normal = texture;
        }
        break;
    }
  }
  return pbr;
};