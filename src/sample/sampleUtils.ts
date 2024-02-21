import { SampleInit } from '../components/SampleLayout';
import type { GUI } from 'dat.gui';
import fullscreenTexturedQuad from '../shaders/fullscreenTexturedQuad.wgsl';

// A union type representing all posibble GPUBindingLayout types
type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

// A cluster of objects containing a bind group layout and an array of bind groups that accord to that bind group layout.
export type BindGroupCluster = {
  bindGroups: GPUBindGroup[];
  bindGroupLayout: GPUBindGroupLayout;
};

// A union type representing all possible binding members assignable to a GPUBindGroupLayoutEntry
type BindingMemberType =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

// Arguments for createBindGroupCluster function
interface BindGroupClusterFunctionArgs {
  device: GPUDevice;
  label: string;
  bindingLayouts: BindGroupClusterLayoutArgs[];
  resourceLayouts: GPUBindingResource[][];
}

export interface BindGroupClusterLayoutArgs {
  visibility: number;
  bindingMember: BindingMemberType;
  bindingLayout: BindGroupBindingLayout;
}

export const createBindGroupCluster = (
  args: BindGroupClusterFunctionArgs
): BindGroupCluster => {
  const { device, label, bindingLayouts, resourceLayouts } = args;
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < bindingLayouts.length; i++) {
    layoutEntries.push({
      binding: i,
      visibility: bindingLayouts[i].visibility,
      [bindingLayouts[i].bindingMember]: bindingLayouts[i].bindingLayout,
    });
  }

  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}.bindGroupLayout`,
    entries: layoutEntries,
  });

  console.log(layoutEntries);

  const bindGroups: GPUBindGroup[] = [];
  for (let i = 0; i < resourceLayouts.length; i++) {
    const groupEntries: GPUBindGroupEntry[] = [];
    for (let j = 0; j < resourceLayouts[0].length; j++) {
      groupEntries.push({
        binding: j,
        resource: resourceLayouts[i][j],
      });
    }
    console.log(groupEntries);
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
    const devicePixelRatio = window.devicePixelRatio;
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

// A class that provides a set of utilities for creating a basic fullscreen shader that renders
// a programatically generated 2D image to the screen
export abstract class BaseFullscreenShaderClass {
  abstract switchBindGroup(name: string): void;
  abstract startRun(
    commandEncoder: GPUCommandEncoder,
    ...args: unknown[]
  ): void;

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

  createFullscreenShaderPipeline(
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
          code: fullscreenTexturedQuad,
        }),
        entryPoint: 'vert_main',
      },
      fragment: {
        module: device.createShaderModule({
          code: code,
        }),
        entryPoint: 'frag_main',
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

export const createTextureFromImage = (
  device: GPUDevice,
  bitmap: ImageBitmap,
  format: GPUTextureFormat
) => {
  const texture: GPUTexture = device.createTexture({
    size: [bitmap.width, bitmap.height, 1],
    format,
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
