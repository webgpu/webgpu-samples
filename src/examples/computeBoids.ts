import glslangModule from '../glslang';

export const title = 'Compute Boids';
export const description = 'A GPU compute particle simulation that mimics \
                            the flocking behavior of birds. A compute shader updates \
                            two ping-pong buffers which store particle data. The data \
                            is used to draw instanced particles.';

export async function init(canvas: HTMLCanvasElement) {
  const numParticles = 1500;

  const vertexShaderGLSL = `#version 450
  layout(location = 0) in vec2 a_particlePos;
  layout(location = 1) in vec2 a_particleVel;
  layout(location = 2) in vec2 a_pos;
  void main() {
    float angle = -atan(a_particleVel.x, a_particleVel.y);
    vec2 pos = vec2(a_pos.x * cos(angle) - a_pos.y * sin(angle),
            a_pos.x * sin(angle) + a_pos.y * cos(angle));
    gl_Position = vec4(pos + a_particlePos, 0, 1);
  }`;

  const fragmentShaderGLSL = `#version 450
  layout(location = 0) out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0);
  }`;

  const computeShaderGLSL = `#version 450
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
    Particle particles[${numParticles}];
  } particlesA;

  layout(std140, set = 0, binding = 2) buffer ParticlesB {
    Particle particles[${numParticles}];
  } particlesB;

  void main() {
    // https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp

    uint index = gl_GlobalInvocationID.x;
    if (index >= ${numParticles}) { return; }

    vec2 vPos = particlesA.particles[index].pos;
    vec2 vVel = particlesA.particles[index].vel;

    vec2 cMass = vec2(0.0, 0.0);
    vec2 cVel = vec2(0.0, 0.0);
    vec2 colVel = vec2(0.0, 0.0);
    int cMassCount = 0;
    int cVelCount = 0;

    vec2 pos;
    vec2 vel;
    for (int i = 0; i < ${numParticles}; ++i) {
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
  }`;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const glslang = await glslangModule();

  const context = canvas.getContext('gpupresent');

  // @ts-ignore:
  const swapChain = context.configureSwapChain({
    device,
    format: "bgra8unorm"
  });

  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, type: "uniform-buffer" },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" },
    ],
  });

  const computePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [computeBindGroupLayout],
  });

  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [] }),

    vertexStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(vertexShaderGLSL, "vertex"),

        // @ts-ignore
        source: vertexShaderGLSL,
        transform: source => glslang.compileGLSL(source, "vertex"),
      }),
      entryPoint: "main"
    },
    fragmentStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(fragmentShaderGLSL, "fragment"),

        // @ts-ignore
        source: fragmentShaderGLSL,
        transform: source => glslang.compileGLSL(source, "fragment"),
      }),
      entryPoint: "main"
    },

    primitiveTopology: "triangle-list",

    depthStencilState: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus-stencil8",
    },

    vertexState: {
      vertexBuffers: [{
        // instanced particles buffer
        arrayStride: 4 * 4,
        stepMode: "instance",
        attributes: [{
          // instance position
          shaderLocation: 0,
          offset: 0,
          format: "float2"
        }, {
          // instance velocity
          shaderLocation: 1,
          offset: 2 * 4,
          format: "float2"
        }],
      }, {
        // vertex buffer
        arrayStride: 2 * 4,
        stepMode: "vertex",
        attributes: [{
          // vertex positions
          shaderLocation: 2,
          offset: 0,
          format: "float2"
        }],
      }],
    },

    colorStates: [{
      format: "bgra8unorm",
    }],
  });

  const computePipeline = device.createComputePipeline({
    layout: computePipelineLayout,
    computeStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(computeShaderGLSL, "compute"),

        // @ts-ignore
        source: computeShaderGLSL,
        transform: source => glslang.compileGLSL(source, "compute"),
      }),
      entryPoint: "main"
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
  const [verticesBuffer, vertexMapping] = device.createBufferMapped({
    size: vertexBufferData.byteLength,
    usage: GPUBufferUsage.VERTEX,
  });
  new Float32Array(vertexMapping).set(vertexBufferData);
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
  const [simParamBuffer, simParamMapping] = device.createBufferMapped({
    size: simParamData.byteLength,
    usage: GPUBufferUsage.UNIFORM,
  });
  new Float32Array(simParamMapping).set(simParamData);
  simParamBuffer.unmap();

  const initialParticleData = new Float32Array(numParticles * 4);
  for (let i = 0; i < numParticles; ++i) {
    initialParticleData[4 * i + 0] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 1] = 2 * (Math.random() - 0.5);
    initialParticleData[4 * i + 2] = 2 * (Math.random() - 0.5) * 0.1;
    initialParticleData[4 * i + 3] = 2 * (Math.random() - 0.5) * 0.1;
  }

  const particleBuffers = new Array(2);
  const particleBindGroups = new Array(2);
  for (let i = 0; i < 2; ++i) {
    let particleBufferMapping;
    [particleBuffers[i], particleBufferMapping] = device.createBufferMapped({
      size: initialParticleData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    });
    new Float32Array(particleBufferMapping).set(initialParticleData);
    particleBuffers[i].unmap();
  }

  for (let i = 0; i < 2; ++i) {
    particleBindGroups[i] = device.createBindGroup({
      layout: computeBindGroupLayout,
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

    const commandEncoder = device.createCommandEncoder({});
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
