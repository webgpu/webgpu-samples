import { makeSample, SampleInit } from '../../components/SampleLayout';
import { createBindGroupCluster, SampleInitFactoryWebGPU } from './utils';
import BitonicDisplayRenderer from './bitonicDisplay';
import bitonicDisplay from './bitonicDisplay.frag.wgsl';
import { NaiveBitonicCompute } from './computeShader';
import fullscreenTexturedQuad from '../../shaders/fullscreenTexturedQuad.wgsl';
import atomicToZero from './atomicToZero.wgsl';

// Type of step that will be executed in our shader
enum StepEnum {
  NONE,
  FLIP_LOCAL,
  DISPERSE_LOCAL,
  FLIP_GLOBAL,
  DISPERSE_GLOBAL,
}

// String access to StepEnum
type StepType =
  | 'NONE'
  | 'FLIP_LOCAL'
  | 'DISPERSE_LOCAL'
  | 'FLIP_GLOBAL'
  | 'DISPERSE_GLOBAL';

type DisplayType = 'Elements' | 'Swap Highlight';

// Gui settings object
interface SettingsInterface {
  'Total Elements': number;
  'Grid Width': number;
  'Grid Height': number;
  'Total Threads': number;
  'Hovered Cell': number;
  'Swapped Cell': number;
  'Step Index': number;
  'Total Steps': number;
  'Prev Step': StepType;
  'Next Step': StepType;
  'Prev Swap Span': number;
  'Next Swap Span': number;
  'Total Workgroups': number;
  'Display Mode': DisplayType;
  'Total Swaps': number;
  executeStep: boolean;
  'Randomize Values': () => void;
  'Execute Sort Step': () => void;
  'Log Elements': () => void;
  'Complete Sort': () => void;
  'Sort Speed': number;
}

