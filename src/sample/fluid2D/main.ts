import { makeSample, SampleInit } from '../../components/SampleLayout';
import { create3DRenderPipeline } from '../normalMap/utils';
import { createBindGroupCluster, extractGPUData } from './utils';
import particleWGSL from './particle.wgsl';
import { PositionsComputeShader } from './fluidCompute/positionsWGSL';
import { DensityComputeShader } from './fluidCompute/densityWGSL';
import {
  createSpatialSortResource,
  StepEnum,
  StepType,
} from './sortCompute/sort';
import { sortWGSL } from './sortCompute/sortWGSL';
import offsetsWGSL from './sortCompute/offsets.wgsl';
// Bind Group Tier Level
// Group 0: Changes per frame (read_write buffers, etc)
// Group 1: Per user input (uniforms)
// Group 2: Never changes (overrides, strictly read_only buffers)

const init: SampleInit = async ({ pageState, gui, canvas, stats }) => {
  // Get device specific resources and constants
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const aspect = canvas.width / canvas.height;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });
  const maxWorkgroupSizeX = device.limits.maxComputeWorkgroupSizeX;

  const settings = {
    // The gravity force applied to each particle
    Gravity: -9.8,
    'Delta Time': 0.04,
    // The total number of particles being simulated
    'Total Particles': 65536,
    // A fluid particle's display radius
    'Particle Radius': 10.0,
    // The radius of influence from the center of a particle to
    'Smoothing Radius': 0.7,
    // The bounce dampening on a non-fluid particle
    Damping: 0.7,
    // A boolean indicating whether the simulation is in the process of resetting
    isResetting: false,
    simulate: false,
  };

  /* COMPUTE SHADER RESOURCE PREPARATION */

  // Create buffer for default positions data
  const inputPositionsData = new Float32Array(
    new ArrayBuffer(
      settings['Total Particles'] * 2 * Float32Array.BYTES_PER_ELEMENT
    )
  );

  console.log(device.limits.minUniformBufferOffsetAlignment);
  console.log(device.limits.minStorageBufferOffsetAlignment);
  // Create buffer for default velocities data
  const inputVelocitiesData = new Float32Array(
    new ArrayBuffer(
      settings['Total Particles'] * 2 * Float32Array.BYTES_PER_ELEMENT
    )
  );

  // Generate positions data and velocities data for their respective buffers
  const generateParticles = () => {
    for (let i = 0; i < settings['Total Particles']; i++) {
      // Position
      inputPositionsData[i * 2 + 0] =
        -canvas.width + Math.random() * (canvas.width * 2);
      inputPositionsData[i * 2 + 1] =
        -canvas.height + Math.random() * (canvas.height * 2);

      // Velocity
      inputVelocitiesData[i * 2 + 0] = 0;
      inputVelocitiesData[i * 2 + 1] = 0;
    }
  };

  /* PARTICLE RENDER SHADER */

  // Passes the vec3 color, vec3 position, and vec2 velocity to the fragment shader
  // Will be used as both a read_only buffer for render shaders and a write buffer for compute
  const particlePositionsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const particleVelocitiesBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Passes particle_radius, canvasWidth, and canvasHeight as uniforms to vertex and fragment shaders
  const particleDisplayUniformsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 3,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Defines a bindGroup storing the positions and velocities storage buffers of the particle display shader.
  const particleStorageBGCluster = createBindGroupCluster({
    device: device,
    label: 'ParticleStorage',
    bindings: [0, 1],
    visibilities: [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
    resourceTypes: ['buffer', 'buffer'],
    resourceLayouts: [
      { type: 'read-only-storage' },
      { type: 'read-only-storage' },
    ],
    resources: [
      [
        { buffer: particlePositionsBuffer },
        { buffer: particleVelocitiesBuffer },
      ],
    ],
  });

  // Defines a bindGroup storing the uniforms for the particle display shader.
  const particleUniformsBGCluster = createBindGroupCluster({
    device: device,
    label: 'ParticleUniforms',
    bindings: [0],
    visibilities: [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
    resourceTypes: ['buffer'],
    resourceLayouts: [{ type: 'uniform' }],
    resources: [[{ buffer: particleDisplayUniformsBuffer }]],
  });

  // Render pipeline using instancing to render each particle as an sdf circle
  const particleRenderPipeline = create3DRenderPipeline(
    device,
    'Particle',
    [
      particleStorageBGCluster.bindGroupLayout,
      particleUniformsBGCluster.bindGroupLayout,
    ],
    particleWGSL,
    [],
    particleWGSL,
    presentationFormat,
    false,
    'triangle-list',
    'front'
  );

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  /* POSITIONS COMPUTE SHADER */

  const generalUniformsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const particlePropertiesUniformsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  // Same as particleStorageBGCluster but resources are read_write
  const positionsStorageBGCluster = createBindGroupCluster({
    device: device,
    label: 'ComputePositions.storageBGCluster',
    bindings: [0, 1],
    visibilities: [GPUShaderStage.COMPUTE],
    resourceTypes: ['buffer', 'buffer'],
    resourceLayouts: [{ type: 'storage' }, { type: 'storage' }],
    resources: [
      [
        { buffer: particlePositionsBuffer },
        { buffer: particleVelocitiesBuffer },
      ],
    ],
  });

  const positionsUniformsBGCluster = createBindGroupCluster({
    device: device,
    label: 'ComputePositions.uniformsBGCluster',
    bindings: [0, 1],
    visibilities: [GPUShaderStage.COMPUTE],
    resourceTypes: ['buffer', 'buffer'],
    resourceLayouts: [{ type: 'uniform' }, { type: 'uniform' }],
    resources: [
      [
        { buffer: generalUniformsBuffer },
        { buffer: particlePropertiesUniformsBuffer },
      ],
    ],
  });

  const positionsComputePipeline = device.createComputePipeline({
    label: 'ComputePositions.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        positionsStorageBGCluster.bindGroupLayout,
        positionsUniformsBGCluster.bindGroupLayout,
      ],
    }),
    compute: {
      module: device.createShaderModule({
        label: 'ComputePositions.computeShader',
        code: PositionsComputeShader(maxWorkgroupSizeX),
      }),
      entryPoint: 'computeMain',
    },
  });

  /* GPU SORT PIPELINE */
  // Create buffers, workgroup and invocation numbers
  const sortResource = createSpatialSortResource(
    device,
    settings['Total Particles']
  );

  // Create spatialIndices sort pipelines
  const sortSpatialIndicesPipeline = device.createComputePipeline({
    label: 'SpatialInfoSort.sortSpatialIndices.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        sortResource.dataStorageBGCluster.bindGroupLayout,
        sortResource.algoStorageBGCluster.bindGroupLayout,
      ],
    }),
    compute: {
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        code: sortWGSL(sortResource.maxWorkgroupSize),
      }),
    },
  });

  // Create spatialOffsets assignment pipeline
  const computeSpatialOffsetsPipeline = device.createComputePipeline({
    label: 'SpatialInfoSort.computeSpatialOffsets.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [sortResource.dataStorageBGCluster.bindGroupLayout],
    }),
    compute: {
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        code: offsetsWGSL,
      }),
    },
  });

  // Process that actually executes the sort and the pipeline
  // Either the provide the buffer with initial values, or write to it from a previous shader
  const computeSpatialInformation = (
    device: GPUDevice,
    commandEncoder: GPUCommandEncoder,
    initialValues?: Uint32Array
  ) => {
    // If we provide initial values to the sort
    if (initialValues) {
      // Check if the size of the initialValues array matches our buffer
      if (initialValues.byteLength !== sortResource.spatialIndicesBufferSize) {
        console.log(
          'Incorrect arrayBuffer size. Size of spatialIndices array must be equal to Uint32Array.BytesPerElement * 3 * totalParticles'
        );
      }
      // Write initial values to buffer before sort
      device.queue.writeBuffer(
        sortResource.spatialIndicesBuffer,
        0,
        initialValues.buffer,
        initialValues.byteOffset,
        initialValues.byteLength
      );
    }

    // Set up the defaults at the beginning of an arbitrarily sized bitonic sort
    // First operation is always a flip operation with a swap span of two (ie 0 -> 1 2 -> 3, etc)
    let nextBlockHeight = 2;
    // String that allows us to access values in StepEnum, which are then passed to our sort shader
    let nextAlgo: StepType = 'FLIP_LOCAL';
    // Highest Block Height is the highest swap span we've yet encountered during the sort
    let highestBlockHeight = nextBlockHeight;
    const initialAlgoInfo = new Uint32Array([
      StepEnum[nextAlgo], // starts at 1
      nextBlockHeight, // starts at 2
      highestBlockHeight, // starts at 2
      sortResource.workgroupsToDispatch, // particles / maxWorkgroupSize
    ]);
    // Write defaults algoInfo to buffer
    device.queue.writeBuffer(
      sortResource.algoStorageBuffer,
      0,
      initialAlgoInfo.buffer,
      initialAlgoInfo.byteOffset,
      initialAlgoInfo.byteLength
    );

    let step = 0;
    // We calculate the numSteps for a single complete pass of the bitonic sort because it allows the user to better debug where in the shader (i.e in which step)
    // something is going wrong
    for (let i = 0; i < sortResource.stepsInSort; i++) {
      console.log(step);
      step += 1;
      const sortSpatialIndicesComputePassEncoder =
        commandEncoder.beginComputePass();
      // Set the resources for this pass of the compute shader
      sortSpatialIndicesComputePassEncoder.setPipeline(
        sortSpatialIndicesPipeline
      );
      sortSpatialIndicesComputePassEncoder.setBindGroup(
        0,
        sortResource.dataStorageBGCluster.bindGroups[0]
      );
      sortSpatialIndicesComputePassEncoder.setBindGroup(
        1,
        sortResource.algoStorageBGCluster.bindGroups[0]
      );
      // Dispatch workgroups
      sortSpatialIndicesComputePassEncoder.dispatchWorkgroups(
        sortResource.workgroupsToDispatch
      );
      sortSpatialIndicesComputePassEncoder.end();
      nextBlockHeight /= 2;
      if (nextBlockHeight === 1) {
        highestBlockHeight *= 2;
        if (highestBlockHeight === settings['Total Particles'] * 2) {
          nextAlgo = 'NONE';
        } else if (highestBlockHeight > sortResource.maxWorkgroupSize * 2) {
          nextAlgo = 'FLIP_GLOBAL';
          nextBlockHeight = highestBlockHeight;
        } else {
          nextAlgo = 'FLIP_LOCAL';
          nextBlockHeight = highestBlockHeight;
        }
      } else {
        nextBlockHeight > sortResource.maxWorkgroupSize * 2
          ? (nextAlgo = 'DISPERSE_GLOBAL')
          : (nextAlgo = 'DISPERSE_LOCAL');
      }
      // Copy the result of the sort to the staging buffer
      commandEncoder.copyBufferToBuffer(
        sortResource.spatialIndicesBuffer,
        0,
        sortResource.spatialIndicesStagingBuffer,
        0,
        sortResource.spatialIndicesBufferSize
      );
    }
    const computeSpatialOffsetPassEncoder = commandEncoder.beginComputePass();
    computeSpatialOffsetPassEncoder.setPipeline(computeSpatialOffsetsPipeline);
    computeSpatialOffsetPassEncoder.setBindGroup(
      0,
      sortResource.dataStorageBGCluster.bindGroups[0]
    );
    computeSpatialOffsetPassEncoder.dispatchWorkgroups(
      sortResource.workgroupsToDispatch
    );
    computeSpatialOffsetPassEncoder.end();
  };

  const randomIndices = new Uint32Array(
    Array.from({ length: settings['Total Particles'] * 3 }, (_, i) => {
      if ((i + 1) % 3 === 0) {
        return Math.floor(Math.random() * 10000);
      } else {
        return 0;
      }
    })
  );
  console.log(randomIndices);
  const commandEncoder = device.createCommandEncoder();
  computeSpatialInformation(device, commandEncoder, randomIndices);
  device.queue.submit([commandEncoder.finish()]);
  extractGPUData(
    sortResource.spatialIndicesStagingBuffer,
    sortResource.spatialIndicesBufferSize
  ).then((res) => console.log(res));

  // Test sort on a randomly created set of values (program should only sort according to key element);

  generateParticles();

  gui.add(settings, 'simulate');
  gui.add(settings, 'Delta Time', 0.01, 0.5).step(0.01);
  gui.add(settings, 'Particle Radius', 0.0, 300.0).step(1.0);
  gui.add(settings, 'Gravity', -20.0, 20.0).step(0.1);
  gui.add(settings, 'Damping', 0.0, 1.0).step(0.1);

  device.queue.writeBuffer(particlePositionsBuffer, 0, inputPositionsData);
  device.queue.writeBuffer(particleVelocitiesBuffer, 0, inputVelocitiesData);

  async function frame() {
    if (!pageState.active) return;

    stats.begin();

    device.queue.writeBuffer(
      generalUniformsBuffer,
      0,
      new Uint32Array([settings['Total Particles']])
    );

    device.queue.writeBuffer(
      generalUniformsBuffer,
      4,
      new Float32Array([
        settings['Delta Time'],
        canvas.width - settings['Particle Radius'],
        canvas.height - settings['Particle Radius'],
      ])
    );

    device.queue.writeBuffer(
      particlePropertiesUniformsBuffer,
      0,
      new Float32Array([settings.Damping, settings.Gravity])
    );

    // Write to render uniform buffers
    device.queue.writeBuffer(
      particleDisplayUniformsBuffer,
      0,
      new Float32Array([
        settings['Particle Radius'],
        canvas.width,
        canvas.height,
      ])
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();

    if (settings.simulate) {
      // Run compute shader to compute particle positions
      const computePositionsPassEncoder = commandEncoder.beginComputePass();
      computePositionsPassEncoder.setPipeline(positionsComputePipeline);
      computePositionsPassEncoder.setBindGroup(
        0,
        positionsStorageBGCluster.bindGroups[0]
      );
      computePositionsPassEncoder.setBindGroup(
        1,
        positionsUniformsBGCluster.bindGroups[0]
      );
      computePositionsPassEncoder.dispatchWorkgroups(
        Math.ceil(settings['Total Particles'] / maxWorkgroupSizeX)
      );
      computePositionsPassEncoder.end();
    }

    const renderPassEncoder =
      commandEncoder.beginRenderPass(renderPassDescriptor);
    renderPassEncoder.setPipeline(particleRenderPipeline);
    renderPassEncoder.setBindGroup(0, particleStorageBGCluster.bindGroups[0]);
    renderPassEncoder.setBindGroup(1, particleUniformsBGCluster.bindGroups[0]);
    renderPassEncoder.draw(6, settings['Total Particles'], 0, 0);
    renderPassEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    stats.end();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const fluidExample: () => JSX.Element = () =>
  makeSample({
    name: 'Fluid Example',
    description: 'WIP Fluid Sim',
    init,
    gui: true,
    stats: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './particle.wgsl',
        contents: particleWGSL,
      },
      {
        name: './positions.wgsl',
        contents: PositionsComputeShader(256),
      },
      {
        name: './density.wgsl',
        contents: DensityComputeShader(256),
      },
    ],
    filename: __filename,
  });

export default fluidExample;
