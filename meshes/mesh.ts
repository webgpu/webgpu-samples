import { vec3, vec2 } from 'wgpu-matrix';

// Defines what to pass to pipeline to render mesh
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

/**
 * @param {GPUDevice} device - A valid GPUDevice.
 * @param {Mesh} mesh - An indexed triangle-list mesh, containing its vertices, indices, and vertexStride (number of elements per vertex).
 * @param {boolean} storeVertices - A boolean flag indicating whether the vertexBuffer should be available to use as a storage buffer.
 * @returns {boolean} An object containing an array of bindGroups and the bindGroupLayout they implement.
 */
export const createMeshRenderable = (
  device: GPUDevice,
  mesh: Mesh,
  storeVertices = false,
  storeIndices = false
): Renderable => {
  // Define buffer usage
  const vertexBufferUsage = storeVertices
    ? GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    : GPUBufferUsage.VERTEX;
  const indexBufferUsage = storeIndices
    ? GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE
    : GPUBufferUsage.INDEX;

  // Create vertex and index buffers
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

  // Determine whether index buffer is indices are in uint16 or uint32 format
  if (
    mesh.indices.byteLength ===
    mesh.indices.length * Uint16Array.BYTES_PER_ELEMENT
  ) {
    new Uint16Array(indexBuffer.getMappedRange()).set(mesh.indices);
  } else {
    new Uint32Array(indexBuffer.getMappedRange()).set(mesh.indices);
  }

  indexBuffer.unmap();

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: mesh.indices.length,
  };
};

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