const getNumSteps = (numElements: number) => {
  const n = Math.log2(numElements);
  return (n * (n + 1)) / 2;
};

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context, canvas }) => {
    const maxThreadsX = device.limits.maxComputeWorkgroupSizeX;

    const totalElementLengths = [];
    const maxElements = maxThreadsX * 32;
    for (let i = maxElements; i >= 4; i /= 2) {
      totalElementLengths.push(i);
    }

    const defaultGridWidth =
      Math.sqrt(maxElements) % 2 === 0
        ? Math.floor(Math.sqrt(maxElements))
        : Math.floor(Math.sqrt(maxElements / 2));

    const defaultGridHeight = maxElements / defaultGridWidth;

    const settings: SettingsInterface = {
      // number of cellElements. Must equal gridWidth * gridHeight and 'Total Threads' * 2
      'Total Elements': maxElements,
      // width of screen in cells.
      'Grid Width': defaultGridWidth,
      // height of screen in cells
      'Grid Height': defaultGridHeight,
      // number of threads to execute in a workgroup ('Total Threads', 1, 1)
      'Total Threads': maxThreadsX,
      // Cell in element grid mouse element is hovering over
      'Hovered Cell': 0,
      // element the hovered cell just swapped with,
      'Swapped Cell': 1,
      // Index of current step
      'Step Index': 0,
      // Total steps to sort current number of elements
      'Total Steps': getNumSteps(maxElements),
      // Previously executed step
      'Prev Step': 'NONE',
      // Next step to execute
      'Next Step': 'FLIP_LOCAL',
      // Max thread span of previous block
      'Prev Swap Span': 0,
      // Max thread span of next block
      'Next Swap Span': 2,
      // Workgroups to dispatch per frame,
      'Total Workgroups': maxElements / (maxThreadsX * 2),
      // The number of swap operations executed over time
      'Total Swaps': 0,
      // Whether we will dispatch a workload this frame
      executeStep: false,
      'Display Mode': 'Elements',
      'Randomize Values': () => {
        return;
      },
      'Execute Sort Step': () => {
        return;
      },
      'Log Elements': () => {
        return;
      },
      'Complete Sort': () => {
        return;
      },
      'Sort Speed': 50,
    };

    // Initialize initial elements array
    let elements = new Uint32Array(
      Array.from({ length: settings['Total Elements'] }, (_, i) => i)
    );

    // Initialize elementsBuffer and elementsStagingBuffer
    const elementsBufferSize =
      Float32Array.BYTES_PER_ELEMENT * totalElementLengths[0];
    // Initialize input, output, staging buffers
    const elementsInputBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const elementsOutputBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const elementsStagingBuffer = device.createBuffer({
      size: elementsBufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Initialize atomic swap buffer on GPU and CPU. Counts number of swaps actually performed by
    // compute shader (when value at index x is greater than value at index y)
    const atomicSwapsOutputBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const atomicSwapsStagingBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Create uniform buffer for compute shader
    const computeUniformsBuffer = device.createBuffer({
      // width, height, blockHeight, algo
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeBGCluster = createBindGroupCluster(
      [0, 1, 2, 3],
      [
        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        GPUShaderStage.COMPUTE,
        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        GPUShaderStage.COMPUTE,
      ],
      ['buffer', 'buffer', 'buffer', 'buffer'],
      [
        { type: 'read-only-storage' },
        { type: 'storage' },
        { type: 'uniform' },
        { type: 'storage' },
      ],
      [
        [
          { buffer: elementsInputBuffer },
          { buffer: elementsOutputBuffer },
          { buffer: computeUniformsBuffer },
          { buffer: atomicSwapsOutputBuffer },
        ],
      ],
      'BitonicSort',
      device
    );

    let computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBGCluster.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: NaiveBitonicCompute(settings['Total Threads']),
        }),
        entryPoint: 'computeMain',
      },
    });

    // Simple pipeline that zeros out an atomic value at group 0 binding 3
    const atomicToZeroComputePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBGCluster.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: atomicToZero,
        }),
        entryPoint: 'atomicToZero',
      },
    });

    // Create bitonic debug renderer
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: undefined, // Assigned later

          clearValue: { r: 0.1, g: 0.4, b: 0.5, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const bitonicDisplayRenderer = new BitonicDisplayRenderer(
      device,
      presentationFormat,
      renderPassDescriptor,
      computeBGCluster,
      'BitonicDisplay'
    );

    const resetExecutionInformation = () => {
      // Total threads are either elements / 2 or maxWorkgroupsSizeX
      totalThreadsController.setValue(
        Math.min(settings['Total Elements'] / 2, maxThreadsX)
      );

      // Dispatch a workgroup for every (Max threads * 2) elements
      const workgroupsPerStep =
        (settings['Total Elements'] - 1) / (maxThreadsX * 2);

      totalWorkgroupsController.setValue(Math.ceil(workgroupsPerStep));

      // Reset step Index and number of steps based on elements size
      stepIndexController.setValue(0);
      totalStepsController.setValue(getNumSteps(settings['Total Elements']));

      // Get new width and height of screen display in cells
      const newCellWidth =
        Math.sqrt(settings['Total Elements']) % 2 === 0
          ? Math.floor(Math.sqrt(settings['Total Elements']))
          : Math.floor(Math.sqrt(settings['Total Elements'] / 2));
      const newCellHeight = settings['Total Elements'] / newCellWidth;
      gridWidthController.setValue(newCellWidth);
      gridHeightController.setValue(newCellHeight);

      // Set prevStep to None (restart) and next step to FLIP
      prevStepController.setValue('NONE');
      nextStepController.setValue('FLIP_LOCAL');

      // Reset block heights
      prevBlockHeightController.setValue(0);
      nextBlockHeightController.setValue(2);

      // Reset Total Swaps by setting atomic value to 0
      const commandEncoder = device.createCommandEncoder();
      const computePassEncoder = commandEncoder.beginComputePass();
      computePassEncoder.setPipeline(atomicToZeroComputePipeline);
      computePassEncoder.setBindGroup(0, computeBGCluster.bindGroups[0]);
      computePassEncoder.dispatchWorkgroups(1);
      computePassEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
      totalSwapsController.setValue(0);

      highestBlockHeight = 2;
    };

    const randomizeElementArray = () => {
      let currentIndex = elements.length;
      // While there are elements to shuffle
      while (currentIndex !== 0) {
        // Pick a remaining element
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        [elements[currentIndex], elements[randomIndex]] = [
          elements[randomIndex],
          elements[currentIndex],
        ];
      }
    };

    const resizeElementArray = () => {
      // Recreate elements array with new length
      elements = new Uint32Array(
        Array.from({ length: settings['Total Elements'] }, (_, i) => i)
      );

      resetExecutionInformation();

      // Create new shader invocation with workgroupSize that reflects number of threads
      computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
          bindGroupLayouts: [computeBGCluster.bindGroupLayout],
        }),
        compute: {
          module: device.createShaderModule({
            code: NaiveBitonicCompute(settings['Total Elements'] / 2),
          }),
          entryPoint: 'computeMain',
        },
      });
      // Randomize array elements
      randomizeElementArray();
      highestBlockHeight = 2;
    };

    randomizeElementArray();

    const setSwappedCell = () => {
      let swappedIndex: number;
      switch (settings['Next Step']) {
        case 'FLIP_LOCAL':
        case 'FLIP_GLOBAL':
          {
            const blockHeight = settings['Next Swap Span'];
            const p2 = Math.floor(settings['Hovered Cell'] / blockHeight) + 1;
            const p3 = settings['Hovered Cell'] % blockHeight;
            swappedIndex = blockHeight * p2 - p3 - 1;
            swappedCellController.setValue(swappedIndex);
          }
          break;
        case 'DISPERSE_LOCAL':
          {
            const blockHeight = settings['Next Swap Span'];
            const halfHeight = blockHeight / 2;
            swappedIndex =
              settings['Hovered Cell'] % blockHeight < halfHeight
                ? settings['Hovered Cell'] + halfHeight
                : settings['Hovered Cell'] - halfHeight;
            swappedCellController.setValue(swappedIndex);
          }
          break;
        case 'NONE': {
          swappedIndex = settings['Hovered Cell'];
          swappedCellController.setValue(swappedIndex);
        }
        default:
          {
            swappedIndex = settings['Hovered Cell'];
            swappedCellController.setValue(swappedIndex);
          }
          break;
      }
    };

    let completeSortIntervalID: ReturnType<typeof setInterval> | null = null;
    const endSortInterval = () => {
      if (completeSortIntervalID !== null) {
        clearInterval(completeSortIntervalID);
        completeSortIntervalID = null;
      }
    };
    const startSortInterval = () => {
      const currentIntervalSpeed = settings['Sort Speed'];
      completeSortIntervalID = setInterval(() => {
        if (settings['Next Step'] === 'NONE') {
          clearInterval(completeSortIntervalID);
          completeSortIntervalID = null;
        }
        if (settings['Sort Speed'] !== currentIntervalSpeed) {
          clearInterval(completeSortIntervalID);
          completeSortIntervalID = null;
          startSortInterval();
        }
        settings.executeStep = true;
        setSwappedCell();
      }, settings['Sort Speed']);
    };

    // At top level, information about resources used to execute the compute shader
    // i.e elements sorted, threads/invocations per workgroup, and workgroups dispatched
    const computeResourcesFolder = gui.addFolder('Compute Resources');
    computeResourcesFolder
      .add(settings, 'Total Elements', totalElementLengths)
      .onChange(() => {
        endSortInterval();
        resizeElementArray();
      });
    const totalThreadsController = computeResourcesFolder.add(
      settings,
      'Total Threads'
    );
    const totalWorkgroupsController = computeResourcesFolder.add(
      settings,
      'Total Workgroups'
    );
    computeResourcesFolder.open();

    // Folder with functions that control the execution of the sort
    const controlFolder = gui.addFolder('Sort Controls');
    controlFolder.add(settings, 'Sort Speed', 50, 1000).step(50);
    controlFolder.add(settings, 'Execute Sort Step').onChange(() => {
      endSortInterval();
      settings.executeStep = true;
    });
    controlFolder.add(settings, 'Randomize Values').onChange(() => {
      endSortInterval();
      randomizeElementArray();
      resetExecutionInformation();
    });
    controlFolder
      .add(settings, 'Log Elements')
      .onChange(() => console.log(elements));
    controlFolder.add(settings, 'Complete Sort').onChange(startSortInterval);
    controlFolder.open();

    // Information about grid display
    const gridFolder = gui.addFolder('Grid Information');
    gridFolder.add(settings, 'Display Mode', ['Elements', 'Swap Highlight']);
    const gridWidthController = gridFolder.add(settings, 'Grid Width');
    const gridHeightController = gridFolder.add(settings, 'Grid Height');
    const hoveredCellController = gridFolder
      .add(settings, 'Hovered Cell')
      .onChange(setSwappedCell);
    const swappedCellController = gridFolder.add(settings, 'Swapped Cell');

    // Additional Information about the execution state of the sort
    const executionInformationFolder = gui.addFolder('Execution Information');
    const stepIndexController = executionInformationFolder.add(
      settings,
      'Step Index'
    );
    const totalStepsController = executionInformationFolder.add(
      settings,
      'Total Steps'
    );
    const prevStepController = executionInformationFolder.add(
      settings,
      'Prev Step'
    );
    const nextStepController = executionInformationFolder.add(
      settings,
      'Next Step'
    );
    const totalSwapsController = executionInformationFolder.add(
      settings,
      'Total Swaps'
    );
    const prevBlockHeightController = executionInformationFolder.add(
      settings,
      'Prev Swap Span'
    );
    const nextBlockHeightController = executionInformationFolder.add(
      settings,
      'Next Swap Span'
    );

    // Adjust styles of Function List Elements within GUI
    const liFunctionElements = document.getElementsByClassName('cr function');
    for (let i = 0; i < liFunctionElements.length; i++) {
      (liFunctionElements[i].children[0] as HTMLElement).style.display = 'flex';
      (liFunctionElements[i].children[0] as HTMLElement).style.justifyContent =
        'center';
      (
        liFunctionElements[i].children[0].children[1] as HTMLElement
      ).style.position = 'absolute';
    }

    canvas.addEventListener('mousemove', (event) => {
      const currWidth = canvas.getBoundingClientRect().width;
      const currHeight = canvas.getBoundingClientRect().height;
      const cellSize: [number, number] = [
        currWidth / settings['Grid Width'],
        currHeight / settings['Grid Height'],
      ];
      const xIndex = Math.floor(event.offsetX / cellSize[0]);
      const yIndex =
        settings['Grid Height'] - 1 - Math.floor(event.offsetY / cellSize[1]);
      hoveredCellController.setValue(yIndex * settings['Grid Width'] + xIndex);
      settings['Hovered Cell'] = yIndex * settings['Grid Width'] + xIndex;
    });

    // Deactivate interaction with select GUI elements
    totalWorkgroupsController.domElement.style.pointerEvents = 'none';
    hoveredCellController.domElement.style.pointerEvents = 'none';
    swappedCellController.domElement.style.pointerEvents = 'none';
    stepIndexController.domElement.style.pointerEvents = 'none';
    totalStepsController.domElement.style.pointerEvents = 'none';
    prevStepController.domElement.style.pointerEvents = 'none';
    prevBlockHeightController.domElement.style.pointerEvents = 'none';
    nextStepController.domElement.style.pointerEvents = 'none';
    nextBlockHeightController.domElement.style.pointerEvents = 'none';
    totalThreadsController.domElement.style.pointerEvents = 'none';
    gridWidthController.domElement.style.pointerEvents = 'none';
    gridHeightController.domElement.style.pointerEvents = 'none';
    totalSwapsController.domElement.style.pointerEvents = 'none';

    let highestBlockHeight = 2;

    startSortInterval();

    async function frame() {
      if (!pageState.active) return;

      // Write elements buffer
      device.queue.writeBuffer(
        elementsInputBuffer,
        0,
        elements.buffer,
        elements.byteOffset,
        elements.byteLength
      );

      const dims = new Float32Array([
        settings['Grid Width'],
        settings['Grid Height'],
      ]);
      const stepDetails = new Uint32Array([
        StepEnum[settings['Next Step']],
        settings['Next Swap Span'],
      ]);
      device.queue.writeBuffer(
        computeUniformsBuffer,
        0,
        dims.buffer,
        dims.byteOffset,
        dims.byteLength
      );

      device.queue.writeBuffer(computeUniformsBuffer, 8, stepDetails);

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      bitonicDisplayRenderer.startRun(commandEncoder, {
        highlight: settings['Display Mode'] === 'Elements' ? 0 : 1,
      });
      if (
        settings.executeStep &&
        highestBlockHeight !== settings['Total Elements'] * 2
      ) {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(computePipeline);
        computePassEncoder.setBindGroup(0, computeBGCluster.bindGroups[0]);
        computePassEncoder.dispatchWorkgroups(settings['Total Workgroups']);
        computePassEncoder.end();
        stepIndexController.setValue(settings['Step Index'] + 1);
        prevStepController.setValue(settings['Next Step']);
        prevBlockHeightController.setValue(settings['Next Swap Span']);
        nextBlockHeightController.setValue(settings['Next Swap Span'] / 2);
        if (settings['Next Swap Span'] === 1) {
          highestBlockHeight *= 2;
          if (highestBlockHeight === settings['Total Elements'] * 2) {
            nextStepController.setValue('NONE');
            nextBlockHeightController.setValue(0);
          } else if (highestBlockHeight > settings['Total Threads'] * 2) {
            nextStepController.setValue('FLIP_GLOBAL');
            nextBlockHeightController.setValue(highestBlockHeight);
          } else {
            nextStepController.setValue('FLIP_LOCAL');
            nextBlockHeightController.setValue(highestBlockHeight);
          }
        } else {
          settings['Next Swap Span'] > settings['Total Threads'] * 2
            ? nextStepController.setValue('DISPERSE_GLOBAL')
            : nextStepController.setValue('DISPERSE_LOCAL');
        }

        // Copy GPU accessible buffers to CPU accessible buffers
        commandEncoder.copyBufferToBuffer(
          elementsOutputBuffer,
          0,
          elementsStagingBuffer,
          0,
          elementsBufferSize
        );

        commandEncoder.copyBufferToBuffer(
          atomicSwapsOutputBuffer,
          0,
          atomicSwapsStagingBuffer,
          0,
          Uint32Array.BYTES_PER_ELEMENT
        );
      }
      device.queue.submit([commandEncoder.finish()]);

      if (settings.executeStep) {
        // Copy GPU element data to CPU
        await elementsStagingBuffer.mapAsync(
          GPUMapMode.READ,
          0,
          elementsBufferSize
        );
        const copyElementsBuffer = elementsStagingBuffer.getMappedRange(
          0,
          elementsBufferSize
        );
        // Copy atomic swaps data to CPU
        await atomicSwapsStagingBuffer.mapAsync(
          GPUMapMode.READ,
          0,
          Uint32Array.BYTES_PER_ELEMENT
        );
        const copySwapsBuffer = atomicSwapsStagingBuffer.getMappedRange(
          0,
          Uint32Array.BYTES_PER_ELEMENT
        );
        // Get correct range of data from CPU copy of GPU Data
        const elementsData = copyElementsBuffer.slice(
          0,
          Uint32Array.BYTES_PER_ELEMENT * settings['Total Elements']
        );
        const swapsData = copySwapsBuffer.slice(
          0,
          Uint32Array.BYTES_PER_ELEMENT
        );
        // Extract data
        const elementsOutput = new Uint32Array(elementsData);
        totalSwapsController.setValue(new Uint32Array(swapsData)[0]);
        elementsStagingBuffer.unmap();
        atomicSwapsStagingBuffer.unmap();
        // Elements output becomes elements input, swap accumulate
        elements = elementsOutput;
        setSwappedCell();
      }
      settings.executeStep = false;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
).then((resultInit) => (init = resultInit));

const bitonicSortExample: () => JSX.Element = () =>
  makeSample({
    name: 'Bitonic Sort',
    description:
      "A naive bitonic sort algorithm executed on the GPU, based on tgfrerer's implementation at poniesandlight.co.uk/reflect/bitonic_merge_sort/. Each invocation of the bitonic sort shader dispatches a workgroup containing elements/2 threads. The GUI's Execution Information folder contains information about the sort's current state. The visualizer displays the sort's results as colored cells sorted from brightest to darkest.",
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      BitonicDisplayRenderer.sourceInfo,
      {
        name: '../../../shaders/fullscreenTexturedQuad.vert.wgsl',
        contents: fullscreenTexturedQuad,
      },
      {
        name: './bitonicDisplay.frag.wgsl',
        contents: bitonicDisplay,
      },
      {
        name: './bitonicCompute.frag.wgsl',
        contents: NaiveBitonicCompute(64),
      },
      {
        name: './atomicToZero.wgsl',
        contents: atomicToZero,
      },
    ],
    filename: __filename,
  });

export default bitonicSortExample;
