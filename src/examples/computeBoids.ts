import glslangModule from '../glslang';

export const title = 'Compute Boids';
export const description = 'A GPU compute particle simulation that mimics \
                            the flocking behavior of birds. A compute shader updates \
                            two ping-pong buffers which store particle data. The data \
                            is used to draw instanced particles.';

export async function init(canvas: HTMLCanvasElement, useWGSL: boolean) {
  const numParticles = 1500;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const context = canvas.getContext('gpupresent');

  const swapChain = context.configureSwapChain({
    device,
    format: "bgra8unorm"
  });

  const renderPipeline = device.createRenderPipeline({
    vertexStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.vertex,
          })
        : device.createShaderModule({
            code: glslShaders.vertex,
            transform: (glsl) => glslang.compileGLSL(glsl, "vertex"),
          }),
      entryPoint: "main",
    },
    fragmentStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.fragment,
          })
        : device.createShaderModule({
            code: glslShaders.fragment,
            transform: (glsl) => glslang.compileGLSL(glsl, "fragment"),
          }),
      entryPoint: "main",
    },

    primitiveTopology: "triangle-list",

    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },

    vertexState: {
      vertexBuffers: [
        {
          // instanced particles buffer
          arrayStride: 4 * 4,
          stepMode: "instance",
          attributes: [
            {
              // instance position
              shaderLocation: 0,
              offset: 0,
              format: "float2",
            },
            {
              // instance velocity
              shaderLocation: 1,
              offset: 2 * 4,
              format: "float2",
            },
          ],
        },
        {
          // vertex buffer
          arrayStride: 2 * 4,
          stepMode: "vertex",
          attributes: [
            {
              // vertex positions
              shaderLocation: 2,
              offset: 0,
              format: "float2",
            },
          ],
        },
      ],
    },

    colorStates: [
      {
        format: "bgra8unorm",
      },
    ],
  });

  const computePipeline = device.createComputePipeline({
    computeStage: {
      module: useWGSL
        ? device.createShaderModule({
            code: wgslShaders.compute(numParticles),
          })
        : device.createShaderModule({
            code: glslShaders.compute(numParticles),
            transform: (glsl) => glslang.compileGLSL(glsl, "compute"),
          }),
      entryPoint: "main",
    },
  });

  const depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height, depth: 1 },
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.OUTPUT_ATTACHMENT
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      attachment: undefined,  // Assigned later
      loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
    }],
    depthStencilAttachment: {
      attachment: depthTexture.createView(),
      depthLoadValue: 1.0,
      depthStoreOp: "store",
      stencilLoadValue: 0,
      stencilStoreOp: "store",
    }
  };

  const vertexBufferData = new Float32Array([-0.01, -0.02, 0.01, -0.02, 0.00, 0.02]);
  const verticesBuffer = device.createBuffer({
    size: vertexBufferData.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(vertexBufferData);
  verticesBuffer.unmap();

  const simParamData = new Float32Array([
    0.04,  // deltaT;
    0.1,   // rule1Distance;
    0.025, // rule2Distance;
    0.025, // rule3Distance;
    0.02,  // rule1Scale;
    0.05,  // rule2Scale;
    0.005  // rule3Scale;
  ]);
  const simParamBuffer = device.createBuffer({
    size: simParamData.byteLength,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  new Float32Array(simParamBuffer.getMappedRange()).set(simParamData);
  simParamBuffer.unmap();

  const initialParticleData = new Float32Array(numParticles * 4);
  for (let i = 0; i < numParticles; ++i) {
    initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
    initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
  }

  const particleBuffers: GPUBuffer[] = new Array(2);
  const particleBindGroups: GPUBindGroup[] = new Array(2);
  for (let i = 0; i < 2; ++i) {
    particleBuffers[i] = device.createBuffer({
      size: initialParticleData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(particleBuffers[i].getMappedRange()).set(initialParticleData);
    particleBuffers[i].unmap();
  }

  for (let i = 0; i < 2; ++i) {
    particleBindGroups[i] = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: {
          buffer: simParamBuffer,
          offset: 0,
          size: simParamData.byteLength
        },
      }, {
        binding: 1,
        resource: {
          buffer: particleBuffers[i],
          offset: 0,
          size: initialParticleData.byteLength,
        },
      }, {
        binding: 2,
        resource: {
          buffer: particleBuffers[(i + 1) % 2],
          offset: 0,
          size: initialParticleData.byteLength,
        },
      }],
    });
  }

  let t = 0;
  return function frame() {
    renderPassDescriptor.colorAttachments[0].attachment = swapChain.getCurrentTexture().createView();

    const commandEncoder = device.createCommandEncoder();
    {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(computePipeline);
      passEncoder.setBindGroup(0, particleBindGroups[t % 2]);
      passEncoder.dispatch(numParticles);
      passEncoder.endPass();
    }
    {
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(renderPipeline);
      passEncoder.setVertexBuffer(0, particleBuffers[(t + 1) % 2]);
      passEncoder.setVertexBuffer(1, verticesBuffer);
      passEncoder.draw(3, numParticles, 0, 0);
      passEncoder.endPass();
    }
    device.defaultQueue.submit([commandEncoder.finish()]);

    ++t;
  }
}

export const glslShaders = {
  vertex: `#version 450
layout(location = 0) in vec2 a_particlePos;
layout(location = 1) in vec2 a_particleVel;
layout(location = 2) in vec2 a_pos;
void main() {
  float angle = -atan(a_particleVel.x, a_particleVel.y);
  vec2 pos = vec2(a_pos.x * cos(angle) - a_pos.y * sin(angle),
          a_pos.x * sin(angle) + a_pos.y * cos(angle));
  gl_Position = vec4(pos + a_particlePos, 0, 1);
}`,

  fragment: `#version 450
layout(location = 0) out vec4 fragColor;
void main() {
  fragColor = vec4(1.0);
}`,

  compute: (numParticles: number) => `#version 450
struct Particle {
  vec2 pos;
  vec2 vel;
};

layout(std140, set = 0, binding = 0) uniform SimParams {
  float deltaT;
  float rule1Distance;
  float rule2Distance;
  float rule3Distance;
  float rule1Scale;
  float rule2Scale;
  float rule3Scale;
} params;

layout(std140, set = 0, binding = 1) buffer ParticlesA {
  Particle particles[${numParticles} /* numParticles */];
} particlesA;

layout(std140, set = 0, binding = 2) buffer ParticlesB {
  Particle particles[${numParticles} /* numParticles */];
} particlesB;

void main() {
  // https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp

  uint index = gl_GlobalInvocationID.x;
  if (index >= ${numParticles} /* numParticles */) { return; }

  vec2 vPos = particlesA.particles[index].pos;
  vec2 vVel = particlesA.particles[index].vel;

  vec2 cMass = vec2(0.0, 0.0);
  vec2 cVel = vec2(0.0, 0.0);
  vec2 colVel = vec2(0.0, 0.0);
  int cMassCount = 0;
  int cVelCount = 0;

  vec2 pos;
  vec2 vel;
  for (int i = 0; i < ${numParticles} /* numParticles */; ++i) {
    if (i == index) { continue; }
    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;

    if (distance(pos, vPos) < params.rule1Distance) {
      cMass += pos;
      cMassCount++;
    }
    if (distance(pos, vPos) < params.rule2Distance) {
      colVel -= (pos - vPos);
    }
    if (distance(pos, vPos) < params.rule3Distance) {
      cVel += vel;
      cVelCount++;
    }
  }
  if (cMassCount > 0) {
    cMass = cMass / cMassCount - vPos;
  }
  if (cVelCount > 0) {
    cVel = cVel / cVelCount;
  }

  vVel += cMass * params.rule1Scale + colVel * params.rule2Scale + cVel * params.rule3Scale;

  // clamp velocity for a more pleasing simulation.
  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.1);

  // kinematic update
  vPos += vVel * params.deltaT;

  // Wrap around boundary
  if (vPos.x < -1.0) vPos.x = 1.0;
  if (vPos.x > 1.0) vPos.x = -1.0;
  if (vPos.y < -1.0) vPos.y = 1.0;
  if (vPos.y > 1.0) vPos.y = -1.0;

  particlesB.particles[index].pos = vPos;

  // Write back
  particlesB.particles[index].vel = vVel;
}`,
};

export const wgslShaders = {
  vertex: `
[[location(0)]] var<in> a_particlePos : vec2<f32>;
[[location(1)]] var<in> a_particleVel : vec2<f32>;
[[location(2)]] var<in> a_pos : vec2<f32>;
[[builtin(position)]] var<out> Position : vec4<f32>;

[[stage(vertex)]]
fn main() -> void {
  var angle : f32 = -atan2(a_particleVel.x, a_particleVel.y);
  var pos : vec2<f32> = vec2<f32>(
      (a_pos.x * cos(angle)) - (a_pos.y * sin(angle)),
      (a_pos.x * sin(angle)) + (a_pos.y * cos(angle)));
  Position = vec4<f32>(pos + a_particlePos, 0.0, 1.0);
  return;
}
`,

  fragment: `
[[location(0)]] var<out> fragColor : vec4<f32>;

[[stage(fragment)]]
fn main() -> void {
  fragColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);
  return;
}
`,

  compute: (numParticles: number) => `
[[block]] struct Particle {
  [[offset(0)]] pos : vec2<f32>;
  [[offset(8)]] vel : vec2<f32>;
};
[[block]] struct SimParams {
  [[offset(0)]] deltaT : f32;
  [[offset(4)]] rule1Distance : f32;
  [[offset(8)]] rule2Distance : f32;
  [[offset(12)]] rule3Distance : f32;
  [[offset(16)]] rule1Scale : f32;
  [[offset(20)]] rule2Scale : f32;
  [[offset(24)]] rule3Scale : f32;
};
[[block]] struct Particles {
  [[offset(0)]] particles : [[stride(16)]] array<Particle, ${numParticles}>;
};
[[binding(0), set(0)]] var<uniform> params : SimParams;
[[binding(1), set(0)]] var<storage_buffer> particlesA : Particles;
[[binding(2), set(0)]] var<storage_buffer> particlesB : Particles;
[[builtin(global_invocation_id)]] var<in> GlobalInvocationID : vec3<u32>;

# https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp
[[stage(compute)]]
fn main() -> void {
  var index : u32 = GlobalInvocationID.x;
  if (index >= ${numParticles}) {
    return;
  }
  var vPos : vec2<f32> = particlesA.particles[index].pos;
  var vVel : vec2<f32> = particlesA.particles[index].vel;
  var cMass : vec2<f32> = vec2<f32>(0.0, 0.0);
  var cVel : vec2<f32> = vec2<f32>(0.0, 0.0);
  var colVel : vec2<f32> = vec2<f32>(0.0, 0.0);
  var cMassCount : u32 = 0u;
  var cVelCount : u32 = 0u;
  var pos : vec2<f32>;
  var vel : vec2<f32>;

  for (var i : u32 = 0u; i < ${numParticles}u; i = i + 1u) {
    if (i == index) {
      continue;
    }

    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;
    if (distance(pos, vPos) < params.rule1Distance) {
      cMass = cMass + pos;
      cMassCount = cMassCount + 1u;
    }
    if (distance(pos, vPos) < params.rule2Distance) {
      colVel = colVel - (pos - vPos);
    }
    if (distance(pos, vPos) < params.rule3Distance) {
      cVel = cVel + vel;
      cVelCount = cVelCount + 1u;
    }
  }
  if (cMassCount > 0u) {
    var temp : f32 = f32(cMassCount);
    cMass = (cMass / vec2<f32>(temp, temp)) - vPos;
    # cMass =
    #   (cMass / vec2<f32>(f32(cMassCount), f32(cMassCount))) - vPos;
  }
  if (cVelCount > 0u) {
    var temp : f32 = f32(cVelCount);
    cVel = cVel / vec2<f32>(temp, temp);
    # cVel = cVel / vec2<f32>(f32(cVelCount), f32(cVelCount));
  }
  vVel = vVel + (cMass * params.rule1Scale) + (colVel * params.rule2Scale) +
      (cVel * params.rule3Scale);

  # clamp velocity for a more pleasing simulation
  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.1);
  # kinematic update
  vPos = vPos + (vVel * params.deltaT);
  # Wrap around boundary
  if (vPos.x < -1.0) {
    vPos.x = 1.0;
  }
  if (vPos.x > 1.0) {
    vPos.x = -1.0;
  }
  if (vPos.y < -1.0) {
    vPos.y = 1.0;
  }
  if (vPos.y > 1.0) {
    vPos.y = -1.0;
  }
  # Write back
  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
  return;
}
`,
};
