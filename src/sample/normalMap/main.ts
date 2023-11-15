import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';
import normalMapWGSL from './normalMap.wgsl';
import { createMeshRenderable } from '../../meshes/mesh';
import { createBoxMeshWithTangents } from '../../meshes/box';
import {
  createBindGroupDescriptor,
  create3DRenderPipeline,
  createTextureFromImage,
} from './utils';

const MAT4X4_BYTES = 64;
enum TextureAtlas {
  Spiral,
  Toybox,
  BrickWall,
}

const init: SampleInit = async ({ canvas, pageState, gui }) => {
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

  interface GUISettings {
    'Bump Mode':
      | 'Albedo Texture'
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
    cameraPosY: 0.8,
    cameraPosZ: -1.4,
    lightPosX: 1.7,
    lightPosY: 0.7,
    lightPosZ: -1.9,
    lightIntensity: 5.0,
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

  const spaceTransformsBuffer = device.createBuffer({
    // Buffer holding projection, view, and model matrices plus padding bytes
    size: MAT4X4_BYTES * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const mapInfoBuffer = device.createBuffer({
    // Buffer holding mapping type, light uniforms, and depth uniforms
    size: Float32Array.BYTES_PER_ELEMENT * 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const mapInfoArray = new ArrayBuffer(mapInfoBuffer.size);
  const mapInfoView = new DataView(mapInfoArray, 0, mapInfoArray.byteLength);

  // Fetch the image and upload it into a GPUTexture.
  let woodAlbedoTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/wood_albedo.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    woodAlbedoTexture = createTextureFromImage(device, imageBitmap);
  }

  let spiralNormalTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/spiral_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    spiralNormalTexture = createTextureFromImage(device, imageBitmap);
  }

  let spiralHeightTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/spiral_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    spiralHeightTexture = createTextureFromImage(device, imageBitmap);
  }

  let toyboxNormalTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/toybox_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    toyboxNormalTexture = createTextureFromImage(device, imageBitmap);
  }

  let toyboxHeightTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/toybox_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    toyboxHeightTexture = createTextureFromImage(device, imageBitmap);
  }

  let brickwallAlbedoTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/brickwall_albedo.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallAlbedoTexture = createTextureFromImage(device, imageBitmap);
  }

  let brickwallNormalTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/brickwall_normal.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallNormalTexture = createTextureFromImage(device, imageBitmap);
  }

  let brickwallHeightTexture: GPUTexture;
  {
    const response = await fetch('../assets/img/brickwall_height.png');
    const imageBitmap = await createImageBitmap(await response.blob());
    brickwallHeightTexture = createTextureFromImage(device, imageBitmap);
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
    [[{ buffer: spaceTransformsBuffer }, { buffer: mapInfoBuffer }]],
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
        woodAlbedoTexture.createView(),
        spiralNormalTexture.createView(),
        spiralHeightTexture.createView(),
      ],
      [
        sampler,
        woodAlbedoTexture.createView(),
        toyboxNormalTexture.createView(),
        toyboxHeightTexture.createView(),
      ],
      [
        sampler,
        brickwallAlbedoTexture.createView(),
        brickwallNormalTexture.createView(),
        brickwallHeightTexture.createView(),
      ],
    ],
    'Surface',
    device
  );

  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    0.1,
    10.0
  ) as Float32Array;

  function getViewMatrix() {
    return mat4.lookAt(
      [settings.cameraPosX, settings.cameraPosY, settings.cameraPosZ],
      [0, 0, 0],
      [0, 1, 0]
    );
  }

  function getModelMatrix() {
    const modelMatrix = mat4.create();
    mat4.identity(modelMatrix);
    const now = Date.now() / 1000;
    mat4.rotateY(modelMatrix, now * -0.5, modelMatrix);
    return modelMatrix;
  }

  // Change the model mapping type
  const getMode = (): number => {
    switch (settings['Bump Mode']) {
      case 'Albedo Texture':
        return 0;
      case 'Normal Texture':
        return 1;
      case 'Depth Texture':
        return 2;
      case 'Normal Map':
        return 3;
      case 'Parallax Scale':
        return 4;
      case 'Steep Parallax':
        return 5;
    }
  };

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
    'Albedo Texture',
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
    lightPosXController.setValue(1.7);
    lightPosYController.setValue(0.7);
    lightPosZController.setValue(-1.9);
    lightIntensityController.setValue(5.0);
  });
  const lightPosXController = lightFolder
    .add(settings, 'lightPosX', -5, 5)
    .step(0.1);
  const lightPosYController = lightFolder
    .add(settings, 'lightPosY', -5, 5)
    .step(0.1);
  const lightPosZController = lightFolder
    .add(settings, 'lightPosZ', -5, 5)
    .step(0.1);
  const lightIntensityController = lightFolder
    .add(settings, 'lightIntensity', 0.0, 10)
    .step(0.1);
  depthFolder.add(settings, 'depthScale', 0.0, 0.1).step(0.01);
  depthFolder.add(settings, 'depthLayers', 1, 32).step(1);

  function frame() {
    if (!pageState.active) return;

    // Update spaceTransformsBuffer
    const viewMatrix = getViewMatrix();
    const worldViewMatrix = mat4.mul(viewMatrix, getModelMatrix());
    const worldViewProjMatrix = mat4.mul(projectionMatrix, worldViewMatrix);
    const matrices = new Float32Array([
      ...worldViewProjMatrix,
      ...worldViewMatrix,
    ]);

    // Update mapInfoBuffer
    const lightPosWS = vec3.create(
      settings.lightPosX,
      settings.lightPosY,
      settings.lightPosZ
    );
    const lightPosVS = vec3.transformMat4(lightPosWS, viewMatrix);
    const mode = getMode();
    device.queue.writeBuffer(
      spaceTransformsBuffer,
      0,
      matrices.buffer,
      matrices.byteOffset,
      matrices.byteLength
    );

    // struct MapInfo {
    //   lightPosVS: vec3f,
    //   mode: u32,
    //   lightIntensity: f32,
    //   depthScale: f32,
    //   depthLayers: f32,
    // }
    mapInfoView.setFloat32(0, lightPosVS[0], true);
    mapInfoView.setFloat32(4, lightPosVS[1], true);
    mapInfoView.setFloat32(8, lightPosVS[2], true);
    mapInfoView.setUint32(12, mode, true);
    mapInfoView.setFloat32(16, settings.lightIntensity, true);
    mapInfoView.setFloat32(20, settings.depthScale, true);
    mapInfoView.setFloat32(24, settings.depthLayers, true);
    device.queue.writeBuffer(mapInfoBuffer, 0, mapInfoArray);

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
};

const NormalMapping: () => JSX.Element = () =>
  makeSample({
    name: 'Normal Mapping',
    description:
      'This example demonstrates multiple different methods that employ fragment shaders to achieve additional perceptual depth on the surface of a cube mesh. Demonstrated methods include normal mapping, parallax mapping, and steep parallax mapping.',
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
