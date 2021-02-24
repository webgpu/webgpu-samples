import { mat4, vec3 } from 'gl-matrix';
import { makeBasicExample } from '../../components/basicExample';
import glslangModule from '../../glslang';

import dragonRawData from 'stanford-dragon/4';
const mesh = {
  positions: dragonRawData.positions as [number, number, number][],
  triangles: dragonRawData.cells as [number, number, number][],
  normals: [] as [number, number, number][],
};

const shadowDepthTextureSize = 1024;

async function init(canvas: HTMLCanvasElement, useWGSL: boolean) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const aspect = Math.abs(canvas.width / canvas.height);

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: 'bgra8unorm',
  });

  // Push indices for an additional ground plane
  mesh.triangles.push(
    [
      mesh.positions.length,
      mesh.positions.length + 2,
      mesh.positions.length + 1,
    ],
    [
      mesh.positions.length,
      mesh.positions.length + 1,
      mesh.positions.length + 3,
    ]
  );

  // Push positions for an additional ground plane
  // prettier-ignore
  mesh.positions.push(
    [-100, 20, -100], //
    [ 100, 20,  100], //
    [-100, 20,  100], //
    [ 100, 20, -100]
  );

  // Compute surface normals
  mesh.normals = mesh.positions.map(() => {
    // Initialize to zero.
    return [0, 0, 0];
  });
  mesh.triangles.forEach(([i0, i1, i2]) => {
    const p0 = mesh.positions[i0];
    const p1 = mesh.positions[i1];
    const p2 = mesh.positions[i2];

    const v0 = vec3.subtract(vec3.create(), p1, p0);
    const v1 = vec3.subtract(vec3.create(), p2, p0);

    vec3.normalize(v0, v0);
    vec3.normalize(v1, v1);
    const norm = vec3.cross(vec3.create(), v0, v1);

    // Accumulate the normals.
    vec3.add(mesh.normals[i0], mesh.normals[i0], norm);
    vec3.add(mesh.normals[i1], mesh.normals[i1], norm);
    vec3.add(mesh.normals[i2], mesh.normals[i2], norm);
  });
  mesh.normals.forEach((n) => {
    // Normalize accumulated normals.
    vec3.normalize(n, n);
  });

  // Create the model vertex buffer.
  const vertexBuffer = device.createBuffer({
    size: mesh.positions.length * 3 * 2 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], 6 * i);
      mapping.set(mesh.normals[i], 6 * i + 3);
    }
    vertexBuffer.unmap();
  }

  // Create the model index buffer.
  const indexCount = mesh.triangles.length * 3;
  const indexBuffer = device.createBuffer({
    size: indexCount * Uint16Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Uint16Array(indexBuffer.getMappedRange());
    for (let i = 0; i < mesh.triangles.length; ++i) {
      mapping.set(mesh.triangles[i], 3 * i);
    }
    indexBuffer.unmap();
  }

  // Create the depth texture for rendering/sampling the shadow map.
  const shadowDepthTexture = device.createTexture({
    size: [shadowDepthTextureSize, shadowDepthTextureSize, 1],
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
    format: 'depth32float',
  });
  const shadowDepthTextureView = shadowDepthTexture.createView();

  // Create some common descriptors used for both the shadow pipeline
  // and the color rendering pipeline.
  const vertexState: GPUVertexStateDescriptor = {
    vertexBuffers: [
      {
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 6,
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0,
            format: 'float3',
          },
          {
            // normal
            shaderLocation: 1,
            offset: Float32Array.BYTES_PER_ELEMENT * 3,
            format: 'float3',
          },
        ],
      },
    ],
  };

  const primitiveTopology = 'triangle-list' as const;
  const rasterizationState: GPURasterizationStateDescriptor = {
    cullMode: 'back',
  };

  const shadowPipeline = device.createRenderPipeline({
    vertexStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertexShadow,
          })
        : device.createShaderModule({
            code: glslShaders.vertexShadow,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
          }),
      entryPoint: 'main',
    },
    fragmentStage: {
      // This should be omitted and we can use a vertex-only pipeline, but it's
      // not yet implemented.
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragmentShadow,
          })
        : device.createShaderModule({
            code: glslShaders.fragmentShadow,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
          }),
      entryPoint: 'main',
    },
    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth32float',
    },
    primitiveTopology,
    vertexState,
    rasterizationState,
    colorStates: [],
  });

  // Create a bind group layout which holds the scene uniforms and
  // the texture+sampler for depth. We create it manually because the WebPU
  // implementation doesn't infer this from the shader (yet).
  const bglForRender = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        type: 'uniform-buffer',
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        type: 'sampled-texture',

        // Not added in the current types yet, and this API is changing.
        textureComponentType: 'depth-comparison' as GPUTextureComponentType,
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        type: 'comparison-sampler',
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    // Specify the pipeline layout. The layout for the model is the same, so
    // reuse it from the shadow pipeline.
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bglForRender, shadowPipeline.getBindGroupLayout(1)],
    }),
    vertexStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertex,
          })
        : device.createShaderModule({
            code: glslShaders.vertex,
            transform: (glsl) => glslang.compileGLSL(glsl, 'vertex'),
          }),
      entryPoint: 'main',
    },
    fragmentStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragment,
          })
        : device.createShaderModule({
            code: glslShaders.fragment,
            transform: (glsl) => glslang.compileGLSL(glsl, 'fragment'),
          }),
      entryPoint: 'main',
    },
    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus-stencil8',
    },
    primitiveTopology,
    vertexState,
    rasterizationState,
    colorStates: [
      {
        format: 'bgra8unorm',
      },
    ],
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
      depthOrArrayLayers: 1,
    },
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // attachment is acquired and set in render loop.
        attachment: undefined,

        loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      },
    ],
    depthStencilAttachment: {
      attachment: depthTexture.createView(),

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  const modelUniformBuffer = device.createBuffer({
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sceneUniformBuffer = device.createBuffer({
    // Two 4x4 viewProj matrices,
    // one for the camera and one for the light.
    // Then a vec3 for the light position.
    size: 2 * 4 * 16 + 3 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sceneBindGroupForShadow = device.createBindGroup({
    layout: shadowPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sceneUniformBuffer,
        },
      },
    ],
  });

  const sceneBindGroupForRender = device.createBindGroup({
    layout: bglForRender,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sceneUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: shadowDepthTextureView,
      },
      {
        binding: 2,
        resource: device.createSampler({
          compare: 'less',
        }),
      },
    ],
  });

  const modelBindGroup = device.createBindGroup({
    layout: shadowPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: modelUniformBuffer,
        },
      },
    ],
  });

  const eyePosition = vec3.fromValues(0, 50, -100);
  const upVector = vec3.fromValues(0, 1, 0);
  const origin = vec3.fromValues(0, 0, 0);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 2000.0);

  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

  const lightPosition = vec3.fromValues(50, 100, -100);
  const lightViewMatrix = mat4.create();
  mat4.lookAt(lightViewMatrix, lightPosition, origin, upVector);

  const lightProjectionMatrix = mat4.create();
  {
    const left = -80;
    const right = 80;
    const bottom = -80;
    const top = 80;
    const near = -200;
    const far = 300;
    mat4.ortho(lightProjectionMatrix, left, right, bottom, top, near, far);
  }

  const lightViewProjMatrix = mat4.create();
  mat4.multiply(lightViewProjMatrix, lightProjectionMatrix, lightViewMatrix);

  const viewProjMatrix = mat4.create();
  mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);

  // Move the model so it's centered.
  const modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -5, 0));
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -40, 0));

  // The camera/light aren't moving, so write them into buffers now.
  {
    const lightMatrixData = lightViewProjMatrix as Float32Array;
    device.queue.writeBuffer(
      sceneUniformBuffer,
      0,
      lightMatrixData.buffer,
      lightMatrixData.byteOffset,
      lightMatrixData.byteLength
    );

    const cameraMatrixData = viewProjMatrix as Float32Array;
    device.queue.writeBuffer(
      sceneUniformBuffer,
      64,
      cameraMatrixData.buffer,
      cameraMatrixData.byteOffset,
      cameraMatrixData.byteLength
    );

    const lightData = lightPosition as Float32Array;
    device.queue.writeBuffer(
      sceneUniformBuffer,
      128,
      lightData.buffer,
      lightData.byteOffset,
      lightData.byteLength
    );

    const modelData = modelMatrix as Float32Array;
    device.queue.writeBuffer(
      modelUniformBuffer,
      0,
      modelData.buffer,
      modelData.byteOffset,
      modelData.byteLength
    );
  }

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix() {
    const eyePosition = vec3.fromValues(0, 50, -100);

    const rad = Math.PI * (Date.now() / 2000);
    vec3.rotateY(eyePosition, eyePosition, origin, rad);

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);
    return viewProjMatrix as Float32Array;
  }

  const shadowPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      attachment: shadowDepthTextureView,
      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  return function frame() {
    const cameraViewProj = getCameraViewProjMatrix();
    device.queue.writeBuffer(
      sceneUniformBuffer,
      64,
      cameraViewProj.buffer,
      cameraViewProj.byteOffset,
      cameraViewProj.byteLength
    );

    renderPassDescriptor.colorAttachments[0].attachment = swapChain
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const shadowPass = commandEncoder.beginRenderPass(shadowPassDescriptor);
      shadowPass.setPipeline(shadowPipeline);
      shadowPass.setBindGroup(0, sceneBindGroupForShadow);
      shadowPass.setBindGroup(1, modelBindGroup);
      shadowPass.setVertexBuffer(0, vertexBuffer);
      shadowPass.setIndexBuffer(indexBuffer, 'uint16');
      shadowPass.drawIndexed(indexCount);

      shadowPass.endPass();
    }
    {
      const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
      renderPass.setPipeline(pipeline);
      renderPass.setBindGroup(0, sceneBindGroupForRender);
      renderPass.setBindGroup(1, modelBindGroup);
      renderPass.setVertexBuffer(0, vertexBuffer);
      renderPass.setIndexBuffer(indexBuffer, 'uint16');
      renderPass.drawIndexed(indexCount);

      renderPass.endPass();
    }
    device.queue.submit([commandEncoder.finish()]);
  };
}

