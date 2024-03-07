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
