import { makeSample, SampleInit } from '../../components/SampleLayout';
import {
  createBindGroupCluster,
  extractGPUData,
  generateParticleData,
  SimulateState,
  DebugPropertySelect,
  DistributionSettings,
  calculateDistributionScales,
  SpatialIndicesDebugPropertySelect,
} from './utils';
import { SampleInitFactoryWebGPU } from '../bitonicSort/utils';
import { createSpatialSortResource, StepEnum } from './fluidSort/types';
import * as FluidCompute from './fluidCompute';
import sortWGSL from './fluidSort/sort.wgsl';
import offsetsWGSL from './fluidSort/offsets.wgsl';
import clearOffsetsWGSL from './fluidSort/clearOffsets.wgsl';
import commonWGSL from './common.wgsl';
import renderParticleWGSL from './fluidRender/renderParticle.wgsl';
import renderDensityWGSL from './fluidRender/renderDensity.wgsl';
import ParticleRenderer, { ParticleRenderMode } from './fluidRender/render';
import Input, { createInputHandler } from '../cameras/input';

type PipelineBGLayoutType =
  | 'WITH_SORT'
  | 'WITHOUT_SORT'
  | 'SORT_ONLY_WITH_ALGO_INFO'
  | 'SORT_ONLY_WITHOUT_ALGO_INFO';

