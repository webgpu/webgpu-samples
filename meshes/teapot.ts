import teapotData from 'teapot';
import { computeSurfaceNormals } from './utils';

export const mesh = {
  positions: teapotData.positions as [number, number, number][],
  triangles: teapotData.cells as [number, number, number][],
  normals: [] as [number, number, number][],
};

// Compute surface normals
mesh.normals = computeSurfaceNormals(mesh.positions, mesh.triangles);
