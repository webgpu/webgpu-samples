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

/**
 * @property {GPUBindGroup[]} bindGroups - An array of `GPUBindGroup` objects created according to the `resourceLayouts`.
 * @property {GPUBindGroupLayout} bindGroupLayout - The `GPUBindGroupLayout` created based on `bindingLayouts`.
 */
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

/**
 * @property {GPUDevice} device - The WebGPU device to use for creating bind groups and layouts.
 * @property {string} label - A base label that identifies the bind group resources.
 * @property {BindGroupClusterBindingLayout[]} bindingLayouts - Descriptors for each binding's layout within the bind group layout.
 * @property {GPUBindingResource[][]} resourceLayouts - A 2D array of resources for each bind group, matching the binding layouts.
 *
 */
interface BindGroupClusterFunctionArgs {
  device: GPUDevice;
  label: string;
  bindingLayouts: BindGroupClusterBindingLayout[];
  resourceLayouts: GPUBindingResource[][];
}

/**
 * @property {number} visibility - GPU shader stages where the binding is visible.
 * @property {BindingMemberType} bindingMember - Specifies the type of binding (e.g., 'buffer', 'texture').
 * @property {BindGroupBindingLayout} bindingLayout - The detailed layout for the binding, specifying the type of resource.
 *
 */
export interface BindGroupClusterBindingLayout {
  visibility: number;
  bindingMember: BindingMemberType;
  bindingLayout: BindGroupBindingLayout;
}

/**
 * Creates a cluster of bind groups and a corresponding bind group layout based on specified binding and resource layouts.
 * This function acts as a less verbose and more compact way of flexibily defining diverging bind groups based on a single
 * bind group layout template.
 *
 * @param {BindGroupClusterFunctionArgs} args - The arguments required for bind group cluster creation.
 * @returns {BindGroupCluster} An object containing the created `bindGroupLayout` and an array of `bindGroups`.
 *
 * @example
 * const cluster = createBindGroupCluster({
 *   device: gpuDevice,
 *   label: 'exampleCluster',
 *   bindingLayouts: [
 *     { visibility: GPUShaderStage.FRAGMENT, bindingMember: 'buffer', bindingLayout: { type: 'uniform-buffer' } },
 *     { visibility: GPUShaderStage.FRAGMENT, bindingMember: 'texture', bindingLayout: { type: 'sampled-texture', viewDimension: '2d' } }
 *   ],
 *   resourceLayouts: [
 *     [uniformBuffer, sampledTextureView],
 *     [uniformBuffer2, sampledTextureView2]
 *   ]
 * });
 */
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

  const bindGroups: GPUBindGroup[] = [];
  for (let i = 0; i < resourceLayouts.length; i++) {
    const groupEntries: GPUBindGroupEntry[] = [];
    for (let j = 0; j < resourceLayouts[0].length; j++) {
      groupEntries.push({
        binding: j,
        resource: resourceLayouts[i][j],
      });
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
  timestampQueryAvailable: boolean;
}

type CallbackSync3D = (params: SampleInitParams & DeviceInit3DParams) => void;
type CallbackAsync3D = (
  params: SampleInitParams & DeviceInit3DParams
) => Promise<void>;

type SampleInitCallback3D = CallbackSync3D | CallbackAsync3D;

/**
 * A factory function that performs the initial setup for a WebGPU-Samples Page.
 * @param {SampleInitCallback3D} callback - The callback function to execute once WebGPU initialization is completed.
 * @returns {Promise<SampleInit>} A promise that resolves to an initialization function that can be passed as a parameter to makeSample().
 */
export const SampleInitFactoryWebGPU = async (
  callback: SampleInitCallback3D
): Promise<SampleInit> => {
  const init: SampleInit = async ({ canvas, pageState, gui, stats }) => {
    const adapter = await navigator.gpu.requestAdapter();
    const timestampQueryAvailable = adapter.features.has('timestamp-query');
    let device: GPUDevice;
    if (timestampQueryAvailable) {
      device = await adapter.requestDevice({
        requiredFeatures: ['timestamp-query'],
      });
    } else {
      device = await adapter.requestDevice();
    }
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
      timestampQueryAvailable,
    });
  };
  return init;
};

// A class that provides a set of utilities for creating a basic fullscreen shader that renders
// a programatically generated 2D image to the screen
export abstract class BaseFullscreenShaderClass {
  // The intended implementation of switchBindGroup is to facilitate switching between bind groups that conform
  // to the same bind group layout used within the fullscreen shader
  abstract switchBindGroup(name: string): void;
  // THe intended implementation of startRun is to execute any necessary code that must be executed before the renderPassEncoder
  // is created. This may include writing new values to our uniform buffers, switching bind groups, taking diagnostics, etc.
  abstract startRun(
    commandEncoder: GPUCommandEncoder,
    ...args: unknown[]
  ): void;
  protected renderPassDescriptor: GPURenderPassDescriptor;
  protected pipeline: GPURenderPipeline;
  // A map between a string and its associated bind group. Used to switch between bind groups in a sensible manner.
  // For instance, if you wanted to switch your texture from a cat texture to a dog texture, you could assign
  // the label 'cat' to a bind group containing that texture which accords with the shader's bind group layout.
  protected bindGroupMap: Record<string, GPUBindGroup>;
  // The current bind group in use within the shader.
  protected currentBindGroup: GPUBindGroup;
  // The label associated with currentBindGroup
  protected currentBindGroupName: string;

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

/**
 * Creates a GPUTexture from an ImageBitmap.
 * This function creates a GPUTexture object from a given ImageBitmap. The texture is created
 * with specified format and is usable as a texture binding, destination for copy operations,
 * and as a render attachment.
 * @param {GPUDevice} device - The GPUDevice to create the texture on.
 * @param {ImageBitmap} bitmap - The source image bitmap.
 * @param {GPUTextureFormat} format - The texture's intended texture format.
 * @returns {GPUTexture} The created GPUTexture object.
 */
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