const particleMass = 2.0;
const viscosity = 200;
const gasConstant = 2000;
const restDensity = 300;
const boundDamping = -0.5;
// Both smoothingRadius and visual radius
const radius = 2;

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({
    pageState,
    device,
    gui,
    presentationFormat,
    context,
    canvas,
    stats,
  }) => {
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

    const sphSettings = {
      mass: 0.02,
      restingDensity: 1000,
      gasConst: 1,
      viscosity: 1.04,
      // The radius of a particle's influence from its center to its edge
      smoothingRadius: 0.15,
      gravity: -9.8,
      surfaceTension: 0.2,
    };

    const settings = {
      // The gravity force applied to each particle
      Gravity: -9.8,
      // The total number of particles being simulated
      'Total Particles': 4096,
      // A fluid particle's display radius
      'Particle Radius': 2,
      cameraOffset: 0,
      writeToDistributionBuffer: false,
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
      calculateDistributionScales(sphSettings.smoothingRadius, 1.0);

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
    const positionsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const velocitiesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const currentForcesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const pressuresBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'],
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    const densitiesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'],
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC,
    });
    // Staging buffer for positionsBuffer, velocitiesBuffer, and currentForcesBuffer.
    const particleStatingBufferVec2 = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'] * 2,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    // Staging buffer for pressuresBuffer, densitiesBuffer.
    const particleStatingBufferVec1 = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings['Total Particles'],
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    //UNIFORMS
    // General uniforms including the number of particles, deltaTime, etc
    const generalUniformsBuffer = device.createBuffer({
      // numParticles, deltaTime, boundsX, boundsY
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    //SPHSettings sphSettings(0.02f, 1000, 1, 1.04f, 0.15f, -9.8f, 0.2f);

    // Bind storage buffers and uniforms buffers to their own bind groups
    const particleStorageBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleStorage.bgCluster',
      bindings: [0, 1, 2, 3, 4],
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
          // @group(0) @binding(0)
          { buffer: positionsBuffer },
          // @group(0) @binding(1)
          { buffer: velocitiesBuffer },
          // @group(0) @binding(2)
          { buffer: currentForcesBuffer },
          // @group(0) @binding(3)
          { buffer: densitiesBuffer },
          // @group(0) @binding(4)
          { buffer: pressuresBuffer },
        ],
      ],
    });

    const particleUniformsBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleUniforms.bgCluster',
      bindings: [0],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer'],
      resourceLayouts: [{ type: 'uniform' }],
      // @group(1) @binding(0)
      resources: [[{ buffer: generalUniformsBuffer }]],
    });

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
      layoutType: PipelineBGLayoutType
    ) => {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      switch (layoutType) {
        case 'WITH_SORT':
          {
            passEncoder.setBindGroup(0, particleStorageBGCluster.bindGroups[0]);
            passEncoder.setBindGroup(
              1,
              particleUniformsBGCluster.bindGroups[0]
            );
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
            passEncoder.setBindGroup(
              1,
              particleUniformsBGCluster.bindGroups[0]
            );
            passEncoder.dispatchWorkgroups(
              Math.ceil(settings['Total Particles'] / maxWorkgroupSizeX)
            );
          }
          break;
        case 'SORT_ONLY_WITH_ALGO_INFO':
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

    // Standard pipeline layout of storage and uniform buffers
    // without any of the sort resources.
    const pipelineLayoutWithoutSort = [
      particleStorageBGCluster.bindGroupLayout,
      particleUniformsBGCluster.bindGroupLayout,
    ];

    // Standard pipeline layout of storage and uniform buffers
    // with the sort data resources.
    const pipelineLayoutWithSort = [
      particleStorageBGCluster.bindGroupLayout,
      particleUniformsBGCluster.bindGroupLayout,
      sortResource.dataStorageBGCluster.bindGroupLayout,
    ];

    // Only the sort resources alongside sort algorithm info.
    const pipelineLayoutSortOnlyWithAlgoInfo = [
      sortResource.dataStorageBGCluster.bindGroupLayout,
      sortResource.algoStorageBGCluster.bindGroupLayout,
    ];

    // Only the sort resources themselves (i.e spatialIndices and spatialOffsets)
    const pipelineLayoutSortOnlyWithoutAlgoInfo = [
      sortResource.dataStorageBGCluster.bindGroupLayout,
    ];

    // Compute Pipelines
    const externalForcesPipeline = createFluidComputePipeline(
      'ExternalForces',
      pipelineLayoutWithoutSort,
      FluidCompute.externalForcesShader
    );
    const clearSpatialOffsetsPipeline = createFluidComputePipeline(
      'ClearSpatialOffsets',
      pipelineLayoutSortOnlyWithoutAlgoInfo,
      clearOffsetsWGSL
    );
    const spatialHashPipeline = createFluidComputePipeline(
      'ComputeSpatialHash',
      pipelineLayoutWithSort,
      FluidCompute.spatialHashShader
    );
    const sortSpatialIndicesPipeline = createFluidComputePipeline(
      `SortSpatialIndices`,
      pipelineLayoutSortOnlyWithAlgoInfo,
      sortWGSL
    );
    const computeSpatialOffsetsPipeline = createFluidComputePipeline(
      'ComputeSpatialOffsets',
      pipelineLayoutSortOnlyWithoutAlgoInfo,
      offsetsWGSL
    );
    const densityPipeline = createFluidComputePipeline(
      'ComputeDensity',
      pipelineLayoutWithSort,
      FluidCompute.densityShader
    );
    const pressurePipeline = createFluidComputePipeline(
      'ComputePressure',
      pipelineLayoutWithSort,
      FluidCompute.pressureShader
    );
    const viscosityPipeline = createFluidComputePipeline(
      'ComputeViscosity',
      pipelineLayoutWithSort,
      FluidCompute.viscosityShader
    );

    const positionsPipeline = createFluidComputePipeline(
      'ComputePositions',
      pipelineLayoutWithoutSort,
      FluidCompute.positionsShader
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
      .add(sphSettings, 'smoothingRadius', 0.1, 20.0)
      .step(0.01)
      .onChange(() => {
        settings.smoothPoly6Scale =
          4 / (Math.PI * Math.pow(sphSettings.smoothingRadius, 8));
        settings.spikePow3Scale =
          10 / (Math.PI * Math.pow(sphSettings.smoothingRadius, 5));
        settings.spikePow2Scale =
          6 / (Math.PI * Math.pow(sphSettings.smoothingRadius, 4));
        settings.spikePow3DerScale =
          30 / (Math.pow(sphSettings.smoothingRadius, 5) * Math.PI);
        settings.spikePow2DerScale =
          12 / (Math.pow(sphSettings.smoothingRadius, 4) * Math.PI);
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
      'Spatial Indices (Idx)',
      'Spatial Indices (Hash)',
      'Spatial Indices (Key)',
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
        case 'Spatial Indices (Idx)':
        case 'Spatial Indices (Hash)':
        case 'Spatial Indices (Key)':
          {
            extractGPUData(
              sortResource.spatialIndicesStagingBuffer,
              sortResource.spatialIndicesBuffer.size
            ).then((data) => {
              const arr = new Uint32Array(data);
              switch (
                settings['Debug Property'] as SpatialIndicesDebugPropertySelect
              ) {
                case 'Spatial Indices':
                  {
                    console.log(arr);
                  }
                  break;
                case 'Spatial Indices (Idx)':
                  {
                    const output = [];
                    for (let i = 0; i < arr.length; i += 3) {
                      output.push(arr[i]);
                    }
                    console.log(output);
                  }
                  break;
                case 'Spatial Indices (Hash)':
                  {
                    const output = [];
                    for (let i = 1; i < arr.length; i += 3) {
                      output.push(arr[i]);
                    }
                    console.log(output);
                  }
                  break;
                case 'Spatial Indices (Key)':
                  {
                    const output = [];
                    for (let i = 2; i < arr.length; i += 3) {
                      output.push(arr[i]);
                    }
                    console.log(output);
                  }
                  break;
              }
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
          sphSettings.smoothingRadius,
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
        // Calculate external forces
        runPipeline(commandEncoder, externalForcesPipeline, 'WITHOUT_SORT');
        // Clear the spatialOffsets so our spatialHash can execute properly
        // TODO: Does this need to be its own pipeline?
        runPipeline(
          commandEncoder,
          clearSpatialOffsetsPipeline,
          'SORT_ONLY_WITHOUT_ALGO_INFO'
        );
        // Calculate the cell index hash for each particle
        runPipeline(commandEncoder, spatialHashPipeline, 'WITH_SORT');
        for (let i = 0; i < sortResource.stepsInSort; i++) {
          runPipeline(
            commandEncoder,
            sortSpatialIndicesPipeline,
            'SORT_ONLY_WITH_ALGO_INFO'
          );
        }
        runPipeline(
          commandEncoder,
          computeSpatialOffsetsPipeline,
          'SORT_ONLY_WITHOUT_ALGO_INFO'
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
        case 'Spatial Indices (Hash)':
        case 'Spatial Indices (Key)':
        case 'Spatial Indices (Idx)':
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
  }
).then((resultInit) => (init = resultInit));

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
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./utils.ts').default,
      },
      // Render files
      {
        name: './fluidRender/renderParticle.wgsl',
        contents: renderParticleWGSL,
      },
      {
        name: './fluidRender/renderDensity.wgsl',
        contents: renderDensityWGSL,
      },
      {
        name: './fluidRender/render.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./fluidRender/render.ts').default,
      },
      // Sort files
      {
        name: './fluidSort/sort.wgsl',
        contents: sortWGSL,
      },
      {
        name: './fluidSort/offsets.wgsl',
        contents: offsetsWGSL,
      },
      {
        name: './fluidSort/types.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./fluidSort/types.ts').default,
      },
      // Compute files
      {
        name: './fluidCompute/externalForces.wgsl',
        contents: FluidCompute.externalForcesShader,
      },
      {
        name: './fluidCompute/spatialHash.wgsl',
        contents: FluidCompute.spatialHashShader,
      },
      {
        name: './fluidCompute/density.wgsl',
        contents: FluidCompute.densityShader,
      },
      {
        name: './fluidCompute/pressure.wgsl',
        contents: FluidCompute.pressureShader,
      },
      {
        name: './fluidCompute/viscosity.wgsl',
        contents: FluidCompute.viscosityShader,
      },
      {
        name: './fluidCompute/positions.wgsl',
        contents: FluidCompute.positionsShader,
      },
      {
        name: './fluidCompute/index.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./fluidCompute/index.ts').default,
      },
    ],
    filename: __filename,
  });

export default fluidExample;
