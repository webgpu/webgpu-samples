type OutputSize = 1 | 2 | 3 | 4;

export const createWGSLUniform = (
  structName: string,
  keys: string[],
  dataType = 'f32'
) => {
  let retString = `struct ${structName} {\n`;
  for (let i = 0; i < keys.length; i++) {
    retString += `  ${keys[i]}: ${dataType},\n`;
  }
  retString += `}\n`;
  return retString;
};

export type ShaderKeyInterface<T extends string[]> = {
  [K in T[number]]: number;
};

export const createDebugStepReturnStatement = (
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  switch (dataSize) {
    case 1:
      {
        return `return vec4<f32>(${value}, 0.0, 0.0, 1.0);`;
      }
      break;
    case 2:
      {
        return `return vec4<f32>(${value}, 0.0, 1.0);`;
      }
      break;
    case 3:
      {
        return `return vec4<f32>(${value}, 1.0);`;
      }
      break;
    case 4:
      {
        return `return ${value};`;
      }
      break;
  }
};

interface StepRange {
  start: number;
  end: number;
}

interface Step {
  exps: string[];
  size: 1 | 2 | 3 | 4;
  val: string;
}

export const createDebugStepAreaCollection = (steps: Step[]): string => {
  let retString = ``;
  let stepsCompleted = 0;
  for (const step of steps) {
    const { exps, size, val } = step;
    retString += createDebugStepArea(
      { start: stepsCompleted, end: stepsCompleted + exps.length - 1 },
      size,
      val
    );
    stepsCompleted = stepsCompleted + exps.length;
  }
  return retString;
};

export const createDebugStepArea = (
  stepRange: StepRange,
  dataSize: 1 | 2 | 3 | 4,
  value: string
) => {
  return `
  if (uniforms.debugStep ${
    stepRange.start === stepRange.end
      ? `== ${stepRange.start}`
      : `>= ${stepRange.start} && uniforms.debugStep<= ${stepRange.end}`
  }) {\n\t${createDebugStepReturnStatement(dataSize, value)}\n}\n
  `;
};

export const createFragmentShaderResources = (argKeys: string[]) => {
  return `
${createWGSLUniform('Uniforms', argKeys)}
struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) v_uv: vec2<f32>
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;`;
};

export interface VertexShaderInput {
  names: string[];
  formats: GPUVertexFormat[];
  builtins?: number;
}

export const convertVertexFormatToWGSLFormat = (format: GPUVertexFormat) => {
  const splitText = format.split('x');
  //32, 16
  const bitsPerElement = parseInt(splitText[0].replace(/[^0-9]/g, ''));
  //uint, float, etc
  const dataType = splitText[0].replace(/[0-9]/g, '');
  const vecSize = splitText.length > 1 ? parseInt(splitText[1]) : 1;

  let wgslDataType = '';

  switch (dataType) {
    case 'float':
      {
        wgslDataType += 'f';
      }
      break;
    case 'uint':
      {
        wgslDataType += 'u';
      }
      break;
    case 'sint':
      {
        wgslDataType += 'i';
      }
      break;
    default:
      {
        wgslDataType += 'f';
      }
      break;
  }

  dataType === 'float'
    ? (wgslDataType += bitsPerElement)
    : (wgslDataType += `32`);

  if (vecSize > 1) {
    wgslDataType = `vec${vecSize}<${wgslDataType}>`;
  }
  return wgslDataType;
};

export const createVertexInput = (input: VertexShaderInput) => {
  const loopLength =
    input.names.length > input.formats.length
      ? input.formats.length
      : input.names.length;

  let retString = `struct VertexInput {\n`;

  if (input.builtins & VertexBuiltIn.VERTEX_INDEX) {
    retString += `  @builtin(vertex_index) VertexIndex: u32,\n`;
  }
  if (input.builtins & VertexBuiltIn.INSTANCE_INDEX) {
    retString += `  @builtin(instance_index) InstanceIndex: u32,\n`;
  }

  for (let i = 0; i < loopLength; i++) {
    const dataType = convertVertexFormatToWGSLFormat(input.formats[i]);
    retString += `  @location(${i}) ${input.names[i]}: ${dataType},\n`;
  }
  retString += `}\n\n`;
  return retString;
};

export enum VertexBuiltIn {
  POSITION = 1,
  VERTEX_INDEX = 2,
  INSTANCE_INDEX = 4,
}

export interface UniformDefiner {
  structName: string;
  argKeys: string[];
  dataType: 'mat4x4f' | 'f32';
}

interface VertexOutputDefiner {
  builtins: number;
  outputs: { name: string; format: string }[];
}

const createVertexOutput = (definer: VertexOutputDefiner) => {
  let builtins = ``;
  if (definer.builtins & VertexBuiltIn.POSITION) {
    builtins += '  @builtin(position) Position: vec4f,\n';
  }
  let outputs = ``;
  definer.outputs.forEach((output, idx) => {
    outputs += `  @location(${idx}) ${output.name}: ${output.format},\n`;
  });

  return `struct VertexOutput {\n${builtins}${outputs}}\n\n`;
};

interface VertexShaderCreationArgs {
  uniforms: UniformDefiner[];
  vertexInputs: VertexShaderInput;
  vertexOutput: VertexOutputDefiner;
  code: string;
}

//TODO: Return the normal version of the shader as well as the debug version of the shader
//For 2d Shaders
export const createRenderShader = (args: VertexShaderCreationArgs): string => {
  let retString = ``;
  retString += createVertexInput(args.vertexInputs);
  args.uniforms.forEach((uniform) => {
    retString += createWGSLUniform(
      uniform.structName,
      uniform.argKeys,
      uniform.dataType
    );
    retString += `\n`;
  });
  retString += createVertexOutput(args.vertexOutput);
  retString += args.code;
  console.log(retString);
  return retString;
};

type BindGroupBindingLayout =
  | GPUBufferBindingLayout
  | GPUTextureBindingLayout
  | GPUSamplerBindingLayout
  | GPUStorageTextureBindingLayout
  | GPUExternalTextureBindingLayout;

// An object containing
// 1. A generated Bind Group Layout
// 2. An array of Bind Groups that accord to that layout
export type BindGroupCluster = {
  bindGroups: GPUBindGroup[];
  bindGroupLayout: GPUBindGroupLayout;
};

type ResourceTypeName =
  | 'buffer'
  | 'texture'
  | 'sampler'
  | 'externalTexture'
  | 'storageTexture';

interface CreateBindGroupClusterArgs {
  device: GPUDevice;
  label: string;
  bindings: number[];
  visibilities: number[];
  resourceTypes: ResourceTypeName[];
  resourceLayouts: BindGroupBindingLayout[];
  resources: GPUBindingResource[][];
}

export const createBindGroupCluster = (
  args: CreateBindGroupClusterArgs
): BindGroupCluster => {
  const {
    device,
    label,
    bindings,
    visibilities,
    resourceTypes,
    resourceLayouts,
    resources,
  } = args;
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < bindings.length; i++) {
    layoutEntries.push({
      binding: bindings[i],
      visibility: visibilities[i % visibilities.length],
      [resourceTypes[i]]: resourceLayouts[i],
    });
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
      groupEntries.push({
        binding: j,
        resource: resources[i][j],
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