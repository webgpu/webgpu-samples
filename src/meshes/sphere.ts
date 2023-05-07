import { vec3 } from 'wgpu-matrix';

export interface SphereMesh {
  vertices: Float32Array;
  indices: Uint16Array;
}

export const SphereLayout = {
  vertexStride: 8 * 4,
  positionsOffset: 0,
  normalOffset: 3 * 4,
  uvOffset: 6 * 4,
};

// Borrowed and simplified from https://github.com/mrdoob/three.js/blob/master/src/geometries/SphereGeometry.js
export function createSphereMesh(
  radius: number,
  widthSegments = 32,
  heightSegments = 16,
  randomness = 0
): SphereMesh {
  const vertices = [];
  const indices = [];

  widthSegments = Math.max(3, Math.floor(widthSegments));
  heightSegments = Math.max(2, Math.floor(heightSegments));

  const firstVertex = vec3.create();
  const vertex = vec3.create();
  const normal = vec3.create();

  let index = 0;
  const grid = [];

  // generate vertices, normals and uvs
  for (let iy = 0; iy <= heightSegments; iy++) {
    const verticesRow = [];
    const v = iy / heightSegments;

    // special case for the poles
    let uOffset = 0;
    if (iy === 0) {
      uOffset = 0.5 / widthSegments;
    } else if (iy === heightSegments) {
      uOffset = -0.5 / widthSegments;
    }

    for (let ix = 0; ix <= widthSegments; ix++) {
      const u = ix / widthSegments;

      // Poles should just use the same position all the way around.
      if (ix == widthSegments) {
        vec3.copy(firstVertex, vertex);
      } else if (ix == 0 || (iy != 0 && iy !== heightSegments)) {
        const rr = radius + (Math.random() - 0.5) * 2 * randomness * radius;

        // vertex
        vertex[0] = -rr * Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);
        vertex[1] = rr * Math.cos(v * Math.PI);
        vertex[2] = rr * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);

        if (ix == 0) {
          vec3.copy(vertex, firstVertex);
        }
      }

      vertices.push(...vertex);

      // normal
      vec3.copy(vertex, normal);
      vec3.normalize(normal, normal);
      vertices.push(...normal);

      // uv
      vertices.push(u + uOffset, 1 - v);
      verticesRow.push(index++);
    }

    grid.push(verticesRow);
  }

  // indices
  for (let iy = 0; iy < heightSegments; iy++) {
    for (let ix = 0; ix < widthSegments; ix++) {
      const a = grid[iy][ix + 1];
      const b = grid[iy][ix];
      const c = grid[iy + 1][ix];
      const d = grid[iy + 1][ix + 1];

      if (iy !== 0) indices.push(a, b, d);
      if (iy !== heightSegments - 1) indices.push(b, c, d);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
}
