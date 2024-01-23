/* eslint-disable prettier/prettier */
import { makeSample, SampleInit } from '../../components/SampleLayout';
import { convertGLBToJSONAndBinary, GLTFNode } from './glbUtils';
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
  bindPosesInv: Mat4[];
  uniforms: Mat4[];
}

enum RenderMode {
  NORMAL,
  JOINTS,
  WEIGHTS,
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
    cameraY: 0,
    cameraZ: -10.7,
    objectScale: 1,
    angle: 0.8,
    speed: 10,
    object: 'Whale',
    renderMode: 'NORMAL',
  };

  gui.add(settings, 'object', ['Whale', 'Skinned Grid']).onChange(() => {
    if (settings.object === 'Skinned Grid') {
      cameraXController.setValue(-10);
      cameraYController.setValue(0);
      objectScaleController.setValue(1.27);
    } else {
      cameraXController.setValue(0);
      cameraYController.setValue(0);
      cameraZController.setValue(-10.7);
      objectScaleController.setValue(1);
    }
  });
  gui.add(settings, 'renderMode', ['NORMAL', 'JOINTS', 'WEIGHTS']).onChange(() => {
    device.queue.writeBuffer(generalUniformsBuffer, 0, new Uint32Array([RenderMode[settings.renderMode]]));
  });
  const cameraFolder = gui.addFolder('Camera Settings');
  const cameraXController = cameraFolder.add(settings, 'cameraX', -10, 10).step(0.1);
  const cameraYController = cameraFolder.add(settings, 'cameraY', -10, 10).step(0.1);
  const cameraZController = cameraFolder.add(settings, 'cameraZ', -100, 0).step(0.1);
  const objectScaleController = cameraFolder.add(settings, 'objectScale', 0.01, 10).step(0.01);
  const animFolder = gui.addFolder('Animation Settings');
  animFolder.add(settings, 'angle', 0.1, 1.0).step(0.1);
  animFolder.add(settings, 'speed', 10, 100).step(10);

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

  const generalUniformsBuffer = device.createBuffer({
    size: Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const generalUniformsBGCLuster = createBindGroupCluster(
    [0],
    [GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT],
    ['buffer'],
    [{ type: 'uniform' }],
    [[{ buffer: generalUniformsBuffer }]],
    'General',
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
    [cameraBGCluster.bindGroupLayout, generalUniformsBGCLuster.bindGroupLayout],
  );

  // Create grid resources
  const skinnedGridVertexBuffers = createSkinnedGridBuffers(device);
  //const skinnedGridBoneArrayBuffer = new Float32Array(4 * 16);
  const skinnedGridBoneUniformBuffer = device.createBuffer({
    // 5 4x4 matrices, one for each bone
    size: MAT4X4_BYTES * 5,
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
    [cameraBGCluster.bindGroupLayout, generalUniformsBGCLuster.bindGroupLayout, skinnedGridBoneBGCluster.bindGroupLayout]
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
    if (settings.object === 'Skinned Grid') {
      mat4.translate(viewMatrix, vec3.fromValues(settings.cameraX * settings.objectScale, settings.cameraY * settings.objectScale, settings.cameraZ), viewMatrix);
    } else {
      mat4.translate(viewMatrix, vec3.fromValues(settings.cameraX, settings.cameraY, settings.cameraZ), viewMatrix);
    }
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

  const computeBoneMatrices = (boneTransforms: Mat4[], angle: number) => {
    const m = mat4.identity();
    mat4.rotateZ(m, angle, boneTransforms[0]);
    mat4.translate(boneTransforms[0], vec3.create(4, 0, 0), m);
    mat4.rotateZ(m, angle, boneTransforms[1]);
    mat4.translate(boneTransforms[1], vec3.create(4, 0, 0), m);
    mat4.rotateZ(m, angle, boneTransforms[2]);
  }

  // Create a group of bones
  // Each index associates an actual bone to its transforms, bindPoses, uniforms, etc
  const createBoneCollection = (numBones: number): BoneObject => {
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
      uniforms.push(mat4.identity())
    }

    // Get initial bind pose positions
    computeBoneMatrices(bindPoses, 0);
    const bindPosesInv = bindPoses.map((bindPose) => {
      return mat4.inverse(bindPose)
    });


    return {
      transforms,
      bindPoses,
      bindPosesInv,
      uniforms,
    }
  }

  const gridBoneCollection = createBoneCollection(5);

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    // Calculate camera matrices
    const projectionMatrix = getProjectionMatrix();
    const viewMatrix = getViewMatrix();
    const modelMatrix = getModelMatrix();

    // Calculate bone transformation
    const t = Date.now() / 20000 * settings.speed;
    const angle = Math.sin(t) * settings.angle;
    // Compute Transforms when angle is applied
    computeBoneMatrices(gridBoneCollection.transforms, angle);
    gridBoneCollection.transforms.forEach((boneTransform, idx) => {
      // Apply inverseBindPose to normal transform to get transform passed to our uniforms
      mat4.multiply(boneTransform, gridBoneCollection.bindPosesInv[idx], gridBoneCollection.uniforms[idx])
    });

    // Write to global camera buffer
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

    // Somewhat of a hacky approach
    // We know wour whale scene 
    device.queue.writeBuffer(
      cameraBuffer,
      128,
      modelMatrix.buffer,
      modelMatrix.byteOffset,
      modelMatrix.byteLength
    )

    // Write to skinned grid bone uniform buffer
    for (let i = 0; i < gridBoneCollection.uniforms.length; i++) {
      device.queue.writeBuffer(skinnedGridBoneUniformBuffer, i * 64, gridBoneCollection.uniforms[i] as Float32Array)
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
      for (const scene of whaleScene.scenes) {
        //scene.root.updateWorldMatrix();
        scene.root.renderDrawables(passEncoder, [cameraBGCluster.bindGroups[0], generalUniformsBGCLuster.bindGroups[0]]);
      }
      //whaleScene.meshes[0].render(passEncoder, cameraBGCluster.bindGroups[0]);
      passEncoder.end();
    } else {
      const passEncoder = commandEncoder.beginRenderPass(skinnedGridRenderPassDescriptor);
      passEncoder.setPipeline(skinnedGridPipeline);
      passEncoder.setBindGroup(0, cameraBGCluster.bindGroups[0]);
      passEncoder.setBindGroup(1, generalUniformsBGCLuster.bindGroups[0]);
      passEncoder.setBindGroup(2, skinnedGridBoneBGCluster.bindGroups[0]);
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
        name: './grid.wgsl',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!./grid.wgsl').default,
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