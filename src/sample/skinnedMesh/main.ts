/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { convertGLBToJSONAndBinary } from './glbUtils';
import gltfWGSL from './gltf.wgsl';
import gridWGSL from './grid.wgsl';
import { mat4, vec3 } from 'wgpu-matrix';
import { createBindGroupCluster } from '../bitonicSort/utils';
import { createSkinnedGridBuffers, createSkinnedGridRenderPipeline } from './boneGridUtils';
//import {ArcballCamera} from 'arcball_camera'

const MAT4X4_BYTES = 64;

const init: SampleInit = async ({
  canvas,
  pageState,
  gui,
}) => {
  //Normal setup
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (!pageState.active) return;
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const settings = {
    cameraX: 0,
    cameraY: -0.3,
    cameraZ: -0.6,
    objectScale: 1,
    object: 'Whale'
  };

  gui.add(settings, 'cameraX', -5, 5).step(0.1);
  gui.add(settings, 'cameraY', -5, 5).step(0.1);
  gui.add(settings, 'cameraZ', -100, 0).step(0.1);
  gui.add(settings, 'objectScale', 0.01, 10).step(0.01);

  // Create global resources
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus-stencil8',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const cameraBuffer = device.createBuffer({
    size: MAT4X4_BYTES * 3,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const cameraBGCluster = createBindGroupCluster(
    [0],
    [GPUShaderStage.VERTEX],
    ['buffer'],
    [{ type: 'uniform' }],
    [[{ buffer: cameraBuffer }]],
    'Camera',
    device
  );

  // Create whale resources
  const whaleScene = await fetch('../assets/gltf/whale.glb')
    .then((res) => res.arrayBuffer())
    .then((buffer) => convertGLBToJSONAndBinary(buffer, device));

  whaleScene.meshes[0].buildRenderPipeline(
    device,
    device.createShaderModule({
      code: gltfWGSL
    }),
    device.createShaderModule({
      code: gltfWGSL
    }),
    presentationFormat,
    depthTexture.format,
    cameraBGCluster.bindGroupLayout
  );

  // Create grid resources
  const skinnedGridBuffers = createSkinnedGridBuffers(device);
  const skinnedGridBoneBuffer = device.createBuffer({
    // 4 4x4 matrices, one for each bone
    size: MAT4X4_BYTES * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const skinnedGridBoneBGCluster = createBindGroupCluster(
    [0],
    [GPUShaderStage.VERTEX],
    ['buffer'],
    [{type: 'uniform'}],
    [[{buffer: skinnedGridBoneBuffer}]],
    'Bone',
    device
  );
  const skinnedGridPipeline = createSkinnedGridRenderPipeline(
    device, 
    presentationFormat,
    gridWGSL,
    gridWGSL,
    cameraBGCluster.bindGroupLayout,
    skinnedGridBoneBGCluster.bindGroupLayout,
  );

  // Global Calc
  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    0.1,
    100.0
  );

  function getViewMatrix() {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, vec3.fromValues(settings.cameraX, settings.cameraY, settings.cameraZ), viewMatrix);
    return viewMatrix as Float32Array;
  }

  function getModelMatrix() {
    const modelMatrix = mat4.identity();
    const scaleVector = vec3.fromValues(settings.objectScale, settings.objectScale, settings.objectScale);
    mat4.scale(modelMatrix, scaleVector, modelMatrix);
    mat4.rotateY(modelMatrix, Date.now() / 1000 * 0.5, modelMatrix);
    return modelMatrix as Float32Array;
  }

  // Skinned Grid Calc
  

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadOp: "clear",
      depthClearValue: 1.0,
      depthStoreOp: "store",
      stencilLoadOp: "clear",
      stencilClearValue: 0,
      stencilStoreOp: "store"
    },
  };

  console.log(projectionMatrix);


  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const modelMatrix = getModelMatrix();

    const viewMatrix = getViewMatrix();

    device.queue.writeBuffer(
      cameraBuffer,
      0,
      (projectionMatrix as Float32Array).buffer,
      (projectionMatrix as Float32Array).byteOffset,
      (projectionMatrix as Float32Array).byteLength
    );

    device.queue.writeBuffer(
      cameraBuffer,
      64, 
      viewMatrix.buffer,
      viewMatrix.byteOffset,
      viewMatrix.byteLength
    )

    device.queue.writeBuffer(
      cameraBuffer,
      128,
      modelMatrix.buffer,
      modelMatrix.byteOffset,
      modelMatrix.byteLength
    )

    if (settings.object === 'Skinned Grid') {
      device.queue
    }
    
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    if (settings.object === 'Whale') {
      //mesh.render(passEncoder, bgDescriptor.bindGroups[0]);
      whaleScene.meshes[0].render(passEncoder, cameraBGCluster.bindGroups[0]);
    } else {
      passEncoder.setPipeline(skinnedGridPipeline);
      passEncoder.setVertexBuffer(0, skinnedGridBuffers.vertPositions);
      passEncoder.setVertexBuffer(1, skinnedGridBuffers.boneIndices);
      passEncoder.setVertexBuffer(2, skinnedGridBuffers.boneWeights);
      passEncoder.setIndexBuffer(skinnedGridBuffers.vertIndices, 'uint16');
      passEncoder.drawIndexed(skinnedGridBuffers.vertIndices.size / Uint16Array.BYTES_PER_ELEMENT);
    }
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const skinnedMesh: () => JSX.Element = () =>
  makeSample({
    name: 'Skinned Mesh',
    description: 'WIP Skinned Mesh',
    init,
    gui: true,
    sources: [
      {
        name: __filename.substring(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: './gltf.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./gltf.ts').default,
      },
      {
        name: './glbUtils.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./glbUtils.ts').default,
      },
      {
        name: './gltf.wgsl',
        contents: gltfWGSL
      },
      {
        name: './grid.wgsl',
        contents: gridWGSL,
      }, 
    ],
    filename: __filename,
  });

export default skinnedMesh;