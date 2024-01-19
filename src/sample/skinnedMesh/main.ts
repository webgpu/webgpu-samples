/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { convertGLBToJSONAndBinary } from './glbUtils';
import gltfWGSL from './gltf.wgsl';
import gridWGSL from './grid.wgsl';
import { Mat4, mat4, vec3 } from 'wgpu-matrix';
import { createBindGroupCluster } from '../bitonicSort/utils';
import { createSkinnedGridBuffers, createSkinnedGridRenderPipeline } from './gridUtils';
import { gridIndices } from './gridData';
//import {ArcballCamera} from 'arcball_camera'

const MAT4X4_BYTES = 64;

interface BoneObject {
  transforms: Mat4[];
  bindPoses: Mat4[];
  uniforms: Mat4[];
}

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

  gui.add(settings, 'object', ['Whale', 'Skinned Grid']);
  gui.add(settings, 'cameraX', -10, 10).step(0.1);
  gui.add(settings, 'cameraY', -10, 10).step(0.1);
  gui.add(settings, 'cameraZ', -100, 0).step(0.1);
  gui.add(settings, 'objectScale', 0.01, 10).step(0.01);

  // Create global resources
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
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
  const skinnedGridVertexBuffers = createSkinnedGridBuffers(device);
  const skinnedGridBoneArrayBuffer = new Float32Array(4 * 16);
  const skinnedGridBoneUniformBuffer = device.createBuffer({
    // 4 4x4 matrices, one for each bone
    size: MAT4X4_BYTES * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const skinnedGridBoneBGCluster = createBindGroupCluster(
    [0],
    [GPUShaderStage.VERTEX],
    ['buffer'],
    [{type: 'uniform'}],
    [[{buffer: skinnedGridBoneUniformBuffer}]],
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
  const perspectiveProjection = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    0.1,
    100.0
  );

  const orthographicProjection = mat4.ortho(
    -20, 20, -10, 10, -100, 100
  );

  function getProjectionMatrix() {
    if (settings.object !== 'Skinned Grid') {
      return perspectiveProjection as Float32Array;
    }
    return orthographicProjection as Float32Array;
  }

  function getViewMatrix() {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, vec3.fromValues(settings.cameraX * settings.objectScale, settings.cameraY * settings.objectScale, settings.cameraZ), viewMatrix);
    return viewMatrix as Float32Array;
  }

  function getModelMatrix() {
    const modelMatrix = mat4.identity();
    const scaleVector = vec3.fromValues(settings.objectScale, settings.objectScale, settings.objectScale);
    mat4.scale(modelMatrix, scaleVector, modelMatrix);
    if (settings.object === 'Whale') {
      mat4.rotateY(modelMatrix, Date.now() / 1000 * 0.5, modelMatrix);
    }
    return modelMatrix as Float32Array;
  }

  // Pass Descriptor for GLTFs
  const gltfRenderPassDescriptor: GPURenderPassDescriptor = {
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
      //stencilLoadOp: "clear",
      //stencilClearValue: 0,
      //stencilStoreOp: "store"
    },
  };

  // Pass descriptor for grid with no depth testing
  const skinnedGridRenderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  }

  const computeBoneMatrices = (boneTranslations: Mat4[], angle: number) => {
    let m = m4.identity();
    mat4.rotateZ(m, angle, boneTranslations[0])
  }

  const createBoneObject = (arrayBuffer: Float32Array, numBones: number): BoneObject => {
    // Initial bone transformation
    const transforms: Mat4[] = [];
    // Bone bind poses
    const bindPoses: Mat4[] = [];
    // Bone after transform and inverse bind pose has been applied
    const uniforms: Mat4[] = [];
    for (let i= 0; i < numBones; i++) {
      transforms.push(mat4.identity());
      bindPoses.push(mat4.identity());
      // Why is byte offset in btyes but length is in elements : (
      const boneArrayBufferView = new Float32Array(skinnedGridBoneArrayBuffer.buffer, i * 4 * 16, 16);
      console.log(boneArrayBufferView.length)
      uniforms.push(boneArrayBufferView)
    }

    return {
      transforms,
      bindPoses,
      uniforms,
    }
  }

  const skinnedGridBoneObject = createBoneObject(skinnedGridBoneArrayBuffer, 4);

  const computeBoneMatrices = () => {

  }


  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const projectionMatrix = getProjectionMatrix();
    const viewMatrix = getViewMatrix();
    const modelMatrix = getModelMatrix();

    device.queue.writeBuffer(
      cameraBuffer,
      0,
      projectionMatrix.buffer,
      projectionMatrix.byteOffset,
      projectionMatrix.byteLength
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
    
    gltfRenderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();
    
    skinnedGridRenderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    if (settings.object === 'Whale') {
      const passEncoder = commandEncoder.beginRenderPass(gltfRenderPassDescriptor);
      //mesh.render(passEncoder, bgDescriptor.bindGroups[0]);
      whaleScene.meshes[0].render(passEncoder, cameraBGCluster.bindGroups[0]);
      passEncoder.end();
    } else {
      const passEncoder = commandEncoder.beginRenderPass(skinnedGridRenderPassDescriptor);
      passEncoder.setPipeline(skinnedGridPipeline);
      passEncoder.setBindGroup(0, cameraBGCluster.bindGroups[0]);
      passEncoder.setBindGroup(1, skinnedGridBoneBGCluster.bindGroups[0]);
      passEncoder.setVertexBuffer(0, skinnedGridVertexBuffers.vertPositions);
      passEncoder.setVertexBuffer(1, skinnedGridVertexBuffers.boneIndices);
      passEncoder.setVertexBuffer(2, skinnedGridVertexBuffers.boneWeights);
      passEncoder.setIndexBuffer(skinnedGridVertexBuffers.vertIndices, 'uint16');
      passEncoder.drawIndexed(gridIndices.length, 1);
      passEncoder.end();
    }

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
        name: './gridData.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./gridData.ts').default,
      },
      {
        name: './gridUtils.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./gridUtils.ts').default,
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
    ],
    filename: __filename,
  });

export default skinnedMesh;