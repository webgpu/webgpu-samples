export const geometryVertexSize = 4 * 8; // Byte size of one geometry vertex.
export const geometryPositionOffset = 0;
export const geometryColorOffset = 4 * 4; // Byte offset of geometry vertex color attribute.
export const geometryDrawCount = 6 * 2;

const d = 0.0001;
const o = 0.5;

// Two planes close to each other for depth precision test

// prettier-ignore
export const geometryVertexArray = new Float32Array([
  // float4 position, float4 color
  -1 - o, -1, d, 1, 1, 0, 0, 1, 
  1 - o, -1, d, 1,  1, 0, 0, 1, 
  -1 - o, 1, d, 1,  1, 0, 0, 1, 
  1 - o, -1,  d, 1, 1, 0, 0, 1, 
  1 - o, 1,  d, 1,  1, 0, 0, 1,
  -1 - o, 1, d, 1,  1, 0, 0, 1, 
 
  -1 + o, -1, -d, 1, 0, 1, 0, 1, 
  1 + o, -1, -d, 1,  0, 1, 0, 1, 
  -1 + o, 1, -d, 1,  0, 1, 0, 1, 
  1 + o, -1,  -d, 1, 0, 1, 0, 1, 
  1 + o, 1,  -d, 1,  0, 1, 0, 1, 
  -1 + o, 1, -d, 1,  0, 1, 0, 1, 
]);
