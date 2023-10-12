import { SampleInit } from '../../components/SampleLayout';
import type { GUI } from 'dat.gui';
import fullscreenWebGLVertShader from './fullscreenWebGL.vert.wgsl';

type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

export type BindGroupDescriptor = {
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
 * @returns {BindGroupDescriptor} An object containing an array of bindGroups and the bindGroupLayout they implement.
 */
export const createBindGroupDescriptor = (
  bindings: number[],
  visibilities: number[],
  resourceTypes: ResourceTypeName[],
  resourceLayouts: BindGroupBindingLayout[],
  resources: GPUBindingResource[][],
  label: string,
  device: GPUDevice
): BindGroupDescriptor => {
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
  //i=0, j=0 bindGroup 0, binding: 0
  //i=1, j=1, bindGroup0 binding 1
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

export const createWGSLUniform = (structName: string, keys: string[]) => {
  let retString = `struct ${structName} {\n`;
  for (let i = 0; i < keys.length; i++) {
    retString += `  ${keys[i]}: f32,\n`;
  }
  retString += `}\n`;
  return retString;
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

export type FullScreenVertexShaderType =
  | 'WEBGPU'
  | 'WEBGL'
  | 'NDC'
  | 'NDCFlipped';

export const create2DVertexModule = (
  device: GPUDevice,
): GPUVertexState => {
  const vertexState = {
    module: device.createShaderModule({
      code: vertexCode,
    }),
    entryPoint: 'vertexMain',
  };
  return vertexState;
};

export abstract class Base2DRendererClass {
  abstract switchBindGroup(name: string): void;
  abstract startRun(commandEncoder: GPUCommandEncoder, ...args: any[]): void;
  renderPassDescriptor: GPURenderPassDescriptor;
  pipeline: GPURenderPipeline;
  bindGroupMap: Record<string, GPUBindGroup>;
  currentBindGroup: GPUBindGroup;
  currentBindGroupName: string;

  executeRun(
    commandEncoder: GPUCommandEncoder,
    renderPassDescriptor: GPURenderPassDescriptor,
    pipeline: GPURenderPipeline,
    bindGroups: GPUBindGroup[]
  ) {
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    for (let i = 0; i < bindGroups.length; i++) {
      passEncoder.setBindGroup(i, bindGroups[i]);
    }
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.end();
  }

  setUniformArguments<T, K extends readonly string[]>(
    device: GPUDevice,
    uniformBuffer: GPUBuffer,
    instance: T,
    keys: K
  ) {
    for (let i = 0; i < keys.length; i++) {
      device.queue.writeBuffer(
        uniformBuffer,
        i * 4,
        new Float32Array([instance[keys[i]]])
      );
    }
  }

  create2DRenderPipeline(
    device: GPUDevice,
    label: string,
    bgLayouts: GPUBindGroupLayout[],
    code: string,
    presentationFormat: GPUTextureFormat
  ) {
    return device.createRenderPipeline({
      label: `${label}.pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: bgLayouts,
      }),
      vertex: {
        module: device.createShaderModule({
          code: fullscreenWebGLVertShader,
        }),
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: device.createShaderModule({
          code: code,
        }),
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    });
  }
}
