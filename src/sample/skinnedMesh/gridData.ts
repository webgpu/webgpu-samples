/* eslint-disable prettier/prettier */
export const gridVertices = new Float32Array([
  0,  1, 1, 1,  // 0
  0, -1, 1, 1,  // 1
  2,  1, 1, 1,  // 2
  2, -1, 1, 1,  // 3
  4,  1, 1, 1,  // 4
  4, -1, 1, 1,  // 5
  6,  1, 1, 1,  // 6
  6, -1, 1, 1,  // 7
  8,  1, 1, 1,  // 8
  8, -1, 1, 1  // 9
]);

// Representing the indice of four bones that can influence each vertex
export const gridBoneIndices = new Float32Array([
  0, 0, 0, 0,  // Vertex 0 is influenced by bone 0, bone 0, bone 0, bone 0
  0, 0, 0, 0,  // 1
  0, 1, 0, 0,  // 2
  0, 1, 0, 0,  // 3
  1, 0, 0, 0,  // 4
  1, 0, 0, 0,  // 5
  1, 2, 0, 0,  // Vertex 6 is influenced by bone 1, bone 2, and so on..
  1, 2, 0, 0,  // 7
  2, 0, 0, 0,  // 8
  2, 0, 0, 0,  // 9
])

// The weights applied when ve
export const gridBoneWeights = new Float32Array([
  1, 0, 0, 0,  // 0
  1, 0, 0, 0,  // 1
 .5,.5, 0, 0,  // 2
 .5,.5, 0, 0,  // 3
  1, 0, 0, 0,  // 4
  1, 0, 0, 0,  // 5
 .5,.5, 0, 0,  // 6
 .5,.5, 0, 0,  // 7
  1, 0, 0, 0,  // 8
  1, 0, 0, 0,  // 9
]);

export const gridIndices = new Uint16Array([
  0, 1,
  0, 2,
  1, 3,
  2, 3, //
  2, 4,
  3, 5,
  4, 5,
  4, 6,
  5, 7, //
  6, 7,
  6, 8,
  7, 9,
  8, 9,
]);