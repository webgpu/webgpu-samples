import { mat4, vec3, vec4 } from 'gl-matrix';
import type { GUI } from 'dat.gui';
import {
  kDefaultCanvasWidth,
  kDefaultCanvasHeight,
  makeBasicExample,
} from '../../components/basicExample';

const kMaxNumLights = 1024;
const lightExtentMin = vec3.fromValues(-50, -30, -50);
const lightExtentMax = vec3.fromValues(50, 50, 50);

import dragonRawData from 'stanford-dragon/4';

async function init(canvas: HTMLCanvasElement, gui?: GUI) {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const aspect = Math.abs(canvas.width / canvas.height);

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: 'bgra8unorm',
  });

  const mesh = {
    positions: [...dragonRawData.positions] as [number, number, number][],
    triangles: [...dragonRawData.cells] as [number, number, number][],
    normals: [] as [number, number, number][],
    uvs: [] as [number, number][],
  };

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

  // Compute some easy uvs for testing
  mesh.uvs = mesh.positions.map(() => {
    // Initialize to zero.
    return [0, 0];
  });
  const extentMin = [Infinity, Infinity];
  const extentMax = [-Infinity, -Infinity];
  mesh.positions.forEach(([x, y], idx) => {
    // Simply project along the z axis
    mesh.uvs[idx][0] = x;
    mesh.uvs[idx][1] = y;

    extentMin[0] = Math.min(x, extentMin[0]);
    extentMin[1] = Math.min(y, extentMin[1]);
    extentMax[0] = Math.max(x, extentMax[0]);
    extentMax[1] = Math.max(y, extentMax[1]);
  });
  mesh.uvs.forEach((uv) => {
    uv[0] = (uv[0] - extentMin[0]) / (extentMax[0] - extentMin[0]);
    uv[1] = (uv[1] - extentMin[1]) / (extentMax[1] - extentMin[1]);
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

  // Push vertex attributes for an additional ground plane
  // prettier-ignore
  mesh.positions.push(
    [-100, 20, -100], //
    [ 100, 20,  100], //
    [-100, 20,  100], //
    [ 100, 20, -100]
  );
  mesh.normals.push(
    [0, 1, 0], //
    [0, 1, 0], //
    [0, 1, 0], //
    [0, 1, 0]
  );
  mesh.uvs.push(
    [0, 0], //
    [1, 1], //
    [0, 1], //
    [1, 0]
  );

  // Create the model vertex buffer.
  const kVertexStride = 8;
  const vertexBuffer = device.createBuffer({
    // position: vec3, normal: vec3, uv: vec2
    size:
      mesh.positions.length * kVertexStride * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  {
    const mapping = new Float32Array(vertexBuffer.getMappedRange());
    for (let i = 0; i < mesh.positions.length; ++i) {
      mapping.set(mesh.positions[i], kVertexStride * i);
      mapping.set(mesh.normals[i], kVertexStride * i + 3);
      mapping.set(mesh.uvs[i], kVertexStride * i + 6);
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

  // GBuffer texture render targets
  // Currently chrome still do not support layered rendering.
  // Use multiple Texture2D instead of Texture2DArray as render target
  const gBufferTextures = [
    // Position
    device.createTexture({
      size: [kDefaultCanvasWidth, kDefaultCanvasHeight, 1],
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
      format: 'rgba32float',
    }),
    // Normal
    device.createTexture({
      size: [kDefaultCanvasWidth, kDefaultCanvasHeight, 1],
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
      format: 'rgba32float',
    }),
    // Albedo
    device.createTexture({
      size: [kDefaultCanvasWidth, kDefaultCanvasHeight, 1],
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.SAMPLED,
      format: 'bgra8unorm',
    }),
  ];

  const vertexBuffers: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: Float32Array.BYTES_PER_ELEMENT * 8,
      attributes: [
        {
          // position
          shaderLocation: 0,
          offset: 0,
          format: 'float32x3',
        },
        {
          // normal
          shaderLocation: 1,
          offset: Float32Array.BYTES_PER_ELEMENT * 3,
          format: 'float32x3',
        },
        {
          // uv
          shaderLocation: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 6,
          format: 'float32x2',
        },
      ],
    },
  ];

  const primitive: GPUPrimitiveState = {
    topology: 'triangle-list',
    cullMode: 'back',
  };

  const WriteGBuffersPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexWriteGBuffers,
      }),
      entryPoint: 'main',
      buffers: vertexBuffers,
    },
    fragment: {
      module: device.createShaderModule({
        code: wgslShaders.fragementWriteGBuffers,
      }),
      entryPoint: 'main',
      targets: [
        { format: 'rgba32float' },
        { format: 'rgba32float' },
        { format: 'bgra8unorm' },
      ],
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
    primitive,
  });

  const gBuffersDebugViewPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexTextureQuad,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: wgslShaders.fragmentGBuffersDebugView,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
        },
      ],
    },
    primitive,
  });

  const deferredRenderPipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: wgslShaders.vertexTextureQuad,
      }),
      entryPoint: 'main',
    },
    fragment: {
      module: device.createShaderModule({
        code: wgslShaders.fragmentDeferredRendering,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: 'bgra8unorm',
        },
      ],
    },
    primitive,
  });

  const depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
    },
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const writeGBufferPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: gBufferTextures[0].createView(),

        loadValue: {
          r: Number.MAX_VALUE,
          g: Number.MAX_VALUE,
          b: Number.MAX_VALUE,
          a: 1.0,
        },
        storeOp: 'store',
      },
      {
        view: gBufferTextures[1].createView(),

        loadValue: { r: 0.0, g: 0.0, b: 1.0, a: 1.0 },
        storeOp: 'store',
      },
      {
        view: gBufferTextures[2].createView(),

        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthLoadValue: 1.0,
      depthStoreOp: 'store',
      stencilLoadValue: 0,
      stencilStoreOp: 'store',
    },
  };

  const textureQuadPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        // view is acquired and set in render loop.
        view: undefined,

        loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        storeOp: 'store',
      },
    ],
  };

  const settings = {
    mode: 'rendering',
    numLights: 128,
  };
  const configUniformBuffer = (() => {
    const buffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      mappedAtCreation: true,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    new Uint32Array(buffer.getMappedRange())[0] = settings.numLights;
    buffer.unmap();
    return buffer;
  })();

  gui.add(settings, 'mode', ['rendering', 'gBuffers view']);
  gui
    .add(settings, 'numLights', 1, kMaxNumLights)
    .step(1)
    .onChange(() => {
      device.queue.writeBuffer(
        configUniformBuffer,
        0,
        new Uint32Array([settings.numLights])
      );
    });

  const modelUniformBuffer = device.createBuffer({
    size: 4 * 16 * 2, // two 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const cameraUniformBuffer = device.createBuffer({
    size: 4 * 16, // 4x4 matrix
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sceneUniformBindGroup = device.createBindGroup({
    layout: WriteGBuffersPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: modelUniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: cameraUniformBuffer,
        },
      },
    ],
  });

  const gBufferTexturesBindGroup = device.createBindGroup({
    layout: gBuffersDebugViewPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: device.createSampler(),
      },
      {
        binding: 1,
        resource: gBufferTextures[0].createView(),
      },
      {
        binding: 2,
        resource: gBufferTextures[1].createView(),
      },
      {
        binding: 3,
        resource: gBufferTextures[2].createView(),
      },
    ],
  });

  // Lights data are uploaded in a storage buffer
  // which could be updated/culled/etc. with a compute shader
  const extent = vec3.create();
  vec3.sub(extent, lightExtentMax, lightExtentMin);
  const lightDataStride = 8;
  const bufferSizeInByte =
    Float32Array.BYTES_PER_ELEMENT * lightDataStride * kMaxNumLights;
  const lightsBuffer = device.createBuffer({
    size: bufferSizeInByte,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  const lightData = new Float32Array(lightsBuffer.getMappedRange());
  const tmpVec4 = vec4.create();
  let offset = 0;
  for (let i = 0; i < kMaxNumLights; i++) {
    offset = lightDataStride * i;
    // position
    for (let i = 0; i < 3; i++) {
      tmpVec4[i] = Math.random() * extent[i] + lightExtentMin[i];
    }
    tmpVec4[3] = 1;
    lightData.set(tmpVec4, offset);
    // color
    tmpVec4[0] = Math.random() * 2;
    tmpVec4[1] = Math.random() * 2;
    tmpVec4[2] = Math.random() * 2;
    // radius
    tmpVec4[3] = 20.0;
    lightData.set(tmpVec4, offset + 4);
  }
  lightsBuffer.unmap();

  const lightUpdateComputePipeline = device.createComputePipeline({
    compute: {
      module: device.createShaderModule({
        code: wgslShaders.lightUpdate,
      }),
      entryPoint: 'main',
    },
  });
  const lightsBufferBindGroup = device.createBindGroup({
    layout: deferredRenderPipeline.getBindGroupLayout(1),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: lightsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: configUniformBuffer,
        },
      },
    ],
  });
  const lightsBufferComputeBindGroup = device.createBindGroup({
    layout: lightUpdateComputePipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: lightsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: configUniformBuffer,
        },
      },
    ],
  });
  //--------------------

  // scene matrices
  const eyePosition = vec3.fromValues(0, 50, -100);
  const upVector = vec3.fromValues(0, 1, 0);
  const origin = vec3.fromValues(0, 0, 0);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 2000.0);

  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

  const viewProjMatrix = mat4.create();
  mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);

  // Move the model so it's centered.
  const modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -5, 0));
  mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -40, 0));

  const cameraMatrixData = viewProjMatrix as Float32Array;
  device.queue.writeBuffer(
    cameraUniformBuffer,
    0,
    cameraMatrixData.buffer,
    cameraMatrixData.byteOffset,
    cameraMatrixData.byteLength
  );
  const modelData = modelMatrix as Float32Array;
  device.queue.writeBuffer(
    modelUniformBuffer,
    0,
    modelData.buffer,
    modelData.byteOffset,
    modelData.byteLength
  );
  const invertTransposeModelMatrix = mat4.create();
  mat4.invert(invertTransposeModelMatrix, modelMatrix);
  mat4.transpose(invertTransposeModelMatrix, invertTransposeModelMatrix);
  const normalModelData = invertTransposeModelMatrix as Float32Array;
  device.queue.writeBuffer(
    modelUniformBuffer,
    64,
    normalModelData.buffer,
    normalModelData.byteOffset,
    normalModelData.byteLength
  );

  // Rotates the camera around the origin based on time.
  function getCameraViewProjMatrix() {
    const eyePosition = vec3.fromValues(0, 50, -100);

    const rad = Math.PI * (Date.now() / 5000);
    vec3.rotateY(eyePosition, eyePosition, origin, rad);

    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, eyePosition, origin, upVector);

    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrix);
    return viewProjMatrix as Float32Array;
  }

  return function frame() {
    const cameraViewProj = getCameraViewProjMatrix();
    device.queue.writeBuffer(
      cameraUniformBuffer,
      0,
      cameraViewProj.buffer,
      cameraViewProj.byteOffset,
      cameraViewProj.byteLength
    );

    const commandEncoder = device.createCommandEncoder();
    {
      // geometry pass write to g buffers
      const gBufferPass = commandEncoder.beginRenderPass(
        writeGBufferPassDescriptor
      );
      gBufferPass.setPipeline(WriteGBuffersPipeline);
      gBufferPass.setBindGroup(0, sceneUniformBindGroup);
      gBufferPass.setVertexBuffer(0, vertexBuffer);
      gBufferPass.setIndexBuffer(indexBuffer, 'uint16');
      gBufferPass.drawIndexed(indexCount);
      gBufferPass.endPass();
    }
    {
      // update lights
      const lightPass = commandEncoder.beginComputePass();
      lightPass.setPipeline(lightUpdateComputePipeline);
      lightPass.setBindGroup(0, lightsBufferComputeBindGroup);
      lightPass.dispatch(kMaxNumLights);
      lightPass.endPass();
    }
    {
      if (settings.mode === 'gBuffers view') {
        textureQuadPassDescriptor.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();
        const debugViewPass = commandEncoder.beginRenderPass(
          textureQuadPassDescriptor
        );
        debugViewPass.setPipeline(gBuffersDebugViewPipeline);
        debugViewPass.setBindGroup(0, gBufferTexturesBindGroup);
        debugViewPass.draw(6);
        debugViewPass.endPass();
      } else {
        // deferred rendering
        textureQuadPassDescriptor.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();
        const deferredRenderingPass = commandEncoder.beginRenderPass(
          textureQuadPassDescriptor
        );
        deferredRenderingPass.setPipeline(deferredRenderPipeline);
        deferredRenderingPass.setBindGroup(0, gBufferTexturesBindGroup);
        deferredRenderingPass.setBindGroup(1, lightsBufferBindGroup);
        deferredRenderingPass.draw(6);
        deferredRenderingPass.endPass();
      }
    }
    device.queue.submit([commandEncoder.finish()]);
  };
}