const glslShaders = {
  vertexShadow: `#version 450
layout(set = 0, binding = 0) uniform Scene {
  mat4 lightViewProjMatrix;
  mat4 cameraViewProjMatrix;
  vec3 lightPos;
} scene;

layout(set = 1, binding = 0) uniform Model {
  mat4 modelMatrix;
} model;

layout(location = 0) in vec3 position;

void main() {
  gl_Position =
    scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
}
`,

  fragmentShadow: `#version 450
void main() {
}
`,

  vertex: `#version 450
layout(set = 0, binding = 0) uniform Scene {
  mat4 lightViewProjMatrix;
  mat4 cameraViewProjMatrix;
  vec3 lightPos;
} scene;

layout(set = 1, binding = 0) uniform Model {
  mat4 modelMatrix;
} model;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

layout(location = 0) out vec3 shadowPos;
layout(location = 1) out vec3 fragPos;
layout(location = 2) out vec3 fragNorm;

void main() {
  // XY is in (-1, 1) space, Z is in (0, 1) space
  vec4 posFromLight = scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);

  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y down.
  shadowPos = vec3(posFromLight.xy * vec2(0.5, -0.5) + 0.5, posFromLight.z);

  gl_Position =
    scene.cameraViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  fragPos = gl_Position.xyz;
  fragNorm = normal;
}
`,

  // prettier-ignore
  fragment: `#version 450
layout(set = 0, binding = 0) uniform Scene {
  mat4 lightViewProjMatrix;
  mat4 cameraViewProjMatrix;
  vec3 lightPos;
} scene;
layout(set = 0, binding = 1) uniform texture2D shadowMap;
layout(set = 0, binding = 2) uniform samplerShadow shadowSampler;

layout(location = 0) in vec3 shadowPos;
layout(location = 1) in vec3 fragPos;
layout(location = 2) in vec3 fragNorm;

layout(location = 0) out vec4 outColor;

const vec3 albedo = vec3(0.9);
const float ambientFactor = 0.2;

void main() {
  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  float shadowFactor = 0.0;
  for (int y = -1 ; y <= 1 ; y++) {
      for (int x = -1 ; x <= 1 ; x++) {
        vec2 offset = vec2(
          x * ${1 / shadowDepthTextureSize},
          y * ${1 / shadowDepthTextureSize});

        shadowFactor += texture(
          sampler2DShadow(shadowMap, shadowSampler),
          vec3(shadowPos.xy + offset, shadowPos.z - 0.007));
      }
  }

  shadowFactor = ambientFactor + shadowFactor / 9.0;

  float lambertFactor = abs(dot(normalize(scene.lightPos - fragPos), fragNorm));

  float lightingFactor = min(shadowFactor * lambertFactor, 1.0);
  outColor = vec4(lightingFactor * albedo, 1.0);
}
`,
};

