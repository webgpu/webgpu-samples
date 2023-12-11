import { makeSample, SampleInit } from '../../components/SampleLayout';
import { createBindGroupCluster, extractGPUData } from './utils';
import { createSpatialSortResource, StepEnum } from './sort/types';
import sortWGSL from './sort/sort.wgsl';
import offsetsWGSL from './sort/offsets.wgsl';
import commonWGSL from './common.wgsl';
import spatialHashWGSL from './compute/spatialHash.wgsl';
import particleWGSL from './render/particle.wgsl';
import positionsWGSL from './compute/positions.wgsl';
import densityWGSL from './compute/density.wgsl';
import viscosityWGSL from './compute/viscosity.wgsl';
import pressureWGSL from './compute/pressure.wgsl';
import externalForcesWGSL from './compute/externalForces.wgsl';
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
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });
  const maxWorkgroupSizeX = device.limits.maxComputeWorkgroupSizeX;

  let debugBuffer;

  type DebugPropertySelect =
    | 'Positions'
    | 'Velocities'
    | 'Predicted Positions'
    | 'Densities';

  const settings = {
    // The gravity force applied to each particle
    Gravity: -9.8,
    'Delta Time': 0.4,
    // The total number of particles being simulated
    'Total Particles': 2048,
    // A fluid particle's display radius
    'Particle Radius': 10.0,
    writeToDistributionBuffer: false,
    iterationsPerFrame: 1,
    // The radius of influence from the center of a particle to
    'Smoothing Radius': 0.35,
    'Viscosity Strength': 0.06,
    'Pressure Scale': 500,
    'Near Pressure Scale': 18,
    'Target Density': 55,
    stepFrame: false,
    // The bounce dampening on a non-fluid particle
    Damping: 0.95,
    'Debug Property': 'Positions',
    'Log Debug': () => {
      return;
    },
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
  // Positions are set between -canvas.width, -canvas.height and canvas.width, canvas.height
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

  const fluidPropertyStorageBufferSize =
    Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2;
  const fluidPropertyStorageBufferDescriptor: GPUBufferDescriptor = {
    size: fluidPropertyStorageBufferSize,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  };

  // Create necessary resources for shader, first storage buffers, then uniforms buffers
  // STORAGE
  const positionsBuffer = device.createBuffer(
    fluidPropertyStorageBufferDescriptor
  );
  const velocitiesBuffer = device.createBuffer(
    fluidPropertyStorageBufferDescriptor
  );
  const predictedPositionsBuffer = device.createBuffer(
    fluidPropertyStorageBufferDescriptor
  );
  const densitiesBuffer = device.createBuffer(
    fluidPropertyStorageBufferDescriptor
  );
  const fluidPropertiesStagingBuffer = device.createBuffer({
    size: fluidPropertyStorageBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  //UNIFORMS
  // General uniforms including the number of particles, deltaTime, etc
  const generalUniformsBuffer = device.createBuffer({
    // numParticles, deltaTime, boundsX, boundsY
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

  // Bind storage buffers and uniforms buffers to their own bind groups
  const particleStorageBGCluster = createBindGroupCluster({
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
        { buffer: positionsBuffer }, //0
        { buffer: velocitiesBuffer }, //1
        { buffer: predictedPositionsBuffer }, //2
        { buffer: densitiesBuffer }, //3
      ],
    ],
  });

  const particleUniformsBGCluster = createBindGroupCluster({
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

  // Finally, last part of resource creation is creating bitonic sort resoruces
  const sortResource = createSpatialSortResource({
    device,
    numParticles: settings['Total Particles'],
    createStagingBuffers: false,
  });

  // Now, we can write some utilities to create our compute pipelines
  const createFluidComputePipeline = (
    label: string,
    layout: GPUBindGroupLayout[],
    code: string
  ) => {
    return device.createComputePipeline({
      label: `${label}.computePipeline}`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: layout,
      }),
      compute: {
        // TODO: Remove after Chrome 121
        entryPoint: 'computeMain',
        module: device.createShaderModule({
          label: `${label}.shaderModule`,
          code: code + commonWGSL,
        }),
      },
    });
  };

  const runPipeline = (
    commandEncoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    layoutType: 'WITH_SORT' | 'WITHOUT_SORT' | 'SORT_ONLY'
  ) => {
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    switch (layoutType) {
      case 'WITH_SORT':
        {
          passEncoder.setBindGroup(0, particleStorageBGCluster.bindGroups[0]);
          passEncoder.setBindGroup(1, particleUniformsBGCluster.bindGroups[0]);
          passEncoder.setBindGroup(
            2,
            sortResource.dataStorageBGCluster.bindGroups[0]
          );
          passEncoder.dispatchWorkgroups(
            Math.ceil(settings['Total Particles'] / maxWorkgroupSizeX)
          );
        }
        break;
      case 'WITHOUT_SORT':
        {
          passEncoder.setBindGroup(0, particleStorageBGCluster.bindGroups[0]);
          passEncoder.setBindGroup(1, particleUniformsBGCluster.bindGroups[0]);
          passEncoder.dispatchWorkgroups(
            Math.ceil(settings['Total Particles'] / maxWorkgroupSizeX)
          );
        }
        break;
      case 'SORT_ONLY': {
        passEncoder.setBindGroup(
          0,
          sortResource.dataStorageBGCluster.bindGroups[0]
        );
        passEncoder.setBindGroup(
          1,
          sortResource.algoStorageBGCluster.bindGroups[0]
        );
        passEncoder.dispatchWorkgroups(sortResource.workgroupsToDispatch);
      }
    }
    passEncoder.end();
  };

  const pipelineLayoutWithoutSort = [
    particleStorageBGCluster.bindGroupLayout,
    particleUniformsBGCluster.bindGroupLayout,
  ];

  const pipelineLayoutWithSort = [
    particleStorageBGCluster.bindGroupLayout,
    particleUniformsBGCluster.bindGroupLayout,
    sortResource.dataStorageBGCluster.bindGroupLayout,
  ];

  const pipelineLayoutOnlySort = [
    sortResource.dataStorageBGCluster.bindGroupLayout,
    sortResource.algoStorageBGCluster.bindGroupLayout,
  ];

  const externalForcesPipeline = createFluidComputePipeline(
    'ExternalForces',
    pipelineLayoutWithoutSort,
    externalForcesWGSL
  );

  const positionsPipeline = createFluidComputePipeline(
    'ComputePositions',
    pipelineLayoutWithoutSort,
    positionsWGSL
  );

  const sortSpatialIndicesPipeline = createFluidComputePipeline(
    `SortSpatialIndices`,
    pipelineLayoutOnlySort,
    sortWGSL
  );

  const computeSpatialOffsetsPipeline = createFluidComputePipeline(
    'ComputeSpatialOffsets',
    [sortResource.dataStorageBGCluster.bindGroupLayout],
    offsetsWGSL
  );

  // Process that actually executes the sort and the pipeline
  // Either the provide the buffer with initial values, or write to it from a previous shader
  const computeSpatialInformation = (args: ComputeSpatialInformationArgs) => {
    const { commandEncoder } = args;
    // We calculate the numSteps for a single complete pass of the bitonic sort because it allows the user to better debug where in the shader (i.e in which step)
    // something is going wrong
    for (let i = 0; i < sortResource.stepsInSort; i++) {
      runPipeline(commandEncoder, sortSpatialIndicesPipeline, 'SORT_ONLY');
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

  // COMPUTE PIPELINES
  const spatialHashPipeline = createFluidComputePipeline(
    'ComputeSpatialHash',
    pipelineLayoutWithSort,
    spatialHashWGSL
  );
  const densityPipeline = createFluidComputePipeline(
    'ComputeDensity',
    pipelineLayoutWithSort,
    densityWGSL
  );
  const pressurePipeline = createFluidComputePipeline(
    'ComputePressure',
    pipelineLayoutWithSort,
    pressureWGSL
  );
  const viscosityPipeline = createFluidComputePipeline(
    'ComputeViscosity',
    pipelineLayoutWithSort,
    viscosityWGSL
  );

  // Create particle renderer
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
    positionsBuffer,
    velocitiesBuffer,
    presentationFormat,
    renderPassDescriptor,
  });

  // Create initial values for our storage buffers and init GUI
  generateParticles();

  const simulationFolder = gui.addFolder('Simulation');
  const simulateController = simulationFolder.add(settings, 'simulate');
  const stepFrameController = simulationFolder
    .add(settings, 'stepFrame')
    .onChange(() => {
      if (settings.stepFrame) {
        simulateController.setValue(true);
      }
    });
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

  const debugFolder = gui.addFolder('Debug');
  debugFolder.add(settings, 'Debug Property', [
    'Positions',
    'Velocities',
    'Predicted Positions',
    'Densities',
  ] as DebugPropertySelect[]);
  debugFolder.add(settings, 'Log Debug').onChange(() => {
    console.log('debug');
    extractGPUData(
      fluidPropertiesStagingBuffer,
      fluidPropertyStorageBufferSize
    ).then((data) => {
      console.log(new Float32Array(data));
      fluidPropertiesStagingBuffer.unmap();
    });
  });

  // Initial write to main storage buffers
  device.queue.writeBuffer(positionsBuffer, 0, inputPositionsData);
  device.queue.writeBuffer(velocitiesBuffer, 0, inputVelocitiesData);
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
    StepEnum['FLIP_LOCAL'], // algo
    2, // stepHeight
    2, // highHeight
    sortResource.workgroupsToDispatch, // dispatchSize
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
        canvas.width * 2 - settings['Particle Radius'],
        canvas.height * 2 - settings['Particle Radius'],
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
      runPipeline(commandEncoder, externalForcesPipeline, 'WITHOUT_SORT');
      runPipeline(commandEncoder, spatialHashPipeline, 'WITH_SORT');
      computeSpatialInformation({
        device,
        commandEncoder,
      });
      runPipeline(commandEncoder, densityPipeline, 'WITH_SORT');
      runPipeline(commandEncoder, pressurePipeline, 'WITH_SORT');
      runPipeline(commandEncoder, viscosityPipeline, 'WITH_SORT');
      runPipeline(commandEncoder, positionsPipeline, 'WITHOUT_SORT');
      if (settings.stepFrame) {
        stepFrameController.setValue(false);
        simulateController.setValue(false);
      }
    }

    particleRenderer.render(commandEncoder);

    switch (settings['Debug Property'] as DebugPropertySelect) {
      case 'Positions':
        {
          commandEncoder.copyBufferToBuffer(
            positionsBuffer,
            0,
            fluidPropertiesStagingBuffer,
            0,
            fluidPropertyStorageBufferSize
          );
        }
        break;
      case 'Velocities':
        {
          commandEncoder.copyBufferToBuffer(
            velocitiesBuffer,
            0,
            fluidPropertiesStagingBuffer,
            0,
            fluidPropertyStorageBufferSize
          );
        }
        break;
      case 'Densities':
        {
          commandEncoder.copyBufferToBuffer(
            densitiesBuffer,
            0,
            fluidPropertiesStagingBuffer,
            0,
            fluidPropertyStorageBufferSize
          );
        }
        break;
      case 'Predicted Positions':
        {
          commandEncoder.copyBufferToBuffer(
            predictedPositionsBuffer,
            0,
            fluidPropertiesStagingBuffer,
            0,
            fluidPropertyStorageBufferSize
          );
        }
        break;
    }

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
