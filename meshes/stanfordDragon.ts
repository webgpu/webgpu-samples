import dragonRawData from './stanfordDragonData';
import { computeProjectedPlaneUVs, generateNormals } from './utils';

const { positions, normals, triangles } = generateNormals(
  Math.PI,
  dragonRawData.positions as [number, number, number][],
  dragonRawData.cells as [number, number, number][]
);

const uvs = computeProjectedPlaneUVs(positions, 'xy');

// Push indices for an additional ground plane
triangles.push(
  [positions.length, positions.length + 2, positions.length + 1],
  [positions.length, positions.length + 1, positions.length + 3]
);

// Push vertex attributes for an additional ground plane
// prettier-ignore
positions.push(
  [-100, 20, -100], //
  [ 100, 20,  100], //
  [-100, 20,  100], //
  [ 100, 20, -100]
);
normals.push(
  [0, 1, 0], //
  [0, 1, 0], //
  [0, 1, 0], //
  [0, 1, 0]
);
uvs.push(
  [0, 0], //
  [1, 1], //
  [0, 1], //
  [1, 0]
);

export const mesh = {
  positions,
  triangles,
  normals,
  uvs,
};
