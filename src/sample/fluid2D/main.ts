import { makeSample, SampleInit } from '../../components/SampleLayout';
import { createBindGroupCluster } from './utils';
import { createSpatialSortResource, StepEnum, StepType } from './sort/types';
import sortWGSL from './sort/sort.wgsl';
import offsetsWGSL from './sort/offsets.wgsl';
import commonWGSL from './common.wgsl';
import spatialHashWGSL from './compute/spatialHash.wgsl';
import particleWGSL from './render/particle.wgsl';
import positionsWGSL from './compute/positions.wgsl';
import densityWGSL from './compute/density.wgsl';
import viscosityWGSL from './compute/viscosity.wgsl';
import ParticleRenderer from './render/renderParticle';

interface ComputeSpatialInformationArgs {
  device: GPUDevice;
  commandEncoder: GPUCommandEncoder;
  initialValues?: Uint32Array;
}

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
    'Total Particles': 2048,
    // A fluid particle's display radius
    'Particle Radius': 10.0,
    writeToDistributionBuffer: false,
    iterationsPerFrame: 1,
    // The radius of influence from the center of a particle to
    'Smoothing Radius': 20,
    'Viscosity Strength': 0.06,
    'Pressure Scale': 500,
    'Near Pressure Scale': 18,
    'Target Density': 55,
    // The bounce dampening on a non-fluid particle
    Damping: 0.95,
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

  // These buffers will be used across our compute shaders, but need to be defined for the renderer as well
  const particlePositionsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const particleVelocitiesBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

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

  const particleRenderer = new ParticleRenderer({
    device,
    numParticles: settings['Total Particles'],
    positionsBuffer: particlePositionsBuffer,
    velocitiesBuffer: particleVelocitiesBuffer,
    presentationFormat,
    _renderPassDescriptor: renderPassDescriptor,
  });

  /* Various Shared Compute Shader Resources */
  const predictedPositionsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const densitiesBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // General uniforms including the number of particles, deltaTime, etc
  const generalUniformsBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Simulation specific uniforms
  const particlePropertiesUniformsBuffer = device.createBuffer({
    // damping, gravity, smoothing_radius, target_density, standard_pressure_multiplier, near_pressure_multiplier, viscosity_strength
    size: Float32Array.BYTES_PER_ELEMENT * 7,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
  });

  // Uniforms that help define the scaling factors for smooth and spike distributions
  // Changes whenever settings['Smoothing Radius'] changes
  const distributionUniformsBuffer = device.createBuffer({
    // poly6_scale, spike_pow3_scale, spike_pow2_scale, spike_pow3_derivative_scale, spike_pow2_derivative_scale,
    size: Float32Array.BYTES_PER_ELEMENT * 5,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  /* POSITIONS COMPUTE SHADER */

  // Same as particleStorageBGCluster but resources are read_write
  const particleMovementStorageBGCluster = createBindGroupCluster({
    device: device,
    label: 'ComputePositions.storageBGCluster',
    bindings: [0, 1, 2, 3],
    visibilities: [GPUShaderStage.COMPUTE],
    resourceTypes: ['buffer', 'buffer', 'buffer', 'buffer'],
    resourceLayouts: [
      { type: 'storage' },
      { type: 'storage' },
      { type: 'storage' },
      { type: 'storage' },
    ],
    resources: [
      [
        { buffer: particlePositionsBuffer }, //0
        { buffer: particleVelocitiesBuffer }, //1
        { buffer: predictedPositionsBuffer }, //2
        { buffer: densitiesBuffer }, //3
      ],
    ],
  });

  const particlePropertiesUniformsBGCluster = createBindGroupCluster({
    device: device,
    label: 'ComputePositions.uniformsBGCluster',
    bindings: [0, 1, 2],
    visibilities: [GPUShaderStage.COMPUTE],
    resourceTypes: ['buffer', 'buffer', 'buffer'],
    resourceLayouts: [
      { type: 'uniform' },
      { type: 'uniform' },
      { type: 'uniform' },
    ],
    resources: [
      [
        { buffer: generalUniformsBuffer },
        { buffer: particlePropertiesUniformsBuffer },
        { buffer: distributionUniformsBuffer },
      ],
    ],
  });

  const pipelineLayoutWithoutSort = [
    particleMovementStorageBGCluster.bindGroupLayout,
    particlePropertiesUniformsBGCluster.bindGroupLayout,
  ];

  const positionsComputePipeline = device.createComputePipeline({
    label: 'ComputePositions.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutWithoutSort,
    }),
    compute: {
      module: device.createShaderModule({
        label: 'ComputePositions.computeShader',
        code: positionsWGSL + commonWGSL,
      }),
      entryPoint: 'computeMain',
    },
  });

  /* GPU SORT PIPELINE */
  // Create buffers, workgroup and invocation numbers
  const sortResource = createSpatialSortResource({
    device,
    numParticles: settings['Total Particles'],
    createStagingBuffers: false,
  });

  const pipelineLayoutOnlySort = [
    sortResource.dataStorageBGCluster.bindGroupLayout,
    sortResource.algoStorageBGCluster.bindGroupLayout,
  ];

  const pipelineLayoutWithSort = [
    particleMovementStorageBGCluster.bindGroupLayout,
    particlePropertiesUniformsBGCluster.bindGroupLayout,
    sortResource.dataStorageBGCluster.bindGroupLayout,
  ];

  // Create spatialIndices sort pipelines
  const sortSpatialIndicesPipeline = device.createComputePipeline({
    label: 'SpatialInfoSort.sortSpatialIndices.computePipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutOnlySort,
    }),
    compute: {
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        code: sortWGSL + commonWGSL,
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
        code: offsetsWGSL + commonWGSL,
      }),
    },
  });

  // Process that actually executes the sort and the pipeline
  // Either the provide the buffer with initial values, or write to it from a previous shader
  const computeSpatialInformation = (args: ComputeSpatialInformationArgs) => {
    const { device, commandEncoder, initialValues } = args;
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

    if (initialValues) {
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
    }

    // We calculate the numSteps for a single complete pass of the bitonic sort because it allows the user to better debug where in the shader (i.e in which step)
    // something is going wrong
    for (let i = 0; i < sortResource.stepsInSort; i++) {
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
      if (sortResource.spatialIndicesStagingBuffer) {
        // Copy the result of the sort to the staging buffer
        commandEncoder.copyBufferToBuffer(
          sortResource.spatialIndicesBuffer,
          0,
          sortResource.spatialIndicesStagingBuffer,
          0,
          sortResource.spatialIndicesBufferSize
        );
      }
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
    if (sortResource.spatialOffsetsStagingBuffer) {
      commandEncoder.copyBufferToBuffer(
        sortResource.spatialOffsetsBuffer,
        0,
        sortResource.spatialOffsetsStagingBuffer,
        0,
        Uint32Array.BYTES_PER_ELEMENT * settings['Total Particles']
      );
    }
  };

  /* SPATIAL HASH PIPELINE */
  const spatialHashPipeline = device.createComputePipeline({
    label: 'ComputeSpatialHash.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutWithSort,
    }),
    compute: {
      // TODO: Remove after Chrome 121
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        label: 'ComputeSpatialHash.shaderModule',
        code: spatialHashWGSL + commonWGSL,
      }),
    },
  });

  /* DENSITY PIPELINE */
  const densityPipeline = device.createComputePipeline({
    label: 'ComputeDensity.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutWithSort,
    }),
    compute: {
      // TODO: Remove after Chrome 121
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        label: 'ComputeDensity.shaderModule',
        code: densityWGSL + commonWGSL,
      }),
    },
  });

  /* PRESSURE PIPELINE */
  const pressurePipeline = device.createComputePipeline({
    label: 'ComputePressure.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutWithSort,
    }),
    compute: {
      // TODO: Remove after Chrome 121
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        label: 'ComputePressure.shaderModule',
        code: densityWGSL + commonWGSL,
      }),
    },
  });

  /* VISCOSITY PIPELINE */
  const viscosityPipeline = device.createComputePipeline({
    label: 'ComputeViscosity.pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: pipelineLayoutWithSort,
    }),
    compute: {
      // TODO: Remove after Chrome 121
      entryPoint: 'computeMain',
      module: device.createShaderModule({
        label: 'ComputeViscosity.shaderModule',
        code: viscosityWGSL + commonWGSL,
      }),
    },
  });

  const runPipeline = (
    commandEncoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    includeSortInfo: boolean,
  ) => {
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, particleMovementStorageBGCluster.bindGroups[0]);
    passEncoder.setBindGroup(
      1,
      particlePropertiesUniformsBGCluster.bindGroups[0]
    );
    if (includeSortInfo) {
      passEncoder.setBindGroup(
        2,
        sortResource.dataStorageBGCluster.bindGroups[0]
      );
    }
    passEncoder.dispatchWorkgroups(
      Math.ceil(settings['Total Particles'] / maxWorkgroupSizeX)
    );
    passEncoder.end();
  };

  generateParticles();

  const simulationFolder = gui.addFolder('Simulation');
  simulationFolder.add(settings, 'simulate');
  simulationFolder.add(settings, 'Delta Time', 0.01, 0.5).step(0.01);
  simulationFolder.add(settings, 'Gravity', -20.0, 20.0).step(0.1);

  const particleFolder = gui.addFolder('Particle');
  particleFolder.add(settings, 'Particle Radius', 0.0, 300.0).step(1.0);
  particleFolder
    .add(settings, 'Smoothing Radius', 0.0, 1.0)
    .step(0.01)
    .onChange(() => {
      settings.writeToDistributionBuffer = true;
    });
  gui.add(settings, 'Damping', 0.0, 1.0).step(0.1);

  const physicsFolder = gui.addFolder('Physics (!)');
  physicsFolder.add(settings, 'Target Density', 1, 100);
  physicsFolder.add(settings, 'Pressure Scale', 1, 1000);
  physicsFolder.add(settings, 'Near Pressure Scale', 1, 50);
  physicsFolder.add(settings, 'Viscosity Strength', 0.001, 0.1).step(0.001);

  // Initial write to main storage buffers
  device.queue.writeBuffer(particlePositionsBuffer, 0, inputPositionsData);
  device.queue.writeBuffer(particleVelocitiesBuffer, 0, inputVelocitiesData);
  device.queue.writeBuffer(predictedPositionsBuffer, 0, inputPositionsData);

  let smoothPoly6Scale =
    4 / (Math.PI * Math.pow(settings['Smoothing Radius'], 8));
  let spikePow3Scale =
    10 / (Math.PI * Math.pow(settings['Smoothing Radius'], 5));
  let spikePow2Scale =
    6 / (Math.PI * Math.pow(settings['Smoothing Radius'], 4));
  let spikePow3DerivativeScale =
    30 / (Math.pow(settings['Smoothing Radius'], 5) * Math.PI);
  let spikePow2DerivativeScale =
    12 / (Math.pow(settings['Smoothing Radius'], 4) * Math.PI);

  // Initial write to distribution uniforms
  device.queue.writeBuffer(
    distributionUniformsBuffer,
    0,
    new Float32Array([
      smoothPoly6Scale,
      spikePow3Scale,
      spikePow2Scale,
      spikePow3DerivativeScale,
      spikePow2DerivativeScale,
    ])
  );

  // Create initial algorithmic info that begins our per frame bitonic sort
  const initialAlgoInfo = new Uint32Array([
    1, // starts at 1
    2, // starts at 2
    2, // starts at 2
    sortResource.workgroupsToDispatch, // particles / maxWorkgroupSize
  ]);

  async function frame() {
    if (!pageState.active) return;

    stats.begin();

    // Write to general uniforms buffer
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

    // Write to particle properties buffer
    device.queue.writeBuffer(
      particlePropertiesUniformsBuffer,
      0,
      new Float32Array([
        settings.Damping,
        settings.Gravity,
        settings['Smoothing Radius'],
        settings['Target Density'],
        settings['Pressure Scale'],
        settings['Near Pressure Scale'],
        settings['Viscosity Strength'],
      ])
    );

    // Write to distribution buffer when our smoothing radius changes
    if (settings.writeToDistributionBuffer) {
      smoothPoly6Scale =
        4 / (Math.PI * Math.pow(settings['Smoothing Radius'], 8));
      spikePow3Scale =
        10 / (Math.PI * Math.pow(settings['Smoothing Radius'], 5));
      spikePow2Scale =
        6 / (Math.PI * Math.pow(settings['Smoothing Radius'], 4));
      spikePow3DerivativeScale =
        30 / (Math.pow(settings['Smoothing Radius'], 5) * Math.PI);
      spikePow2DerivativeScale =
        12 / (Math.pow(settings['Smoothing Radius'], 4) * Math.PI);
      // I
      device.queue.writeBuffer(
        distributionUniformsBuffer,
        0,
        new Float32Array([
          smoothPoly6Scale,
          spikePow3Scale,
          spikePow2Scale,
          spikePow3DerivativeScale,
          spikePow2DerivativeScale,
        ])
      );
    }

    particleRenderer.writeUniforms(device, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      particleRadius: settings['Particle Radius'],
    });

    // Write initial algorithm information to algo buffer within our sort object
    device.queue.writeBuffer(
      sortResource.algoStorageBuffer,
      0,
      initialAlgoInfo.buffer,
      initialAlgoInfo.byteOffset,
      initialAlgoInfo.byteLength
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();

    if (settings.simulate) {
      // Compute Spatial Hash (index, hash, key)
      runPipeline(commandEncoder, spatialHashPipeline, true);
      // Sort Spatial Indices (index, hash, key) and compute offsets
      computeSpatialInformation({
        device,
        commandEncoder,
      });
      runPipeline(commandEncoder, densityPipeline, true);
      runPipeline(commandEncoder, pressurePipeline, true);
      runPipeline(commandEncoder, viscosityPipeline, true);
      runPipeline(commandEncoder, positionsComputePipeline, false);
    }

    particleRenderer.render(commandEncoder);

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
      // Main files
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: 'common.wgsl',
        contents: commonWGSL,
      },
      {
        name: 'utils.ts',
        contents: require('!!raw-loader!./utils.ts').default,
      },
      // Render files
      {
        name: './render/particle.wgsl',
        contents: particleWGSL,
      },
      {
        name: './render/renderParticle.ts',
        contents: require('!!raw-loader!./render/renderParticle.ts').default,
      },
      // Sort files
      {
        name: './sort/sort.wgsl',
        contents: sortWGSL,
      },
      {
        name: './sort/offsets.wgsl',
        contents: offsetsWGSL,
      },
      {
        name: './sort/types.ts',
        contents: require('!!raw-loader!./sort/types.ts').default,
      },
      // Compute files
      {
        name: './compute/spatialHash.wgsl',
        contents: spatialHashWGSL,
      },
      {
        name: './compute/positions.wgsl',
        contents: positionsWGSL,
      },
      {
        name: './density.wgsl',
        contents: densityWGSL,
      },
    ],
    filename: __filename,
  });

export default fluidExample;
