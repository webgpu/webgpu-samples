import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import normalMapWGSL from './normalMap.wgsl';
import { createMeshRenderable } from '../../meshes/mesh';
import { createBoxMeshWithTangents } from '../../meshes/box';
import {
  SampleInitFactoryWebGPU,
  PBRDescriptor,
  createPBRDescriptor,
  createBindGroupDescriptor,
  create3DRenderPipeline,
  write32ToBuffer,
  writeMat4ToBuffer,
} from './utils';

const MAT4X4_BYTES = 64;
enum TextureAtlas {
  Spiral,
  Toybox,
  BrickWall,
}

let init: SampleInit;
SampleInitFactoryWebGPU(
  async ({ canvas, pageState, gui, device, context, presentationFormat }) => {
    interface GUISettings {
      'Bump Mode':
        | 'Diffuse Texture'
        | 'Normal Texture'
        | 'Depth Texture'
        | 'Normal Map'
        | 'Parallax Scale'
        | 'Steep Parallax';
      cameraPosX: number;
      cameraPosY: number;
      cameraPosZ: number;
      lightPosX: number;
      lightPosY: number;
      lightPosZ: number;
      lightIntensity: number;
      depthScale: number;
      depthLayers: number;
      Texture: string;
      'Reset Light': () => void;
    }

    const settings: GUISettings = {
      'Bump Mode': 'Normal Map',
      cameraPosX: 0.0,
      cameraPosY: 0.0,
      cameraPosZ: -2.4,
      lightPosX: 1.7,
      lightPosY: -0.7,
      lightPosZ: 1.9,
      lightIntensity: 0.02,
      depthScale: 0.05,
      depthLayers: 16,
      Texture: 'Spiral',
      'Reset Light': () => {
        return;
      },
    };

    // Create normal mapping resources and pipeline
    const depthTexture = device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const uniformBuffer = device.createBuffer({
      // Buffer holding projection, view, and model matrices plus padding bytes
      size: MAT4X4_BYTES * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const mapMethodBuffer = device.createBuffer({
      // Buffer holding mapping type, light uniforms, and depth uniforms
      size: Float32Array.BYTES_PER_ELEMENT * 7,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create PBR info (diffuse, normal, and depth/height textures)
    let spiralPBR: Required<PBRDescriptor>;
    {
      const response = await createPBRDescriptor(device, [
        'wood_diffuse.png',
        'spiral_normal.png',
        'spiral_height.png',
      ]);
      spiralPBR = response as Required<PBRDescriptor>;
    }

    let toyboxPBR: Required<PBRDescriptor>;
    {
      const response = await createPBRDescriptor(device, [
        'wood_diffuse.png',
        'toybox_normal.png',
        'toybox_height.png',
      ]);
      toyboxPBR = response as Required<PBRDescriptor>;
    }

    let brickWallPBR: Required<PBRDescriptor>;
    {
      const response = await createPBRDescriptor(device, [
        'brickwall_diffuse.png',
        'brickwall_normal.png',
        'brickwall_height.png',
      ]);
      brickWallPBR = response as Required<PBRDescriptor>;
    }

    // Create a sampler with linear filtering for smooth interpolation.
    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
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
      depthStencilAttachment: {
        view: depthTexture.createView(),

        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    const box = createMeshRenderable(
      device,
      createBoxMeshWithTangents(1.0, 1.0, 1.0)
    );

    // Uniform bindGroups and bindGroupLayout
    const frameBGDescriptor = createBindGroupDescriptor(
      [0, 1],
      [
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
      ],
      ['buffer', 'buffer'],
      [{ type: 'uniform' }, { type: 'uniform' }],
      [[{ buffer: uniformBuffer }, { buffer: mapMethodBuffer }]],
      'Frame',
      device
    );

    // Texture bindGroups and bindGroupLayout
    const surfaceBGDescriptor = createBindGroupDescriptor(
      [0, 1, 2, 3],
      [GPUShaderStage.FRAGMENT],
      ['sampler', 'texture', 'texture', 'texture'],
      [
        { type: 'filtering' },
        { sampleType: 'float' },
        { sampleType: 'float' },
        { sampleType: 'float' },
      ],
      // Multiple bindgroups that accord to the layout defined above
      [
        [
          sampler,
          spiralPBR.diffuse.createView(),
          spiralPBR.normal.createView(),
          spiralPBR.height.createView(),
        ],
        [
          sampler,
          toyboxPBR.diffuse.createView(),
          toyboxPBR.normal.createView(),
          toyboxPBR.height.createView(),
        ],
        [
          sampler,
          brickWallPBR.diffuse.createView(),
          brickWallPBR.normal.createView(),
          brickWallPBR.height.createView(),
        ],
      ],
      'Surface',
      device
    );

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = mat4.perspective(
      (2 * Math.PI) / 5,
      aspect,
      1,
      100.0
    ) as Float32Array;

    function getViewMatrix() {
      const viewMatrix = mat4.identity();
      mat4.translate(
        viewMatrix,
        vec3.fromValues(
          settings.cameraPosX,
          settings.cameraPosY,
          settings.cameraPosZ
        ),
        viewMatrix
      );
      return viewMatrix;
    }

    function getModelMatrix() {
      const modelMatrix = mat4.create();
      mat4.identity(modelMatrix);
      mat4.rotateX(modelMatrix, 10, modelMatrix);
      const now = Date.now() / 1000;
      mat4.rotateY(modelMatrix, now * -0.5, modelMatrix);
      return modelMatrix;
    }

    // Change the model mapping type
    const getMappingType = (arr: Uint32Array) => {
      switch (settings['Bump Mode']) {
        case 'Diffuse Texture':
          arr[0] = 0;
          break;
        case 'Normal Texture':
          arr[0] = 1;
          break;
        case 'Depth Texture':
          arr[0] = 2;
          break;
        case 'Normal Map':
          arr[0] = 3;
          break;
        case 'Parallax Scale':
          arr[0] = 4;
          break;
        case 'Steep Parallax':
          arr[0] = 5;
          break;
      }
    };
    const mappingType: Uint32Array = new Uint32Array([0]);

    const texturedCubePipeline = create3DRenderPipeline(
      device,
      'NormalMappingRender',
      [frameBGDescriptor.bindGroupLayout, surfaceBGDescriptor.bindGroupLayout],
      normalMapWGSL,
      // Position,   normal       uv           tangent      bitangent
      ['float32x3', 'float32x3', 'float32x2', 'float32x3', 'float32x3'],
      normalMapWGSL,
      presentationFormat,
      true
    );

    let currentSurfaceBindGroup = 0;
    const onChangeTexture = () => {
      currentSurfaceBindGroup = TextureAtlas[settings.Texture];
    };

    gui.add(settings, 'Bump Mode', [
      'Diffuse Texture',
      'Normal Texture',
      'Depth Texture',
      'Normal Map',
      'Parallax Scale',
      'Steep Parallax',
    ]);
    gui
      .add(settings, 'Texture', ['Spiral', 'Toybox', 'BrickWall'])
      .onChange(onChangeTexture);
    const lightFolder = gui.addFolder('Light');
    const depthFolder = gui.addFolder('Depth');
    lightFolder.add(settings, 'Reset Light').onChange(() => {
      lightPosXCell.setValue(1.7);
      lightPosYCell.setValue(-0.7);
      lightPosZCell.setValue(1.9);
      lightIntensityCell.setValue(0.02);
    });
    const lightPosXCell = lightFolder
      .add(settings, 'lightPosX', -5, 5)
      .step(0.1);
    const lightPosYCell = lightFolder
      .add(settings, 'lightPosY', -5, 5)
      .step(0.1);
    const lightPosZCell = lightFolder
      .add(settings, 'lightPosZ', -5, 5)
      .step(0.1);
    const lightIntensityCell = lightFolder
      .add(settings, 'lightIntensity', 0.0, 0.1)
      .step(0.002);
    depthFolder.add(settings, 'depthScale', 0.0, 0.1).step(0.01);
    depthFolder.add(settings, 'depthLayers', 1, 32).step(1);

    const liFunctionElements = document.getElementsByClassName('cr function');
    for (let i = 0; i < liFunctionElements.length; i++) {
      (liFunctionElements[i].children[0] as HTMLElement).style.display = 'flex';
      (liFunctionElements[i].children[0] as HTMLElement).style.justifyContent =
        'center';
      (
        liFunctionElements[i].children[0].children[1] as HTMLElement
      ).style.position = 'absolute';
    }

    function frame() {
      if (!pageState.active) return;

      // Write to normal map shader
      const viewMatrixTemp = getViewMatrix();
      const viewMatrix = viewMatrixTemp as Float32Array;

      const modelMatrixTemp = getModelMatrix();
      const modelMatrix = modelMatrixTemp as Float32Array;

      writeMat4ToBuffer(device, uniformBuffer, [
        projectionMatrix,
        viewMatrix,
        modelMatrix,
      ]);

      getMappingType(mappingType);

      write32ToBuffer(device, mapMethodBuffer, [mappingType]);
      device.queue.writeBuffer(
        mapMethodBuffer,
        4,
        new Float32Array([
          settings.lightPosX,
          settings.lightPosY,
          settings.lightPosZ,
          settings.lightIntensity,
          settings.depthScale,
          settings.depthLayers,
        ])
      );

      renderPassDescriptor.colorAttachments[0].view = context
        .getCurrentTexture()
        .createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      // Draw textured Cube
      passEncoder.setPipeline(texturedCubePipeline);
      passEncoder.setBindGroup(0, frameBGDescriptor.bindGroups[0]);
      passEncoder.setBindGroup(
        1,
        surfaceBGDescriptor.bindGroups[currentSurfaceBindGroup]
      );
      passEncoder.setVertexBuffer(0, box.vertexBuffer);
      passEncoder.setIndexBuffer(box.indexBuffer, 'uint16');
      passEncoder.drawIndexed(box.indexCount);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
).then((resultInit) => (init = resultInit));

const NormalMapping: () => JSX.Element = () =>
  makeSample({
    name: 'Normal Mapping',
    description:
      "This example demonstrates multiple different methods that employ fragment shaders to achieve additional perceptual depth on a mesh's surface. Demonstrated methods include normal mapping, parallax mapping, and steep parallax mapping.",
    gui: true,
    init,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './normalMap.wgsl',
        contents: normalMapWGSL,
        editable: true,
      },
      {
        name: '../../meshes/box.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/box.ts').default,
      },
      {
        name: '../../meshes/mesh.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/mesh.ts').default,
      },
      {
        name: './utils.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./utils.ts').default,
      },
    ],
    filename: __filename,
  });

export default NormalMapping;
