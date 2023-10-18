import { vec3, vec2 } from 'wgpu-matrix';

export interface Renderable {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  bindGroup?: GPUBindGroup;
}

export interface Mesh {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexStride: number;
}

type MeshLayoutType = {
  vertexStride: number;
  positionsOffset: number;
  normalOffset: number;
  uvOffset: number;
  tangentOffset?: number;
  bitangentOffset?: number;
};

export interface MeshProperties {
  vertexProperties?: number;
  indexFormat?: GPUIndexFormat;
}

export enum VertexProperty {
  NONE = 0,
  POSITION = 1,
  NORMAL = 2,
  UV = 4,
  TANGENT = 8,
  BITANGENT = 16,
}

// All numbers represent byte offsets
const MeshLayout: MeshLayoutType = {
  vertexStride: 8 * 4, //32 byte vertex
  positionsOffset: 0, // pos at byte 0, 12 byte vec3
  normalOffset: 3 * 4, //normal at byte 12, 12 byte vec 3
  uvOffset: 6 * 4, //uv at byte 24, 8 byte vec2
};

export const createMeshRenderable = (
  device: GPUDevice,
  mesh: Mesh,
  storeVertices = false,
  storeIndices = false
): Renderable => {
  const vertexBufferUsage = storeVertices
    ? GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    : GPUBufferUsage.VERTEX;
  // Create a vertex buffer from the sphere data.

  const indexBufferUsage = storeIndices
    ? GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE
    : GPUBufferUsage.INDEX;
  console.log(`vertexBufferSize: ${mesh.vertices.byteLength}`);
  console.log(mesh.vertices);
  const vertexBuffer = device.createBuffer({
    size: mesh.vertices.byteLength,
    usage: vertexBufferUsage,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(mesh.vertices);
  vertexBuffer.unmap();

  const indexBuffer = device.createBuffer({
    size: mesh.indices.byteLength,
    usage: indexBufferUsage,
    mappedAtCreation: true,
  });

  if (
    mesh.indices.byteLength ===
    mesh.indices.length * Uint16Array.BYTES_PER_ELEMENT
  ) {
    console.log('mapping uint16 indices');
    new Uint16Array(indexBuffer.getMappedRange()).set(mesh.indices);
  } else {
    console.log('mapping uint32 indices');
    new Uint32Array(indexBuffer.getMappedRange()).set(mesh.indices);
  }

  indexBuffer.unmap();

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: mesh.indices.length,
  };
};

//Remeber that float32array asks for a byte offset then an element length
//NOTE: This code won't work for tangents and bitangents
export const getMeshPosAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * mesh.vertexStride + MeshLayout.positionsOffset,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshNormalAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * mesh.vertexStride + MeshLayout.normalOffset,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshUVAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * mesh.vertexStride + MeshLayout.uvOffset,
    2
  );
  return vec2.fromValues(arr[0], arr[1]);
};

//TODO: Fix Tangent and bitangent mesh creation to work with any mesh
export const addBaycentricCoordinatesToMesh = (mesh: Mesh) => {
  interface Triangle {
    a: number;
    b: number;
    c: number;
  }
  const significantTriangles: Triangle[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3).sort();
    significantTriangles.push({ a: a, b: b, c: c });
  }
  significantTriangles.sort((first, second) => {
    if (first.a < second.a) {
      return first.a - second.a;
    }
    if (first.b < second.b) {
      return first.b - second.b;
    }
    return first.c - second.c;
  });

  const red = vec3.create(255, 0, 0);

  const newVertices = [];

  //new vertex stride will be ((vertexStride / 4) + 3) * 4;

  console.log(mesh.vertexStride / Float32Array.BYTES_PER_ELEMENT);
  //Iterate through each of the original vertices (pos, normal, uv) + 3 new elements for color
  for (
    let i = 0;
    i < mesh.vertices.length;
    i += mesh.vertexStride / Float32Array.BYTES_PER_ELEMENT
  ) {
    const currentVertexInfo = mesh.vertices.slice(
      0,
      mesh.vertexStride / Float32Array.BYTES_PER_ELEMENT
    );
    newVertices.push(...currentVertexInfo);
    newVertices.push(...red);
  }
  //TODO: Make sure colors are not adjacent

  mesh.vertices = new Float32Array([...newVertices]);
  mesh.vertexStride = (mesh.vertexStride / 4 + 3) * 4;
  console.log(mesh.vertices);
};

export const calculateVertexStride = (vertexProperties: number) => {
  let vertexStride = 0;
  const bytesPerElement = Float32Array.BYTES_PER_ELEMENT;

  if (vertexProperties & VertexProperty.POSITION) {
    vertexStride += 3 * bytesPerElement;
  }

  if (vertexProperties & VertexProperty.NORMAL) {
    vertexStride += 3 * bytesPerElement;
  }

  if (vertexProperties & VertexProperty.UV) {
    vertexStride += 2 * bytesPerElement;
  }

  return vertexStride;
};
