import { mat4, vec3 } from 'gl-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from '../../meshes/cube';

import basicVertWGSL from '../../shaders/basic.vert.wgsl';
import sampleCubemapWGSL from './sampleCubemap.frag.wgsl';

const init: SampleInit = async ({ canvasRef }) => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  if (canvasRef.current === null) return;
  const context = canvasRef.current.getContext('webgpu');

  const devicePixelRatio = window.devicePixelRatio || 1;
  const presentationSize = [
    canvasRef.current.clientWidth * devicePixelRatio,
    canvasRef.current.clientHeight * devicePixelRatio,
  ];
  const presentationFormat = context.getPreferredFormat(adapter);

  context.configure({
    device,
    format: presentationFormat,
    size: presentationSize,
  });

  // Create a vertex buffer from the cube data.
  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: 'float32x4',
            },
            {
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({
        code: sampleCubemapWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',

      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: 'back',
      // cullMode: 'none',
    },

    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  const depthTexture = device.createTexture({
    size: presentationSize,
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Fetch the image and upload it into a GPUTexture.
  // Make the cubemap from 6 separate images for negative/positive x, y, z axis
  let cubemapTexture: GPUTexture;
  {
    // The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
    const imgSrcs = [
      require(`../../../assets/img/cubemap/posx.jpg`),
      require(`../../../assets/img/cubemap/negx.jpg`),
      require(`../../../assets/img/cubemap/posy.jpg`),
      require(`../../../assets/img/cubemap/negy.jpg`),
      require(`../../../assets/img/cubemap/posz.jpg`),
      require(`../../../assets/img/cubemap/negz.jpg`),
    ];
    const promises = imgSrcs.map(src => {
      const img = document.createElement('img');
      img.src = src;
      return img.decode().then(() => createImageBitmap(img));
    })
    const imageBitmaps = await Promise.all(promises);

    cubemapTexture = device.createTexture({
      dimension: '2d',
      // Assume each image has the same size
      // Create a 2d array texture
      size: [imageBitmaps[0].width, imageBitmaps[0].height, 6],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    let i = 0;
    for (const imageBitmap of imageBitmaps) {
      device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: cubemapTexture, origin: [0, 0, i] },
        [imageBitmap.width, imageBitmap.height],
      );
      i++;
    }
  }

  const matrixSize = 4 * 16; // 4x4 matrix
  const offset = 256; // uniformBindGroup offset must be 256-byte aligned
  const uniformBufferSize = offset + matrixSize;

  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const uniformBindGroup1 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: matrixSize,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: cubemapTexture.createView({
          dimension: 'cube',
        }),
      },
    ],
  });

  const uniformBindGroup2 = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: offset,
          size: matrixSize,
        },
      },
      {
        binding: 1,
        resource: sampler,
      },
      {
        binding: 2,
        resource: cubemapTexture.createView({
          dimension: 'cube',
        }),
      },
    ],
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
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

  const aspect = presentationSize[0] / presentationSize[1];
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);

  const modelMatrix1 = mat4.create();
  mat4.translate(modelMatrix1, modelMatrix1, vec3.fromValues(-2, 0, 0));
  // mat4.scale(modelMatrix1, modelMatrix1, vec3.fromValues(10, 10, 10));
  const modelMatrix2 = mat4.create();
  mat4.translate(modelMatrix2, modelMatrix2, vec3.fromValues(2, 0, 0));
  const modelViewProjectionMatrix1 = mat4.create() as Float32Array;
  const modelViewProjectionMatrix2 = mat4.create() as Float32Array;
  const viewMatrix = mat4.create();
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -7));

  const tmpMat41 = mat4.create();
  const tmpMat42 = mat4.create();

  function updateTransformationMatrix() {
    const now = Date.now() / 1000;

    mat4.rotate(
      tmpMat41,
      modelMatrix1,
      1,
      vec3.fromValues(Math.sin(now), Math.cos(now), 0)
    );
    mat4.rotate(
      tmpMat42,
      modelMatrix2,
      1,
      vec3.fromValues(Math.cos(now), Math.sin(now), 0)
    );

    mat4.multiply(modelViewProjectionMatrix1, viewMatrix, tmpMat41);
    mat4.multiply(
      modelViewProjectionMatrix1,
      projectionMatrix,
      modelViewProjectionMatrix1
    );
    mat4.multiply(modelViewProjectionMatrix2, viewMatrix, tmpMat42);
    mat4.multiply(
      modelViewProjectionMatrix2,
      projectionMatrix,
      modelViewProjectionMatrix2
    );
  }

  function frame() {
    // Sample is no longer the active page.
    if (!canvasRef.current) return;

    updateTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjectionMatrix1.buffer,
      modelViewProjectionMatrix1.byteOffset,
      modelViewProjectionMatrix1.byteLength
    );
    device.queue.writeBuffer(
      uniformBuffer,
      offset,
      modelViewProjectionMatrix2.buffer,
      modelViewProjectionMatrix2.byteOffset,
      modelViewProjectionMatrix2.byteLength
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, verticesBuffer);

    // Bind the bind group (with the transformation matrix) for
    // each cube, and draw.
    passEncoder.setBindGroup(0, uniformBindGroup1);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);

    passEncoder.setBindGroup(0, uniformBindGroup2);
    passEncoder.draw(cubeVertexCount, 1, 0, 0);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

const CubemapCubes: () => JSX.Element = () =>
  makeSample({
    name: 'Cubemap',
    description:
      'This example shows how to render and sample texture cube and texture cube array.',
    init,
    sources: [
      {
        name: __filename.substr(__dirname.length + 1),
        contents: __SOURCE__,
      },
      {
        name: '../../shaders/basic.vert.wgsl',
        contents: basicVertWGSL,
        editable: true,
      },
      {
        name: './sampleCubemap.frag.wgsl',
        contents: sampleCubemapWGSL,
        editable: true,
      },
      {
        name: '../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default CubemapCubes;
