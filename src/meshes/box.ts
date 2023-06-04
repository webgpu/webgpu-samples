import { vec3 } from 'wgpu-matrix';
import { Mesh } from './mesh';

export interface BoxMesh extends Mesh {
  vertices: Float32Array;
  indices: Uint16Array;
}

export const BoxLayout = {
  vertexStride: 8 * 4,
  positionsOffset: 0,
  normalOffset: 3 * 4,
  uvOffset: 6 * 4,
};

//// Borrowed and simplified from https://github.com/mrdoob/three.js/blob/master/src/geometries/BoxGeometry.js
//// Presumes vertex buffer alignment of verts, normals, and uvs
export const createBoxMesh = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  heightSegments = 1.0,
  depthSegments = 1.0
): BoxMesh => {
  widthSegments = Math.floor(widthSegments);
  heightSegments = Math.floor(heightSegments);
  depthSegments = Math.floor(depthSegments);

  const indices = [];
  const vertNormalUVBuffer = [];

  let numVertices = 0;

  const buildPlane = (
    u: 0 | 1 | 2,
    v: 0 | 1 | 2,
    w: 0 | 1 | 2,
    udir: -1 | 1,
    vdir: -1 | 1,
    planeWidth: number,
    planeHeight: number,
    planeDepth: number,
    xSections: number,
    ySections: number
  ) => {
    const segmentWidth = planeWidth / xSections;
    const segmentHeight = planeHeight / ySections;

    const widthHalf = planeWidth / 2;
    const heightHalf = planeHeight / 2;
    const depthHalf = planeDepth / 2;

    const gridX1 = xSections + 1;
    const gridY1 = ySections + 1;

    let vertexCounter = 0;

    const vertex = vec3.create();
    const normal = vec3.create();
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf;

      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf;

        //Calculate plane vertices
        vertex[u] = x * udir;
        vertex[v] = y * vdir;
        vertex[w] = depthHalf;
        vertNormalUVBuffer.push(...vertex);

        //Caclulate normal
        normal[u] = 0;
        normal[v] = 0;
        normal[w] = depth > 0 ? 1.0 : -1.0;
        vertNormalUVBuffer.push(...normal);

        //Calculate uvs
        vertNormalUVBuffer.push(ix / xSections);
        vertNormalUVBuffer.push(1 - iy / ySections);

        // counters

        vertexCounter += 1;
      }
    }

    for (let iy = 0; iy < ySections; iy++) {
      for (let ix = 0; ix < xSections; ix++) {
        const a = numVertices + ix + gridX1 * iy;
        const b = numVertices + ix + gridX1 * (iy + 1);
        const c = numVertices + (ix + 1) + gridX1 * (iy + 1);
        const d = numVertices + (ix + 1) + gridX1 * iy;

        //Push vertex indices
        //6 indices for each face
        indices.push(a, b, d);
        indices.push(b, c, d);

        numVertices += vertexCounter;
      }
    }
  };

  buildPlane(
    2,
    1,
    0,
    -1,
    -1,
    depth,
    height,
    width,
    depthSegments,
    heightSegments
  );

  buildPlane(
    2,
    1,
    0,
    1,
    -1,
    depth,
    height,
    -width,
    depthSegments,
    heightSegments
  );

  buildPlane(0, 2, 1, 1, 1, width, depth, height, widthSegments, depthSegments);

  buildPlane(
    0,
    2,
    1,
    1,
    -1,
    width,
    depth,
    -height,
    widthSegments,
    depthSegments
  );

  buildPlane(
    0,
    1,
    2,
    1,
    -1,
    width,
    height,
    depth,
    widthSegments,
    heightSegments
  );

  buildPlane(
    0,
    1,
    2,
    -1,
    -1,
    width,
    height,
    -depth,
    widthSegments,
    heightSegments
  );

  console.log(`Number of indices: ${indices.length}`);

  return {
    vertices: new Float32Array(vertNormalUVBuffer),
    indices: new Uint16Array(indices),
  };
};
