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

export interface MeshProperties {
  vertexProperties?: number;
  indexFormat?: GPUIndexFormat;
}

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
    index * mesh.vertexStride + 0,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshNormalAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * mesh.vertexStride + 3 * Float32Array.BYTES_PER_ELEMENT,
    3
  );
  return vec3.fromValues(arr[0], arr[1], arr[2]);
};

export const getMeshUVAtIndex = (mesh: Mesh, index: number) => {
  const arr = new Float32Array(
    mesh.vertices.buffer,
    index * mesh.vertexStride + 6 * Float32Array.BYTES_PER_ELEMENT,
    2
  );
  return vec2.fromValues(arr[0], arr[1]);
};
