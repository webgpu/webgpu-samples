import { mat4, vec3 } from 'wgpu-matrix';
import { makeSample, SampleInit } from '../../components/SampleLayout';

import normalMapWGSL from './normalMap.wgsl';
import {
  MESH_VERTEX_FEATURE,
  createMeshRenderable,
  createMeshVertexBufferLayout,
} from '../../meshes/mesh';
import { createBoxMesh } from '../../meshes/box';

const MAT4X4_BYTES = 64;

// Inspired by the following articles
// https://apoorvaj.io/exploring-bump-mapping-with-webgl/
// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
// https://toji.dev/webgpu-best-practices/bind-groups.html
const init: SampleInit = async ({ canvas, pageState, gui }) => {
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

  type GUISettings = {
    'Bump Mode':
      | 'None'
      | 'Normal w/o Tangent'
      | 'Normal with Tangent'
      | 'Parallax'
      | 'Steep Parallax'
      | 'Parallax Occlusion';
    'Parallax Scale': number;
    'Depth Layers': number;
    'Pre-Compute Tangents': boolean;
  };

  const settings: GUISettings = {
    'Bump Mode': 'None',
    'Parallax Scale': 0,
    'Depth Layers': 32,
    'Pre-Compute Tangents': false,
  };
  gui.add(settings, 'Bump Mode', [
    'None',
    'Normal w/o Tangent',
    'Normal with Tangent',
    'Parallax',
    'Steep Parallax',
    'Parallax Occlusion',
  ]);
  gui.add(settings, 'Parallax Scale', 0, 0.1, 0.01);
  gui.add(settings, 'Depth Layers', 1, 32, 1);
  gui.add(settings, 'Pre-Compute Tangents');

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: normalMapWGSL,
      }),
      entryPoint: 'vertexMain',
      buffers: createMeshVertexBufferLayout({
        features: MESH_VERTEX_FEATURE.TANGENT | MESH_VERTEX_FEATURE.BITANGENT,
      }),
    },
    fragment: {
      module: device.createShaderModule({
        code: normalMapWGSL,
      }),
      entryPoint: 'fragmentMain',
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
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  //3 4x4 mats, proj, view, normal
  const uniformBufferSize = MAT4X4_BYTES * 3;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const mapMethodBufferSize = 8; // u32
  const mapMethodBuffer = device.createBuffer({
    size: mapMethodBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Fetch the image and upload it into a GPUTexture.
  let woodTexture: GPUTexture;
  {
    const response = await fetch(
      new URL(
        '../../../assets/img/toy_box_diffuse.png',
        import.meta.url
      ).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    woodTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        //Going to be bound as a texture within a shader
        GPUTextureUsage.TEXTURE_BINDING |
        //Going to copy image data from CPU to GPU
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: woodTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  let woodNormalTexture: GPUTexture;
  {
    const response = await fetch(
      new URL(
        '../../../assets/img/toy_box_normal.png',
        import.meta.url
      ).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    woodNormalTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        //Going to be bound as a texture within a shader
        GPUTextureUsage.TEXTURE_BINDING |
        //Going to copy image data from CPU to GPU
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: woodNormalTexture },
      [imageBitmap.width, imageBitmap.height]
    );
  }

  let woodDiffuseTexture: GPUTexture;
  {
    const response = await fetch(
      new URL(
        '../../../assets/img/toy_box_disp.png',
        import.meta.url
      ).toString()
    );
    const imageBitmap = await createImageBitmap(await response.blob());

    woodDiffuseTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      usage:
        //Going to be bound as a texture within a shader
        GPUTextureUsage.TEXTURE_BINDING |
        //Going to copy image data from CPU to GPU
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: woodDiffuseTexture },
      [imageBitmap.width, imageBitmap.height]
    );
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

  const createToyboxBindGroup = (
    meshTexture: GPUTexture,
    normalTexture: GPUTexture,
    diffuseTexture: GPUTexture,
    transform: Float32Array
  ): GPUBindGroup => {
    const uniformBufferSize = 4 * 16; // 4x4 matrix
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(uniformBuffer.getMappedRange()).set(transform);
    uniformBuffer.unmap();

    const bindGroup = device.createBindGroup({
      //NOTE: Pipeline.getBindGroupLayout will only work if
      // 1. All the bindings are defined
      // 2. All the resources passed in through the bindGroup are used
      layout: pipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
        {
          binding: 1,
          resource: sampler,
        },
        {
          binding: 2,
          resource: meshTexture.createView(),
        },
        {
          binding: 3,
          resource: normalTexture.createView(),
        },
        {
          binding: 4,
          resource: diffuseTexture.createView(),
        },
      ],
    });
    return bindGroup;
  };

  const transform = mat4.create();
  mat4.identity(transform);

  const frameBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: mapMethodBuffer,
        },
      },
    ],
  });

  const toybox = createMeshRenderable(device, createBoxMesh(1.0, 1.0, 1.0));
  const toyboxBindGroup = createToyboxBindGroup(
    woodTexture,
    woodNormalTexture,
    woodDiffuseTexture,
    transform
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
    mat4.translate(viewMatrix, vec3.fromValues(0, 0, -2), viewMatrix);
    const now = Date.now() / 1000;
    mat4.rotateX(viewMatrix, 0.5 * now, viewMatrix);
    mat4.rotateY(viewMatrix, 1 * now, viewMatrix);
    return viewMatrix as Float32Array;
  }

  const getMappingType = (arr: Uint32Array) => {
    switch (settings['Bump Mode']) {
      case 'None':
        arr[0] = 0;
        break;
      case 'Normal w/o Tangent':
        arr[0] = 1;
        break;
      case 'Normal with Tangent':
        arr[1] = 2;
      case 'Parallax':
        arr[0] = 3;
        break;
      case 'Steep Parallax':
        arr[0] = 4;
        break;
      case 'Parallax Occlusion':
        arr[0] = 5;
        break;
    }
  };

  const mappingType: Uint32Array = new Uint32Array([0]);

  function frame() {
    // Sample is no longer the active page.
    if (!pageState.active) return;

    const viewMatrix = getViewMatrix();

    //I really wish all these different APIS
    //were consistent when they talk about bytes and elements

    device.queue.writeBuffer(
      uniformBuffer,
      0,
      projectionMatrix.buffer,
      projectionMatrix.byteOffset,
      projectionMatrix.byteLength
    );

    device.queue.writeBuffer(
      uniformBuffer,
      64,
      viewMatrix.buffer,
      viewMatrix.byteOffset,
      viewMatrix.byteLength
    );

    const normalMatrix = mat4.transpose(mat4.invert(transform)) as Float32Array;

    device.queue.writeBuffer(
      uniformBuffer,
      128,
      normalMatrix.buffer,
      normalMatrix.byteOffset,
      normalMatrix.byteLength
    );

    getMappingType(mappingType);

    device.queue.writeBuffer(
      mapMethodBuffer,
      0,
      mappingType.buffer,
      mappingType.byteOffset,
      mappingType.byteLength
    );

    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView();

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, frameBindGroup);
    passEncoder.setBindGroup(1, toyboxBindGroup);
    passEncoder.setVertexBuffer(0, toybox.vertexBuffer);
    passEncoder.setIndexBuffer(toybox.indexBuffer, 'uint16');
    passEncoder.drawIndexed(toybox.indexCount);
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
      'This example shows how to apply normal maps to a textured mesh.',
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
        name: '../../meshes/cube.ts',
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        contents: require('!!raw-loader!../../meshes/cube.ts').default,
      },
    ],
    filename: __filename,
  });

export default NormalMapping;
