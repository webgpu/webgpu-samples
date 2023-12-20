import { makeSample, SampleInit } from '../../components/SampleLayout';
import {
  createBindGroupCluster,
  extractGPUData,
  generateParticleData,
  SimulateState,
  DebugPropertySelect,
  DistributionSettings,
  calculateDistributionScales,
} from './utils';
import { createSpatialSortResource, StepEnum } from './sort/types';
import sortWGSL from './sort/sort.wgsl';
import offsetsWGSL from './sort/offsets.wgsl';
import commonWGSL from './common.wgsl';
import spatialHashWGSL from './compute/spatialHash.wgsl';
import renderParticleWGSL from './render/renderParticle.wgsl';
import renderDensityWGSL from './render/renderDensity.wgsl';
import positionsWGSL from './compute/positions.wgsl';
import densityWGSL from './compute/density.wgsl';
import viscosityWGSL from './compute/viscosity.wgsl';
import pressureWGSL from './compute/pressure.wgsl';
import externalForcesWGSL from './compute/externalForces.wgsl';
import ParticleRenderer, { ParticleRenderMode } from './render/render';
import Input, { createInputHandler } from '../cameras/input';

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
  const inputHandler = createInputHandler(window, canvas);

  // Bounds are somewhat odd, in the sense that dimensions are centered at 0,0, so canvas actually goes from -canvas.width to canvas.width
  const boundsSettings = {
    boundsX: 200 * 2,
    boundsY: 200 * 2,
  };

  const frameSettings = {
    deltaTime: 0.03,
    iterationsPerFrame: 1,
    stepFrame: false,
    simulate: false,
  };

  const cameraSettings = {
    zoomScaleX: 1 / (boundsSettings.boundsX * 0.5),
    zoomScaleY: 1 / (boundsSettings.boundsY * 0.5),
  };

  const settings = {
    // The gravity force applied to each particle
    Gravity: -9.8,
    // The total number of particles being simulated
    'Total Particles': 4096,
    // A fluid particle's display radius
    'Particle Radius': 10.0,
    cameraOffset: 0,
    writeToDistributionBuffer: false,
    // The radius of influence from the center of a particle to
    'Smoothing Radius': 0.35,
    'Viscosity Strength': 0.06,
    'Pressure Scale': 500,
    'Near Pressure Scale': 18,
    'Target Density': 55,
    // The bounce dampening on a non-fluid particle
    Damping: 0.95,
    'Debug Property': 'Positions',
    'Log Debug': () => {
      return;
    },
    'Log Dispatch Info': () => {
      return;
    },
    'Log Distribution Scales': () => {
      return;
    },
    'Reset Particles': () => {
      return;
    },
    'Simulate State': 'PAUSE',
    'Render Mode': 'STANDARD',
    // A boolean indicating whether the simulation is in the process of resetting
    smoothPoly6Scale: 4 / (Math.PI * Math.pow(0.35, 8)),
    spikePow3Scale: 10 / (Math.PI * Math.pow(0.35, 5)),
    spikePow2Scale: 6 / (Math.PI * Math.pow(0.35, 4)),
    spikePow3DerScale: 30 / (Math.pow(0.35, 5) * Math.PI),
    spikePow2DerScale: 12 / (Math.pow(0.35, 4) * Math.PI),
  };

  const distributionSettings: DistributionSettings =
    calculateDistributionScales(settings['Smoothing Radius'], 1.0);

  const updateCamera2D = (deltaTime: number, input: Input) => {
    if (input.digital.forward) {
      cameraSettings.zoomScaleX *= 1.001;
      cameraSettings.zoomScaleY *= 1.001;
    }
    if (input.digital.backward) {
      cameraSettings.zoomScaleX *= 0.999;
      cameraSettings.zoomScaleY *= 0.999;
    }
  };

  /* COMPUTE SHADER RESOURCE PREPARATION */

  // Positions, velocities, predicted_positions, and densities each represented by vec2<f32>
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
  // Note that our bitonic sort will execute fewer workgroups than our other pipelines
  // Since each invocation of the bitonic shader covers two elements
  const sortResource = createSpatialSortResource(
    device,
    settings['Total Particles']
  );

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
    layoutType:
      | 'WITH_SORT'
      | 'WITHOUT_SORT'
      | 'SORT_ONLY_INDICES'
      | 'SORT_ONLY_OFFSETS'
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
      case 'SORT_ONLY_INDICES':
        {
          passEncoder.setBindGroup(
            0,
            sortResource.dataStorageBGCluster.bindGroups[0]
          );
          passEncoder.setBindGroup(
            1,
            sortResource.algoStorageBGCluster.bindGroups[0]
          );
          passEncoder.dispatchWorkgroups(
            sortResource.spatialIndicesWorkloadSize
          );
        }
        break;
      case 'SORT_ONLY_OFFSETS':
        {
          passEncoder.setBindGroup(
            0,
            sortResource.dataStorageBGCluster.bindGroups[0]
          );
          passEncoder.dispatchWorkgroups(
            sortResource.spatialOffsetsWorkloadSize
          );
        }
        break;
    }
    passEncoder.end();
  };

  // Compute pipeline Layouts
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

  // Compute Pipelines
  const externalForcesPipeline = createFluidComputePipeline(
    'ExternalForces',
    pipelineLayoutWithoutSort,
    externalForcesWGSL
  );
  const spatialHashPipeline = createFluidComputePipeline(
    'ComputeSpatialHash',
    pipelineLayoutWithSort,
    spatialHashWGSL
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

  const positionsPipeline = createFluidComputePipeline(
    'ComputePositions',
    pipelineLayoutWithoutSort,
    positionsWGSL
  );

  // Render Pipeline
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
    densitiesBuffer,
    presentationFormat,
    renderPassDescriptor,
  });

  // Create initial values for our storage buffers and init GUI
  // Generate positions data and velocities data for their respective buffers
  // Positions are set between -canvas.width, -canvas.height and canvas.width, canvas.height
  const { inputPositions, inputVelocities } = generateParticleData(
    settings['Total Particles'],
    -boundsSettings.boundsX / 2,
    -boundsSettings.boundsY / 2,
    boundsSettings.boundsX,
    boundsSettings.boundsY
  );

  const renderModes: ParticleRenderMode[] = ['STANDARD', 'DENSITY'];
  gui.add(settings, 'Render Mode', renderModes);

  const simulationFolder = gui.addFolder('Simulation');
  const simulateController = simulationFolder
    .add(frameSettings, 'simulate')
    .onChange(() => {
      if (frameSettings.simulate) {
        (settings['Simulate State'] as SimulateState) = 'RUN';
        return;
      }
      (settings['Simulate State'] as SimulateState) = 'PAUSE';
    });
  const stepFrameController = simulationFolder
    .add(frameSettings, 'stepFrame')
    .onChange(() => {
      if (frameSettings.stepFrame) {
        simulateController.setValue(true);
      }
    });
  simulationFolder.add(frameSettings, 'deltaTime', 0.01, 0.5).step(0.01);
  simulationFolder.add(settings, 'Gravity', -20.0, 20.0).step(0.1);

  const particleFolder = gui.addFolder('Particle');
  particleFolder.add(settings, 'Particle Radius', 0.0, 300.0).step(1.0);
  particleFolder
    .add(settings, 'Smoothing Radius', 0.1, 20.0)
    .step(0.01)
    .onChange(() => {
      settings.smoothPoly6Scale =
        4 / (Math.PI * Math.pow(settings['Smoothing Radius'], 8));
      settings.spikePow3Scale =
        10 / (Math.PI * Math.pow(settings['Smoothing Radius'], 5));
      settings.spikePow2Scale =
        6 / (Math.PI * Math.pow(settings['Smoothing Radius'], 4));
      settings.spikePow3DerScale =
        30 / (Math.pow(settings['Smoothing Radius'], 5) * Math.PI);
      settings.spikePow2DerScale =
        12 / (Math.pow(settings['Smoothing Radius'], 4) * Math.PI);
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
    'Spatial Offsets',
    'Spatial Indices',
  ] as DebugPropertySelect[]);
  debugFolder.add(settings, 'Log Debug').onChange(() => {
    console.log(settings['Debug Property']);
    switch (settings['Debug Property'] as DebugPropertySelect) {
      case 'Spatial Offsets':
        {
          extractGPUData(
            sortResource.spatialOffsetsStagingBuffer,
            sortResource.spatialOffsetsBuffer.size
          ).then((data) => {
            console.log(new Uint32Array(data));
            sortResource.spatialOffsetsStagingBuffer.unmap();
          });
        }
        break;
      case 'Spatial Indices':
        {
          extractGPUData(
            sortResource.spatialIndicesStagingBuffer,
            sortResource.spatialIndicesBuffer.size
          ).then((data) => {
            console.log(new Uint32Array(data));
            sortResource.spatialIndicesStagingBuffer.unmap();
          });
        }
        break;
      default:
        {
          extractGPUData(
            fluidPropertiesStagingBuffer,
            fluidPropertyStorageBufferSize
          ).then((data) => {
            console.log(new Float32Array(data));
            fluidPropertiesStagingBuffer.unmap();
          });
        }
        break;
    }
  });
  debugFolder.add(settings, 'Log Dispatch Info').onChange(() => {
    console.log(
      `Invocations Per Workgroup: ${
        device.limits.maxComputeWorkgroupSizeX
      }\nWorkgroups Per Particle Property Calc: ${
        settings['Total Particles'] / 256
      }\nWorkgroups Per Spatial Indices Sort: ${
        sortResource.spatialIndicesWorkloadSize
      }\nWorkgroups Per Spatial Offsets Calc: ${
        sortResource.spatialOffsetsWorkloadSize
      }`
    );
  });
  debugFolder.add(settings, 'Log Distribution Scales').onChange(() => {
    console.log(
      `Smooth Poly 6 Scale: ${settings.smoothPoly6Scale}\nSpike Pow 3 Scale: ${settings.spikePow3Scale}\nSpike Pow 3 Derivative Scale: ${settings.spikePow3DerScale}\nSpike Pow 2 Scale:${settings.spikePow2Scale}\nSpike Pow 2 Derivative Scale:${settings.spikePow2DerScale}`
    );
  });

  // Initial 'write to main storage buffers
  device.queue.writeBuffer(positionsBuffer, 0, inputPositions);
  device.queue.writeBuffer(velocitiesBuffer, 0, inputVelocities);
  device.queue.writeBuffer(predictedPositionsBuffer, 0, inputPositions);

  // Create initial algorithmic info that begins our per frame bitonic sort
  const initialAlgoInfo = new Uint32Array([
    StepEnum['FLIP_LOCAL'], // algo
    2, // stepHeight
    2, // highHeight
    sortResource.spatialIndicesWorkloadSize, // dispatchSize
  ]);

  async function frame() {
    if (!pageState.active) return;
    updateCamera2D(frameSettings.deltaTime, inputHandler());

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
        frameSettings.deltaTime,
        boundsSettings.boundsX,
        boundsSettings.boundsY,
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

    // Write to distribution uniforms buffer
    device.queue.writeBuffer(
      distributionUniformsBuffer,
      0,
      new Float32Array([
        settings.smoothPoly6Scale,
        settings.spikePow3Scale,
        settings.spikePow2Scale,
        settings.spikePow3DerScale,
        settings.spikePow2DerScale,
      ])
    );

    particleRenderer.writeUniforms(device, {
      zoomScaleX: cameraSettings.zoomScaleX,
      zoomScaleY: cameraSettings.zoomScaleY,
      particleRadius: settings['Particle Radius'],
      targetDensity: settings['Target Density'],
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

    if (settings['Simulate State'] === 'RESET') {
      //device.qu
    }

    const commandEncoder = device.createCommandEncoder();

    if (settings['Simulate State'] === 'RUN') {
      runPipeline(commandEncoder, externalForcesPipeline, 'WITHOUT_SORT');
      runPipeline(commandEncoder, spatialHashPipeline, 'WITH_SORT');
      for (let i = 0; i < sortResource.stepsInSort; i++) {
        runPipeline(
          commandEncoder,
          sortSpatialIndicesPipeline,
          'SORT_ONLY_INDICES'
        );
      }
      runPipeline(
        commandEncoder,
        computeSpatialOffsetsPipeline,
        'SORT_ONLY_OFFSETS'
      );
      runPipeline(commandEncoder, densityPipeline, 'WITH_SORT');
      runPipeline(commandEncoder, pressurePipeline, 'WITH_SORT');
      runPipeline(commandEncoder, viscosityPipeline, 'WITH_SORT');
      runPipeline(commandEncoder, positionsPipeline, 'WITHOUT_SORT');
      if (frameSettings.stepFrame) {
        stepFrameController.setValue(false);
        simulateController.setValue(false);
      }
    }

    particleRenderer.render(commandEncoder, settings['Render Mode']);

    switch (settings['Debug Property'] as DebugPropertySelect) {
      case 'Positions':
        {
          commandEncoder.copyBufferToBuffer(
            positionsBuffer,
            0,
            fluidPropertiesStagingBuffer,
            0,
            positionsBuffer.size
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
      case 'Spatial Indices':
        {
          commandEncoder.copyBufferToBuffer(
            sortResource.spatialIndicesBuffer,
            0,
            sortResource.spatialIndicesStagingBuffer,
            0,
            sortResource.spatialIndicesBuffer.size
          );
        }
        break;
      case 'Spatial Offsets':
        {
          commandEncoder.copyBufferToBuffer(
            sortResource.spatialOffsetsBuffer,
            0,
            sortResource.spatialOffsetsStagingBuffer,
            0,
            sortResource.spatialOffsetsBuffer.size
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
        name: './render/renderParticle.wgsl',
        contents: renderParticleWGSL,
      },
      {
        name: './render/renderDensity.wgsl',
        contents: renderDensityWGSL,
      },
      {
        name: './render/render.ts',
        contents: require('!!raw-loader!./render/render.ts').default,
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
