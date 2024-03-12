import { vec3, Vec3 } from 'wgpu-matrix';

export function computeSurfaceNormals(
  positions: [number, number, number][],
  triangles: [number, number, number][]
): [number, number, number][] {
  const normals: [number, number, number][] = positions.map(() => {
    // Initialize to zero.
    return [0, 0, 0];
  });
  triangles.forEach(([i0, i1, i2]) => {
    const p0 = positions[i0];
    const p1 = positions[i1];
    const p2 = positions[i2];

    const v0 = vec3.subtract(p1, p0);
    const v1 = vec3.subtract(p2, p0);

    vec3.normalize(v0, v0);
    vec3.normalize(v1, v1);
    const norm = vec3.cross(v0, v1);

    // Accumulate the normals.
    vec3.add(normals[i0], norm, normals[i0]);
    vec3.add(normals[i1], norm, normals[i1]);
    vec3.add(normals[i2], norm, normals[i2]);
  });
  normals.forEach((n) => {
    // Normalize accumulated normals.
    vec3.normalize(n, n);
  });

  return normals;
}

function makeTriangleIndicesFn(triangles: [number, number, number][]) {
  let triNdx = 0;
  let vNdx = 0;
  const fn = function () {
    const ndx = triangles[triNdx][vNdx++];
    if (vNdx === 3) {
      vNdx = 0;
      ++triNdx;
    }
    return ndx;
  };
  fn.reset = function () {
    triNdx = 0;
    vNdx = 0;
  };
  fn.numElements = triangles.length * 3;
  return fn;
}

// adapted from: https://webglfundamentals.org/webgl/lessons/webgl-3d-geometry-lathe.htmls
export function generateNormals(
  maxAngle: number,
  positions: [number, number, number][],
  triangles: [number, number, number][]
) {
  // first compute the normal of each face
  const getNextIndex = makeTriangleIndicesFn(triangles);
  const numFaceVerts = getNextIndex.numElements;
  const numVerts = positions.length;
  const numFaces = numFaceVerts / 3;
  const faceNormals: Vec3[] = [];

  // Compute the normal for every face.
  // While doing that, create a new vertex for every face vertex
  for (let i = 0; i < numFaces; ++i) {
    const n1 = getNextIndex();
    const n2 = getNextIndex();
    const n3 = getNextIndex();

    const v1 = positions[n1];
    const v2 = positions[n2];
    const v3 = positions[n3];

    faceNormals.push(
      vec3.normalize(vec3.cross(vec3.subtract(v2, v1), vec3.subtract(v3, v1)))
    );
  }

  let tempVerts = {};
  let tempVertNdx = 0;

  // this assumes vertex positions are an exact match

  function getVertIndex(vert: [number, number, number]): number {
    const vertId = JSON.stringify(vert);
    const ndx = tempVerts[vertId];
    if (ndx !== undefined) {
      return ndx;
    }
    const newNdx = tempVertNdx++;
    tempVerts[vertId] = newNdx;
    return newNdx;
  }

  // We need to figure out the shared vertices.
  // It's not as simple as looking at the faces (triangles)
  // because for example if we have a standard cylinder
  //
  //
  //      3-4
  //     /   \
  //    2     5   Looking down a cylinder starting at S
  //    |     |   and going around to E, E and S are not
  //    1     6   the same vertex in the data we have
  //     \   /    as they don't share UV coords.
  //      S/E
  //
  // the vertices at the start and end do not share vertices
  // since they have different UVs but if you don't consider
  // them to share vertices they will get the wrong normals

  const vertIndices: number[] = [];
  for (let i = 0; i < numVerts; ++i) {
    const vert = positions[i];
    vertIndices.push(getVertIndex(vert));
  }

  // go through every vertex and record which faces it's on
  const vertFaces: number[][] = [];
  getNextIndex.reset();
  for (let i = 0; i < numFaces; ++i) {
    for (let j = 0; j < 3; ++j) {
      const ndx = getNextIndex();
      const sharedNdx = vertIndices[ndx];
      let faces = vertFaces[sharedNdx];
      if (!faces) {
        faces = [];
        vertFaces[sharedNdx] = faces;
      }
      faces.push(i);
    }
  }

  // now go through every face and compute the normals for each
  // vertex of the face. Only include faces that aren't more than
  // maxAngle different. Add the result to arrays of newPositions,
  // newTexcoords and newNormals, discarding any vertices that
  // are the same.
  tempVerts = {};
  tempVertNdx = 0;
  const newPositions: [number, number, number][] = [];
  const newNormals: [number, number, number][] = [];

  function getNewVertIndex(
    position: [number, number, number],
    normal: [number, number, number]
  ) {
    const vertId = JSON.stringify({ position, normal });
    const ndx = tempVerts[vertId];
    if (ndx !== undefined) {
      return ndx;
    }
    const newNdx = tempVertNdx++;
    tempVerts[vertId] = newNdx;
    newPositions.push(position);
    newNormals.push(normal);
    return newNdx;
  }

  const newTriangles: [number, number, number][] = [];
  getNextIndex.reset();
  const maxAngleCos = Math.cos(maxAngle);
  // for each face
  for (let i = 0; i < numFaces; ++i) {
    // get the normal for this face
    const thisFaceNormal = faceNormals[i];
    // for each vertex on the face
    const newTriangle: number[] = [];
    for (let j = 0; j < 3; ++j) {
      const ndx = getNextIndex();
      const sharedNdx = vertIndices[ndx];
      const faces = vertFaces[sharedNdx];
      const norm = [0, 0, 0] as [number, number, number];
      faces.forEach((faceNdx: number) => {
        // is this face facing the same way
        const otherFaceNormal = faceNormals[faceNdx];
        const dot = vec3.dot(thisFaceNormal, otherFaceNormal);
        if (dot > maxAngleCos) {
          vec3.add(norm, otherFaceNormal, norm);
        }
      });
      vec3.normalize(norm, norm);
      newTriangle.push(getNewVertIndex(positions[ndx], norm));
    }
    newTriangles.push(newTriangle as [number, number, number]);
  }

  return {
    positions: newPositions,
    normals: newNormals,
    triangles: newTriangles,
  };
}

type ProjectedPlane = 'xy' | 'xz' | 'yz';

const projectedPlane2Ids: { [key in ProjectedPlane]: [number, number] } = {
  xy: [0, 1],
  xz: [0, 2],
  yz: [1, 2],
};

export function computeProjectedPlaneUVs(
  positions: [number, number, number][],
  projectedPlane: ProjectedPlane = 'xy'
): [number, number][] {
  const idxs = projectedPlane2Ids[projectedPlane];
  const uvs: [number, number][] = positions.map(() => {
    // Initialize to zero.
    return [0, 0];
  });
  const extentMin = [Infinity, Infinity];
  const extentMax = [-Infinity, -Infinity];
  positions.forEach((pos, i) => {
    // Simply project to the selected plane
    uvs[i][0] = pos[idxs[0]];
    uvs[i][1] = pos[idxs[1]];

    extentMin[0] = Math.min(pos[idxs[0]], extentMin[0]);
    extentMin[1] = Math.min(pos[idxs[1]], extentMin[1]);
    extentMax[0] = Math.max(pos[idxs[0]], extentMax[0]);
    extentMax[1] = Math.max(pos[idxs[1]], extentMax[1]);
  });
  uvs.forEach((uv) => {
    uv[0] = (uv[0] - extentMin[0]) / (extentMax[0] - extentMin[0]);
    uv[1] = (uv[1] - extentMin[1]) / (extentMax[1] - extentMin[1]);
  });
  return uvs;
}
