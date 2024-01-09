import { makeSample, SampleInit } from '../../components/SampleLayout';
import {
  createBindGroupCluster,
  extractGPUData,
  generateParticleData,
  SimulateState,
  DebugPropertySelect,
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
import ParticleRenderer from './fluidRender/render';
import Input, { createInputHandler } from '../cameras/input';
import HashGridRenderer from './gridRender/render';

type PipelineBGLayoutType =
  | 'WITH_SORT'
  | 'WITHOUT_SORT'
  | 'SORT_ONLY_WITH_ALGO_INFO'
  | 'SORT_ONLY_WITHOUT_ALGO_INFO';

// SPH Fluids
// A continuous material such as a fluid is represented by discrete particles (i.e the fluid is 'discretized')
// A discrete particle's properties influence other particles' properties through kernel functions
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

    // Settings specifically related to controlling execution, if necessary
    const frameSettings = {
      deltaTime: 0.03,
      iterationsPerFrame: 1,
      stepFrame: false,
      simulate: false,
    };

    const settings = {
      // The total number of particles being simulated
      totalParticles: 4096,
      // A fluid particle's display and smoothing radius
      particleRadius: 1,
      // Width and height of the simulation bounding box
      boundingBoxSize: 200,
      // Min x and y coordinate of our bounding box
      boundsMin: -100,
      // boundsMax = boundsMin + boundingBoxSize
      'Debug Property': 'Positions',
      'Log Debug': () => {
        return;
      },
      'Log Dispatch Info': () => {
        return;
      },
    };
    // Diameter of a particle * 2;
    const cellSize = settings.particleRadius * 2 * 2;
    const cellsPerAxis =
      (settings.boundingBoxSize / cellSize) *
      (settings.boundingBoxSize / cellSize);
    const cellSettings = {
      // Number of cells in our hash grid
      cellsPerAxis,
      cellSize,
    };

    // Camera/zoom settings
    const cameraSettings = {
      zoomScaleX: 1 / (settings.boundingBoxSize * 0.5),
      zoomScaleY: 1 / (settings.boundingBoxSize * 0.5),
      cameraOffset: 0,
    };

    const updateCamera2D = (input: Input) => {
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
    // STORAGE
    const debuggableStorageUsage =
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC;
    const positionsBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles * 2,
      usage: debuggableStorageUsage,
    });
    const velocitiesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles * 2,
      usage: debuggableStorageUsage,
    });
    const currentForcesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles * 2,
      usage: debuggableStorageUsage,
    });
    const pressuresBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles,
      usage: debuggableStorageUsage,
    });
    const densitiesBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles,
      usage: debuggableStorageUsage,
    });
    // Staging buffer for positionsBuffer, velocitiesBuffer, and currentForcesBuffer.
    const particleStatingBufferVec2 = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles * 2,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    // Staging buffer for pressuresBuffer, densitiesBuffer.
    const particleStatingBufferVec1 = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * settings.totalParticles,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    //UNIFORMS
    // General uniforms including the number of particles, deltaTime, etc
    const generalUniformsBuffer = device.createBuffer({
      // numParticles, deltaTime, boundingBoxSize, 
      size: Float32Array.BYTES_PER_ELEMENT * 6,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    //SPHSettings sphSettings(0.02f, 1000, 1, 1.04f, 0.15f, -9.8f, 0.2f);

    // Bind storage buffers and uniforms buffers to their own bind groups
    const particleStorageBGCluster = createBindGroupCluster({
      device: device,
      label: 'ParticleStorage.bgCluster',
      bindings: [0, 1, 2, 3, 4],
      visibilities: [GPUShaderStage.COMPUTE],
      resourceTypes: ['buffer', 'buffer', 'buffer', 'buffer', 'buffer'],
      resourceLayouts: [
        { type: 'storage' },
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
      settings.totalParticles
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
              Math.ceil(settings.totalParticles / maxWorkgroupSizeX)
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
              Math.ceil(settings.totalParticles / maxWorkgroupSizeX)
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
        case 'SORT_ONLY_WITHOUT_ALGO_INFO':
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

    // Shaders rendering the discrete fluid particles
    const particleRenderer = new ParticleRenderer({
      device,
      numParticles: settings.totalParticles,
      positionsBuffer,
      velocitiesBuffer,
      densitiesBuffer,
      presentationFormat,
      renderPassDescriptor,
    });

    // Shader rendering the particle hash grid
    const hashGridRenderer = new HashGridRenderer({
      device,
      presentationFormat,
      renderPassDescriptor,
    });

    // Create initial values for our storage buffers and init GUI
    // Generate positions data and velocities data for their respective buffers
    // Positions are set between -canvas.width, -canvas.height and canvas.width, canvas.height
    const { inputPositions, inputVelocities } = generateParticleData(
      settings.totalParticles,
      -settings.boundsMin,
      -settings.boundsMin,
      settings.boundingBoxSize,
      settings.boundingBoxSize
    );

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

    const debugFolder = gui.addFolder('Debug');
    debugFolder.add(settings, 'Debug Property', [
      'Positions',
      'Velocities',
      'Current Forces',
      'Pressures',
      'Densities',
      'Spatial Offsets',
      'Spatial Indices',
      'Spatial Indices (Hash)',
    ] as DebugPropertySelect[]);
    debugFolder.add(settings, 'Log Debug').onChange(() => {
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
        case 'Spatial Indices (Hash)':
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
                case 'Spatial Indices (Hash)':
                  {
                    const output = [];
                    for (let i = 1; i < arr.length; i += 2) {
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
        case 'Positions':
        case 'Velocities':
        case 'Current Forces':
          {
            extractGPUData(
              particleStatingBufferVec2,
              Float32Array.BYTES_PER_ELEMENT * settings.totalParticles * 2
            ).then((data) => {
              console.log(new Float32Array(data));
              particleStatingBufferVec2.unmap();
            });
          }
          break;
        case 'Pressures':
        case 'Densities': {
          extractGPUData(
            particleStatingBufferVec1,
            Float32Array.BYTES_PER_ELEMENT * settings.totalParticles
          ).then((data) => {
            console.log(new Float32Array(data));
            particleStatingBufferVec1.unmap();
          });
        }
      }
    });
    debugFolder.add(settings, 'Log Dispatch Info').onChange(() => {
      console.log(
        `Invocations Per Workgroup: ${
          device.limits.maxComputeWorkgroupSizeX
        }\nWorkgroups Per Particle Property Calc: ${
          settings.totalParticles / 256
        }\nWorkgroups Per Spatial Indices Sort: ${
          sortResource.spatialIndicesWorkloadSize
        }\nWorkgroups Per Spatial Offsets Calc: ${
          sortResource.spatialOffsetsWorkloadSize
        }`
      );
    });

    // Initial 'write to main storage buffers
    device.queue.writeBuffer(positionsBuffer, 0, inputPositions);
    console.log(inputPositions);
    device.queue.writeBuffer(velocitiesBuffer, 0, inputVelocities);

    // Create initial algorithmic info that begins our per frame bitonic sort
    const initialAlgoInfo = new Uint32Array([
      StepEnum['FLIP_LOCAL'], // algo
      2, // stepHeight
      2, // highHeight
      sortResource.spatialIndicesWorkloadSize, // dispatchSize
    ]);

    async function frame() {
      if (!pageState.active) return;
      updateCamera2D(inputHandler());

      stats.begin();

      // Write to general uniforms buffer
      device.queue.writeBuffer(
        generalUniformsBuffer,
        0,
        new Uint32Array([settings.totalParticles])
      );

      device.queue.writeBuffer(
        generalUniformsBuffer,
        4,
        new Float32Array([
          frameSettings.deltaTime,
          settings.boundingBoxSize,
          settings.boundsMin,
          cellSettings.cellSize,
          cellSettings.cellsPerAxis,
        ])
      );

      particleRenderer.writeUniforms(device, {
        zoomScaleX: cameraSettings.zoomScaleX,
        zoomScaleY: cameraSettings.zoomScaleY,
        particleRadius: settings.particleRadius,
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

      particleRenderer.render(commandEncoder);

      switch (settings['Debug Property'] as DebugPropertySelect) {
        case 'Positions':
          {
            commandEncoder.copyBufferToBuffer(
              positionsBuffer,
              0,
              particleStatingBufferVec2,
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
              particleStatingBufferVec2,
              0,
              velocitiesBuffer.size
            );
          }
          break;
        case 'Densities':
          {
            commandEncoder.copyBufferToBuffer(
              densitiesBuffer,
              0,
              particleStatingBufferVec1,
              0,
              densitiesBuffer.size
            );
          }
          break;
        case 'Spatial Indices':
        case 'Spatial Indices (Hash)':
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
