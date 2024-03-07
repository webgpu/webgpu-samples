/* eslint-disable prettier/prettier */
export const gridVertices = new Float32Array([
  // B0
  0,  1,  // 0 
  0, -1,  // 1
  // CONNECTOR
  2,  1,  // 2
  2, -1,  // 3
  // B1
  4,  1,  // 4
  4, -1,  // 5
  // CONNECTOR
  6,  1,  // 6
  6, -1,  // 7
  // B2
  8,  1,  // 8
  8, -1, // 9,
  // CONNECTOR
  10, 1, //10
  10, -1, //11
  // B3
  12, 1, //12
  12, -1, //13
]);

// Representing the indice of four bones that can influence each vertex
export const gridJoints = new Uint32Array([
  0, 0, 0, 0,  // Vertex 0 is influenced by bone 0
  0, 0, 0, 0,  // 1
  0, 1, 0, 0,  // 2
  0, 1, 0, 0,  // 3
  1, 0, 0, 0,  // 4
  1, 0, 0, 0,  // 5
  1, 2, 0, 0,  // Vertex 6 is influenced by bone 1 and bone 2
  1, 2, 0, 0,  // 7
  2, 0, 0, 0,  // 8
  2, 0, 0, 0,  // 9
  1, 2, 3, 0,  //10
  1, 2, 3, 0,  //11
  2, 3, 0, 0,  //12
  2, 3, 0, 0,  //13
])

// The weights applied when ve
export const gridWeights = new Float32Array([
  // B0
  1, 0, 0, 0,  // 0
  1, 0, 0, 0,  // 1
  // CONNECTOR
 .5,.5, 0, 0,  // 2
 .5,.5, 0, 0,  // 3
  // B1
  1, 0, 0, 0,  // 4
  1, 0, 0, 0,  // 5
  // CONNECTOR
 .5,.5, 0, 0,  // 6
 .5,.5, 0, 0,  // 7
  // B2
  1, 0, 0, 0,  // 8
  1, 0, 0, 0,  // 9
   // CONNECTOR
 .5,.5, 0, 0,  // 10
 .5,.5, 0, 0,  // 11
  // B3
  1, 0, 0, 0,  // 12
  1, 0, 0, 0,  // 13
]);

// Using data above...
// Vertex 0 is influenced by bone 0 with a weight of 1 
// Vertex 1 is influenced by bone 1 with a weight of 1
// Vertex 2 is influenced by bone 0 and 1 with a weight of 0.5 each
// and so on..
// Although a vertex can hypothetically be influenced by 4 bones,
// in this example, we stick to each vertex being infleunced by only two
// although there can be downstream effects of parent bones influencing child bones
// that influence their own children

export const gridIndices = new Uint16Array([
  // B0
  0, 1,
  0, 2,
  1, 3,
  // CONNECTOR
  2, 3, //
  2, 4,
  3, 5,
  // B1
  4, 5,
  4, 6,
  5, 7, 
  // CONNECTOR
  6, 7,
  6, 8,
  7, 9,
  // B2
  8, 9,
  8, 10,
  9, 11,
  // CONNECTOR
  10, 11,
  10, 12,
  11, 13,
  // B3
  12, 13,
]);