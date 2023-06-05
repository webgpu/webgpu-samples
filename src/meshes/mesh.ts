import { vec3, vec2 } from 'wgpu-matrix';

export interface Renderable {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  bindGroup?: GPUBindGroup;
}

export interface Mesh {
  vertices: Float32Array;
  indices: Uint16Array;
}

type MeshLayoutType = {
  vertexStride: number;
  positionsOffset: number;
  normalOffset: number;
  uvOffset: number;
  tangentOffset?: number;
  bitangentOffset?: number;
};

// All numbers represent byte offsets
const MeshLayout: MeshLayoutType = {
  vertexStride: 8 * 4, //32 byte vertex
  positionsOffset: 0, // pos at byte 0, 12 byte vec3
  normalOffset: 3 * 4, //normal at byte 12, 12 byte vec 3
  uvOffset: 6 * 4, //uv at byte 24, 8 byte vec2
};

const TangentMeshLayout: MeshLayoutType = {
  vertexStride: 14 * 4, //56 byte vertex
  positionsOffset: 0, // pos at byte 0, 12 byte vec3
  normalOffset: 3 * 4, //normal at byte 12, 12 byte vec 3
  uvOffset: 6 * 4, //uv at byte 24, 8 byte vec2
  tangentOffset: 8 * 4, //tangent at byte 32, 12 byte vec3
  bitangentOffset: 11 * 4, //bitangent at byte 44, 12 byte vec3
};

const s = TangentMeshLayout;
s.normalOffset = 4;

export const createMeshRenderable = (
  device: GPUDevice,
  mesh: Mesh
): Renderable => {
  // Create a vertex buffer from the sphere data.
  const vertexBuffer = device.createBuffer({
    size: mesh.vertices.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(mesh.vertices);
  vertexBuffer.unmap();

  const indexBuffer = device.createBuffer({
    size: mesh.indices.byteLength,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true,
  });

  new Uint16Array(indexBuffer.getMappedRange()).set(mesh.indices);
  indexBuffer.unmap();

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: mesh.indices.length,
  };
};

export enum MESH_VERTEX_FEATURE {
  TANGENT = 1,
  BITANGENT = 2,
}

interface CreateMeshVertexBufferLayoutFeatures {
  features: number;
}

export const createMeshVertexBufferLayout = (
  config: CreateMeshVertexBufferLayoutFeatures = { features: 0 }
): Iterable<GPUVertexBufferLayout> => {
  const { features } = config;
  let vertexStride = MeshLayout.vertexStride;

  const attributeBase: GPUVertexAttribute[] = [
    {
      // position
      shaderLocation: 0,
      offset: MeshLayout.positionsOffset,
      format: 'float32x3',
    },
    {
      // normal
      shaderLocation: 1,
      offset: MeshLayout.normalOffset,
      format: 'float32x3',
    },
    {
      // uv
      shaderLocation: 2,
      offset: MeshLayout.uvOffset,
      format: 'float32x2',
    },
  ];

  if (features & MESH_VERTEX_FEATURE.TANGENT) {
    attributeBase.push({
      //tangent
      shaderLocation: attributeBase.length,
      offset: vertexStride,
      format: 'float32x3',
    });

    vertexStride += Float32Array.BYTES_PER_ELEMENT * 3;
  }

  if (features & MESH_VERTEX_FEATURE.BITANGENT) {
    attributeBase.push({
      //bitangent,
      shaderLocation: attributeBase.length,
      offset: vertexStride,
      format: 'float32x3',
    });

    vertexStride += Float32Array.BYTES_PER_ELEMENT * 3;
  }

  //NOTE: Change this in instance where we need different kinds of vertex buffers
  //for different types of meshes
  const layout: Iterable<GPUVertexBufferLayout> = [
    {
      arrayStride: vertexStride,
      attributes: [
        {
          // position
          shaderLocation: 0,
          offset: MeshLayout.positionsOffset,
          format: 'float32x3',
        },
        {
          // normal
          shaderLocation: 1,
          offset: MeshLayout.normalOffset,
          format: 'float32x3',
        },
        {
          // uv
          shaderLocation: 2,
          offset: MeshLayout.uvOffset,
          format: 'float32x2',
        },
      ],
    },
  ];

  return layout;
};

//Remeber that float32array asks for a byte offset then an element length
export const getMeshPosAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * MeshLayout.vertexStride + MeshLayout.positionsOffset,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshNormalAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * MeshLayout.vertexStride + MeshLayout.normalOffset,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshUVAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * MeshLayout.vertexStride + MeshLayout.uvOffset,
    2
  );
  return vec2.fromValues(arr[0], arr[1]);
};
