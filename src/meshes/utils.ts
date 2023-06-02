import { vec3 } from 'wgpu-matrix';

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

type Vector3D = {
  x: number;
  y: number;
  z: number;
  w: number;
};

type Vertex3D = {
  x: number;
  y: number;
  z: number;
};

type VertexTriangle = {
  p: [Vertex3D, Vertex3D, Vertex3D];
};

export function computerVectorCrossProduct(
  v1: Vector3D,
  v2: Vector3D
): Vector3D {
  const v: Vector3D = {
    x: 0.0,
    y: 0.0,
    z: 0.0,
    w: 1.0,
  };
  v.x = v1.y * v2.z - v1.z * v2.y;
  v.y = v1.z * v2.x - v1.x * v2.z;
  v.z = v1.x * v2.y - v1.y * v2.x;
  return v;
}

export function computeTriangleNormal(tri: VertexTriangle): Vector3D {
  const A: Vector3D = {
    x: tri.p[1].x - tri.p[0].x,
    y: tri.p[1].y - tri.p[0].y,
    z: tri.p[1].z - tri.p[0].z,
    w: 1.0,
  };

  const B: Vector3D = {
    x: tri.p[2].x - tri.p[0].x,
    y: tri.p[2].y - tri.p[0].y,
    z: tri.p[2].z - tri.p[0].z,
    w: 1.0,
  };

  const normal = computerVectorCrossProduct(A, B);
  return normal;
}