const wgslShaders = {
  lightUpdate: `
struct LightData {
  position : vec4<f32>;
  color : vec3<f32>;
  radius : f32;
};
[[block]] struct LightsBuffer {
  lights: array<LightData>;
};
[[group(0), binding(0)]] var<storage> lightsBuffer: [[access(read_write)]] LightsBuffer;

[[block]] struct Config {
  numLights : u32;
};
[[group(0), binding(1)]] var<uniform> config: Config;

[[stage(compute)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
  var index : u32 = GlobalInvocationID.x;
  if (index >= config.numLights) {
    return;
  }

  lightsBuffer.lights[index].position.y = lightsBuffer.lights[index].position.y - 0.5 - 0.003 * (f32(index) - 64.0 * floor(f32(index) / 64.0));
  
  if (lightsBuffer.lights[index].position.y < ${lightExtentMin[1].toFixed(1)}) {
    lightsBuffer.lights[index].position.y = ${lightExtentMax[1].toFixed(1)};
  }
}
`,
  vertexTextureQuad: `
let pos : array<vec2<f32>, 6> = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));

[[stage(vertex)]]
fn main([[builtin(vertex_index)]] VertexIndex : u32)
        -> [[builtin(position)]] vec4<f32> {
    return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`,
  fragmentGBuffersDebugView: `
[[group(0), binding(0)]] var mySampler: sampler;
[[group(0), binding(1)]] var gBufferPosition: texture_2d<f32>;
[[group(0), binding(2)]] var gBufferNormal: texture_2d<f32>;
[[group(0), binding(3)]] var gBufferAlbedo: texture_2d<f32>;

[[stage(fragment)]]
fn main([[builtin(position)]] coord : vec4<f32>)
     -> [[location(0)]] vec4<f32> {
  var result : vec4<f32>;
  var c : vec2<f32> = coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)});
  if (c.x < 0.33333) {
    result = textureSample(
      gBufferPosition,
      mySampler,
      c
    );
  } elseif (c.x < 0.66667) {
    result = textureSample(
      gBufferNormal,
      mySampler,
      c
    );
    result.x = (result.x + 1.0) * 0.5;
    result.y = (result.y + 1.0) * 0.5;
    result.z = (result.z + 1.0) * 0.5;
  } else {
    result = textureSample(
      gBufferAlbedo,
      mySampler,
      c
    );
  }
  return result;
}
`,
  fragmentDeferredRendering: `
[[group(0), binding(0)]] var mySampler: sampler;
[[group(0), binding(1)]] var gBufferPosition: texture_2d<f32>;
[[group(0), binding(2)]] var gBufferNormal: texture_2d<f32>;
[[group(0), binding(3)]] var gBufferAlbedo: texture_2d<f32>;

struct LightData {
  position : vec4<f32>;
  color : vec3<f32>;
  radius : f32;
};
[[block]] struct LightsBuffer {
  lights: array<LightData>;
};
[[group(1), binding(0)]] var<storage> lightsBuffer: [[access(read)]] LightsBuffer;

[[block]] struct Config {
  numLights : u32;
};
[[group(1), binding(1)]] var<uniform> config: Config;

[[stage(fragment)]]
fn main([[builtin(position)]] coord : vec4<f32>)
     -> [[location(0)]] vec4<f32> {
  var result : vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
  var c : vec2<f32> = coord.xy / vec2<f32>(${kDefaultCanvasWidth.toFixed(
    1
  )}, ${kDefaultCanvasHeight.toFixed(1)});

  var position : vec3<f32> = textureSample(
    gBufferPosition,
    mySampler,
    c
  ).xyz;

  if (position.z > 10000.0) {
    discard;
  }

  var normal : vec3<f32> = textureSample(
    gBufferNormal,
    mySampler,
    c
  ).xyz;

  var albedo : vec3<f32> = textureSample(
    gBufferAlbedo,
    mySampler,
    c
  ).rgb;

  for (var i : u32 = 0u; i < ${kMaxNumLights}u; i = i + 1u) {
    if (i >= config.numLights) {
      break;
    }

    var L : vec3<f32> = lightsBuffer.lights[i].position.xyz - position;
    var distance : f32 = length(L);
    if (distance > lightsBuffer.lights[i].radius) {
        continue;
    }
    var lambert : f32 = max(dot(normal, normalize(L)), 0.0);
    result = result + vec3<f32>(
      lambert * pow(1.0 - distance / lightsBuffer.lights[i].radius, 2.0) * lightsBuffer.lights[i].color * albedo);
  }

  // some manual ambient
  result = result + vec3<f32>(0.2, 0.2, 0.2);

  return vec4<f32>(result, 1.0);
}
`,
  vertexWriteGBuffers: `
[[block]] struct Uniforms {
  modelMatrix : mat4x4<f32>;
  normalModelMatrix : mat4x4<f32>;
};
[[block]] struct Camera {
  viewProjectionMatrix : mat4x4<f32>;
};
[[group(0), binding(0)]] var<uniform> uniforms : Uniforms;
[[group(0), binding(1)]] var<uniform> camera : Camera;

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragPosition: vec3<f32>;  // position in world space
  [[location(1)]] fragNormal: vec3<f32>;    // normal in world space
  [[location(2)]] fragUV: vec2<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position : vec3<f32>,
        [[location(1)]] normal : vec3<f32>,
        [[location(2)]] uv : vec2<f32>) -> VertexOutput {
  var output : VertexOutput;
  output.fragPosition = (uniforms.modelMatrix * vec4<f32>(position, 1.0)).xyz;
  output.Position = camera.viewProjectionMatrix * vec4<f32>(output.fragPosition, 1.0);
  output.fragNormal = normalize((uniforms.normalModelMatrix * vec4<f32>(normal, 1.0)).xyz);
  output.fragUV = uv;
  return output;
}
  `,
  fragementWriteGBuffers: `
struct GBufferOutput {
  [[location(0)]] position : vec4<f32>;
  [[location(1)]] normal : vec4<f32>;

  // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
  [[location(2)]] albedo : vec4<f32>;
};

[[stage(fragment)]]
fn main([[location(0)]] fragPosition: vec3<f32>,
        [[location(1)]] fragNormal: vec3<f32>,
        [[location(2)]] fragUV : vec2<f32>) -> GBufferOutput {
    var output : GBufferOutput;
    output.position = vec4<f32>(fragPosition, 1.0);
    output.normal = vec4<f32>(fragNormal, 1.0);
    // faking some kind of checkerboard texture
    var uv : vec2<f32> = floor(30.0 * fragUV);
    var c: f32 = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
    output.albedo = vec4<f32>(c, c, c, 1.0);
    return output;
}
  `,
};

export default makeBasicExample({
  name: 'Deferred Rendering',
  description:
    'This example shows how to do deferred rendering with webgpu. Layered rendering is still not fully implemented by browser so it is now using Texture 2D instead of Texture 2D Arrays for G-Buffers',
  slug: 'deferredRendering',
  init,
  source: __SOURCE__,
  gui: true,
});
