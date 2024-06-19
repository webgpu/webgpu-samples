// Ideally all the models would be the same format
// and we'd determine that format at build time or before
// but, we want to reuse the model data in this repo
// so we'll normalize it here

import { vec3 } from 'wgpu-matrix';
import { mesh as teapot } from '../../meshes/teapot';
import { createSphereMesh } from '../../meshes/sphere';

type Mesh = {
  positions: [number, number, number][];
  triangles: [number, number, number][];
  normals: [number, number, number][];
};

export function convertMeshToTypedArrays(
  mesh: Mesh,
  scale: number,
  offset = [0, 0, 0]
) {
  const { positions, normals, triangles } = mesh;
  const scaledPositions = positions.map((p) =>
    p.map((v, i) => v * scale + offset[i % 3])
  );
  const vertices = new Float32Array(scaledPositions.length * 6);
  for (let i = 0; i < scaledPositions.length; ++i) {
    vertices.set(scaledPositions[i], 6 * i);
    vertices.set(normals[i], 6 * i + 3);
  }
  const indices = new Uint32Array(triangles.length * 3);
  for (let i = 0; i < triangles.length; ++i) {
    indices.set(triangles[i], 3 * i);
  }

  return {
    vertices,
    indices,
  };
}

function createSphereTypedArrays(
  radius: number,
  widthSegments = 32,
  heightSegments = 16,
  randomness = 0
) {
  const { vertices: verticesWithUVs, indices } = createSphereMesh(
    radius,
    widthSegments,
    heightSegments,
    randomness
  );
  const numVertices = verticesWithUVs.length / 8;
  const vertices = new Float32Array(numVertices * 6);
  for (let i = 0; i < numVertices; ++i) {
    const srcNdx = i * 8;
    const dstNdx = i * 6;
    vertices.set(verticesWithUVs.subarray(srcNdx, srcNdx + 6), dstNdx);
  }
  return {
    vertices,
    indices: new Uint32Array(indices),
  };
}

function flattenNormals({
  vertices,
  indices,
}: {
  vertices: Float32Array;
  indices: Uint32Array;
}) {
  const newVertices = new Float32Array(indices.length * 6);
  const newIndices = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i += 3) {
    const positions = [];
    for (let j = 0; j < 3; ++j) {
      const ndx = indices[i + j];
      const srcNdx = ndx * 6;
      const dstNdx = (i + j) * 6;
      // copy position
      const pos = vertices.subarray(srcNdx, srcNdx + 3);
      newVertices.set(pos, dstNdx);
      positions.push(pos);
      newIndices[i + j] = i + j;
    }

    const normal = vec3.normalize(
      vec3.cross(
        vec3.normalize(vec3.subtract(positions[1], positions[0])),
        vec3.normalize(vec3.subtract(positions[2], positions[1]))
      )
    );

    for (let j = 0; j < 3; ++j) {
      const dstNdx = (i + j) * 6;
      newVertices.set(normal, dstNdx + 3);
    }
  }

  return {
    vertices: newVertices,
    indices: newIndices,
  };
}

export const modelData = {
  teapot: convertMeshToTypedArrays(teapot, 1.5),
  sphere: createSphereTypedArrays(20),
  jewel: flattenNormals(createSphereTypedArrays(20, 5, 3)),
  rock: flattenNormals(createSphereTypedArrays(20, 32, 16, 0.1)),
};
