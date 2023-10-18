import { SampleInit } from '../../components/SampleLayout';
import type { GUI } from 'dat.gui';

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
  //i represent the bindGroup index, j represents the binding index of the resource within the bindgroup
  //i=0, j=0  bindGroup: 0, binding: 0
  //i=1, j=1, bindGroup: 0, binding: 1
  //NOTE: not the same as @group(0) @binding(1) group index within the fragment shader is set within a pipeline
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

export type SampleInitParams = {
  canvas: HTMLCanvasElement;
  pageState: { active: boolean };
  gui?: GUI;
  stats?: Stats;
};

interface DeviceInitParms {
  device: GPUDevice;
}

interface DeviceInit3DParams extends DeviceInitParms {
  context: GPUCanvasContext;
  presentationFormat: GPUTextureFormat;
}

type CallbackSync3D = (params: SampleInitParams & DeviceInit3DParams) => void;
type CallbackAsync3D = (
  params: SampleInitParams & DeviceInit3DParams
) => Promise<void>;

type SampleInitCallback3D = CallbackSync3D | CallbackAsync3D;

export const SampleInitFactoryWebGPU = async (
  callback: SampleInitCallback3D
): Promise<SampleInit> => {
  const init: SampleInit = async ({ canvas, pageState, gui, stats }) => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    if (!pageState.active) return;
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: 'premultiplied',
    });

    callback({
      canvas,
      pageState,
      gui,
      device,
      context,
      presentationFormat,
      stats,
    });
  };
  return init;
};

interface AttribAcc {
  attributes: GPUVertexAttribute[];
  arrayStride: number;
}

export const convertVertexFormatToBytes = (vf: GPUVertexFormat): number => {
  const splitFormat = vf.split('x');
  const bytesPerElement = parseInt(splitFormat[0].replace(/[^0-9]/g, '')) / 8;

  const bytesPerVec =
    bytesPerElement *
    (splitFormat[1] !== undefined ? parseInt(splitFormat[1]) : 1);

  return bytesPerVec;
};

export const createVBuffers = (
  vertexFormats: GPUVertexFormat[]
): GPUVertexBufferLayout[] => {
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
  return [
    {
      arrayStride: vertexBuffer.arrayStride,
      attributes: vertexBuffer.attributes,
    },
  ];
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
        vBufferFormats.length !== 0 ? createVBuffers(vBufferFormats) : [],
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

/**
 * @param {GPUDevice} device - The GPU performing each buffer write.
 * @param {GPUBuffer} buffer-  The buffer we are filling with data.
 * @param {Float32Array[]} mat4Arr - An array of multiple 4x4 matrices.
 * @returns {string} An offset designating the end of the region that was written to within the buffer.
 */
export const writeMat4ToBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer,
  mat4Arr: Float32Array[],
  offset = 0
): number => {
  for (let i = 0; i < mat4Arr.length; i++) {
    device.queue.writeBuffer(
      buffer,
      offset + 64 * i,
      mat4Arr[i].buffer,
      mat4Arr[i].byteOffset,
      mat4Arr[i].byteLength
    );
  }
  return 64 * mat4Arr.length;
};

/**
 * @param {GPUDevice} device - The GPU performing each buffer write.
 * @param {GPUBuffer} buffer-  The buffer we are filling with data.
 * @param {Float32Array[]} mat4Arr - An array of f32 values.
 * @returns {string} An offset designating the end of the region that was written to within the buffer.
 */
export const write32ToBuffer = (
  device: GPUDevice,
  buffer: GPUBuffer,
  arr: (Float32Array | Uint32Array)[],
  offset = 0
) => {
  for (let i = 0; i < arr.length; i++) {
    device.queue.writeBuffer(
      buffer,
      offset + 4 * i,
      arr[i].buffer,
      arr[i].byteOffset,
      arr[i].byteLength
    );
  }
  return 4 * arr.length;
};