const wgslShaders = {
  vertexShadow: `
[[block]] struct Scene {
  [[offset(0)]] lightViewProjMatrix : mat4x4<f32>;
  [[offset(64)]] cameraViewProjMatrix : mat4x4<f32>;
  [[offset(128)]] lightPos : vec3<f32>;
};

[[block]] struct Model {
  [[offset(0)]] modelMatrix : mat4x4<f32>;
};

[[group(0), binding(0)]] var<uniform> scene : Scene;
[[group(1), binding(0)]] var<uniform> model : Model;

[[location(0)]] var<in> position : vec3<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  Position = scene.lightViewProjMatrix * model.modelMatrix * vec4<f32>(position, 1.0);
}
`,

  fragmentShadow: `
[[stage(fragment)]]
fn main() -> void {
}
`,

  vertex: `
[[block]] struct Scene {
  [[offset(0)]] lightViewProjMatrix : mat4x4<f32>;
  [[offset(64)]] cameraViewProjMatrix : mat4x4<f32>;
  [[offset(128)]] lightPos : vec3<f32>;
};

[[block]] struct Model {
  [[offset(0)]] modelMatrix : mat4x4<f32>;
};

[[group(0), binding(0)]] var<uniform> scene : Scene;
[[group(1), binding(0)]] var<uniform> model : Model;

[[location(0)]] var<in> position : vec3<f32>;
[[location(1)]] var<in> normal : vec3<f32>;

[[location(0)]] var<out> shadowPos : vec3<f32>;
[[location(1)]] var<out> fragPos : vec3<f32>;
[[location(2)]] var<out> fragNorm : vec3<f32>;

[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  // XY is in (-1, 1) space, Z is in (0, 1) space
  const posFromLight : vec4<f32> = scene.lightViewProjMatrix * model.modelMatrix * vec4<f32>(position, 1.0);

  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowPos = vec3<f32>(
    posFromLight.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5),
    posFromLight.z
  );

  Position = scene.cameraViewProjMatrix * model.modelMatrix * vec4<f32>(position, 1.0);
  fragPos = Position.xyz;
  fragNorm = normal;
}
`,
  fragment: `
[[block]] struct Scene {
  [[offset(0)]] lightViewProjMatrix : mat4x4<f32>;
  [[offset(64)]] cameraViewProjMatrix : mat4x4<f32>;
  [[offset(128)]] lightPos : vec3<f32>;
};

[[group(0), binding(0)]] var<uniform> scene : Scene;
[[group(0), binding(1)]] var shadowMap: texture_depth_2d;
[[group(0), binding(2)]] var shadowSampler: sampler_comparison;

[[location(0)]] var<in> shadowPos : vec3<f32>;
[[location(1)]] var<in> fragPos : vec3<f32>;
[[location(2)]] var<in> fragNorm : vec3<f32>;

[[location(0)]] var<out> outColor : vec4<f32>;

const albedo : vec3<f32> = vec3<f32>(0.9, 0.9, 0.9);
const ambientFactor : f32 = 0.2;

[[stage(fragment)]]
fn main() -> void {
  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var shadowFactor : f32 = 0.0;
  for (var y : i32 = -1 ; y <= 1 ; y = y + 1) {
      for (var x : i32 = -1 ; x <= 1 ; x = x + 1) {
        const offset : vec2<f32> = vec2<f32>(
          f32(x) * ${1 / shadowDepthTextureSize},
          f32(y) * ${1 / shadowDepthTextureSize});

        shadowFactor = shadowFactor + textureSampleCompare(
          shadowMap, shadowSampler,
          shadowPos.xy + offset, shadowPos.z - 0.007);
      }
  }

  shadowFactor = ambientFactor + shadowFactor / 9.0;

  const lambertFactor : f32 = abs(dot(normalize(scene.lightPos - fragPos), fragNorm));

  const lightingFactor : f32 = min(shadowFactor * lambertFactor, 1.0);
  outColor = vec4<f32>(lightingFactor * albedo, 1.0);
}
`,
};

export default makeBasicExample({
  name: 'Shadow Mapping',
  description:
    'This example shows how to sample from a depth texture to render shadows.',
  slug: 'shadowMapping',
  init,
  wgslShaders,
  glslShaders,
  source: __SOURCE__,
});
