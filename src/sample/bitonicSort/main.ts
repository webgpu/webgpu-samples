import { makeSample, SampleInit } from '../../components/SampleLayout';
import { SampleInitFactoryWebGPU } from './utils';
import { createBindGroupDescriptor } from './utils';
import BitonicDisplayRenderer from './display';
import { BitonicDisplayShader } from './renderShader';
import { NaiveBitonicCompute } from './computeShader';
import fullscreenTexturedQuad from '../../shaders/fullscreenTexturedQuad.wgsl';

// Type of step that will be executed in our shader
enum StepEnum {
  NONE = 0,
  FLIP_LOCAL = 1,
  DISPERSE_LOCAL = 2,
  FLIP_DISPERSE_LOCAL = 3,
  FLIP_GLOBAL = 4,
  DISPERSE_GLOBAL = 5,
  FLIP_DISPERSE_GLOBAL = 6,
}

// String access to StepEnum
type StepType =
  | 'NONE'
  | 'FLIP_LOCAL'
  | 'DISPERSE_LOCAL'
  | 'FLIP_DISPERSE_LOCAL'
  | 'FLIP_GLOBAL'
  | 'DISPERSE_GLOBAL'
  | 'FLIP_DISPERSE_GLOBAL';

// Gui settings object
interface SettingsInterface {
  'Total Elements': number;
  'Grid Width': number;
  'Grid Height': number;
  'Total Threads': number;
  hoveredElement: number;
  swappedElement: number;
  'Prev Step': StepType;
  'Next Step': StepType;
  'Prev Swap Span': number;
  'Next Swap Span': number;
  workLoads: number;
  executeStep: boolean;
  'Randomize Values': () => void;
  'Execute Sort Step': () => void;
  'Log Elements': () => void;
  'Complete Sort': () => void;
  sortSpeed: number;
}

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ pageState, device, gui, presentationFormat, context, canvas }) => {
    const maxWorkgroupsX = device.limits.maxComputeWorkgroupSizeX;

    const totalElementLengths = [];
    for (let i = maxWorkgroupsX * 2; i >= 4; i /= 2) {
      totalElementLengths.push(i);
    }

    const settings: SettingsInterface = {
      // number of cellElements. Must equal gridWidth * gridHeight and 'Total Threads' * 2
      'Total Elements': 16,
      // width of screen in cells.
      'Grid Width': 4,
      // height of screen in cells
      'Grid Height': 4,
      // number of threads to execute in a workgroup ('Total Threads', 1, 1)
      'Total Threads': 16 / 2,
      // currently highlighted element
      hoveredElement: 0,
      // element the hoveredElement just swapped with,
      swappedElement: 1,
      // Previously executed step
      'Prev Step': 'NONE',
      // Next step to execute
      'Next Step': 'FLIP_LOCAL',
      // Max thread span of previous block
      'Prev Swap Span': 0,
      // Max thread span of next block
      'Next Swap Span': 2,
      // workloads to dispatch per frame,
      workLoads: 1,
      // Whether we will dispatch a workload this frame
      executeStep: false,
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
      sortSpeed: 200,
    };

    // Initialize initial elements array
    let elements = new Uint32Array(
      Array.from({ length: settings['Total Elements'] }, (_, i) => i)
    );

    // Initialize elementsBuffer and elementsStagingBuffer
    const elementsBufferSize = Float32Array.BYTES_PER_ELEMENT * 512;
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

    // Create uniform buffer for compute shader
    const computeUniformsBuffer = device.createBuffer({
      // width, height, blockHeight, algo
      size: Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const computeBGDescript = createBindGroupDescriptor(
      [0, 1, 2],
      [
        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        GPUShaderStage.COMPUTE,
        GPUShaderStage.COMPUTE,
      ],
      ['buffer', 'buffer', 'buffer'],
      [{ type: 'read-only-storage' }, { type: 'storage' }, { type: 'uniform' }],
      [
        [
          { buffer: elementsInputBuffer },
          { buffer: elementsOutputBuffer },
          { buffer: computeUniformsBuffer },
        ],
      ],
      'NaiveBitonicSort',
      device
    );

    let computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBGDescript.bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({
          code: NaiveBitonicCompute(settings['Total Threads']),
        }),
        entryPoint: 'computeMain',
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
      ['default'],
      computeBGDescript,
      'BitonicDisplay'
    );

    const resetExecutionInformation = () => {
      totalThreadsCell.setValue(settings['Total Elements'] / 2);

      // Get new width and height of screen display in cells
      const newCellWidth =
        Math.sqrt(settings['Total Elements']) % 2 === 0
          ? Math.floor(Math.sqrt(settings['Total Elements']))
          : Math.floor(Math.sqrt(settings['Total Elements'] / 2));
      const newCellHeight = settings['Total Elements'] / newCellWidth;
      gridWidthCell.setValue(newCellWidth);
      gridHeightCell.setValue(newCellHeight);

      // Set prevStep to None (restart) and next step to FLIP
      prevStepCell.setValue('NONE');
      nextStepCell.setValue('FLIP_LOCAL');

      // Reset block heights
      prevBlockHeightCell.setValue(0);
      nextBlockHeightCell.setValue(2);
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
          bindGroupLayouts: [computeBGDescript.bindGroupLayout],
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

    const setSwappedElement = () => {
      let swappedIndex: number;
      switch (settings['Next Step']) {
        case 'FLIP_LOCAL':
          {
            const blockHeight = settings['Next Swap Span'];
            const p2 = Math.floor(settings.hoveredElement / blockHeight) + 1;
            const p3 = settings.hoveredElement % blockHeight;
            swappedIndex = blockHeight * p2 - p3 - 1;
            swappedElementCell.setValue(swappedIndex);
          }
          break;
        case 'DISPERSE_LOCAL':
          {
            const blockHeight = settings['Next Swap Span'];
            const halfHeight = blockHeight / 2;
            swappedIndex =
              settings.hoveredElement % blockHeight < halfHeight
                ? settings.hoveredElement + halfHeight
                : settings.hoveredElement - halfHeight;
            swappedElementCell.setValue(swappedIndex);
          }
          break;
        case 'NONE': {
          swappedIndex = settings.hoveredElement;
          swappedElementCell.setValue(swappedIndex);
        }
        default:
          {
            swappedIndex = settings.hoveredElement;
            swappedElementCell.setValue(swappedIndex);
          }
          break;
      }
    };

    let completeSortIntervalID;
    const endSortInterval = () => {
      if (completeSortIntervalID !== null) {
        clearInterval(completeSortIntervalID);
        completeSortIntervalID = null;
      }
    };
    const startSortInterval = () => {
      completeSortIntervalID = setInterval(() => {
        if (settings['Next Step'] === 'NONE') {
          clearInterval(completeSortIntervalID);
          completeSortIntervalID = null;
        }
        settings.executeStep = true;
        setSwappedElement();
      }, settings.sortSpeed);
    };

    // At top level, basic information about the number of elements sorted and the number of threads
    // deployed per workgroup.
    gui.add(settings, 'Total Elements', totalElementLengths).onChange(() => {
      endSortInterval();
      resizeElementArray();
    });
    const totalThreadsCell = gui.add(settings, 'Total Threads');

    // Folder with functions that control the execution of the sort
    const controlFolder = gui.addFolder('Sort Controls');
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

    // Folder with indexes of the hovered element
    const hoverFolder = gui.addFolder('Hover Information');
    const hoveredElementCell = hoverFolder
      .add(settings, 'hoveredElement')
      .onChange(setSwappedElement);
    const swappedElementCell = hoverFolder.add(settings, 'swappedElement');

    // Additional Information about the execution state of the sort
    const executionInformationFolder = gui.addFolder('Execution Information');
    const prevStepCell = executionInformationFolder.add(settings, 'Prev Step');
    const nextStepCell = executionInformationFolder.add(settings, 'Next Step');
    const prevBlockHeightCell = executionInformationFolder.add(
      settings,
      'Prev Swap Span'
    );
    const nextBlockHeightCell = executionInformationFolder.add(
      settings,
      'Next Swap Span'
    );
    const gridWidthCell = executionInformationFolder.add(
      settings,
      'Grid Width'
    );
    const gridHeightCell = executionInformationFolder.add(
      settings,
      'Grid Height'
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
      hoveredElementCell.setValue(yIndex * settings['Grid Width'] + xIndex);
      settings.hoveredElement = yIndex * settings['Grid Width'] + xIndex;
    });

    // Deactivate interaction with select GUI elements
    prevStepCell.domElement.style.pointerEvents = 'none';
    prevBlockHeightCell.domElement.style.pointerEvents = 'none';
    nextStepCell.domElement.style.pointerEvents = 'none';
    nextBlockHeightCell.domElement.style.pointerEvents = 'none';
    totalThreadsCell.domElement.style.pointerEvents = 'none';
    gridWidthCell.domElement.style.pointerEvents = 'none';
    gridHeightCell.domElement.style.pointerEvents = 'none';

    let highestBlockHeight = 2;

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
        width: settings['Grid Width'],
        height: settings['Grid Height'],
      });
      if (
        settings.executeStep &&
        highestBlockHeight !== settings['Total Elements'] * 2
      ) {
        const computePassEncoder = commandEncoder.beginComputePass();
        computePassEncoder.setPipeline(computePipeline);
        computePassEncoder.setBindGroup(0, computeBGDescript.bindGroups[0]);
        computePassEncoder.dispatchWorkgroups(1);
        computePassEncoder.end();

        prevStepCell.setValue(settings['Next Step']);
        prevBlockHeightCell.setValue(settings['Next Swap Span']);
        nextBlockHeightCell.setValue(settings['Next Swap Span'] / 2);
        if (settings['Next Swap Span'] === 1) {
          highestBlockHeight *= 2;
          nextStepCell.setValue(
            highestBlockHeight === settings['Total Elements'] * 2
              ? 'NONE'
              : 'FLIP_LOCAL'
          );
          nextBlockHeightCell.setValue(
            highestBlockHeight === settings['Total Elements'] * 2
              ? 0
              : highestBlockHeight
          );
        } else {
          nextStepCell.setValue('DISPERSE_LOCAL');
        }
        commandEncoder.copyBufferToBuffer(
          elementsOutputBuffer,
          0,
          elementsStagingBuffer,
          0,
          elementsBufferSize
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
        // Get correct range of data from CPU copy of GPU Data
        const elementsData = copyElementsBuffer.slice(
          0,
          Uint32Array.BYTES_PER_ELEMENT * settings['Total Elements']
        );
        // Extract data
        const elementsOutput = new Uint32Array(elementsData);
        elementsStagingBuffer.unmap();
        elements = elementsOutput;
        setSwappedElement();
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
        contents: BitonicDisplayShader(),
      },
      {
        name: './bitonicCompute.frag.wgsl',
        contents: NaiveBitonicCompute(16),
      },
    ],
    filename: __filename,
  });

export default bitonicSortExample;
