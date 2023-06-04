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

// All numbers represent byte offsets
const MeshLayout = {
  vertexStride: 8 * 4, //32 byte vertex
  positionsOffset: 0,
  normalOffset: 3 * 4, //normal at byte 12
  uvOffset: 6 * 4, //uv at byte 24
};

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

export const MeshVertexBufferLayout: Iterable<GPUVertexBufferLayout> = [
  {
    arrayStride: MeshLayout.vertexStride,
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
