import { Mesh } from './mesh';

/**
 * Constructs a box mesh with the given dimensions.
 * The vertex buffer will have the following vertex fields (in the given order):
 *   position  : float32x3
 *   normal    : float32x3
 *   uv        : float32x2
 *   tangent   : float32x3
 *   bitangent : float32x3
 * @param width the width of the box
 * @param height the height of the box
 * @param depth the depth of the box
 * @returns the box mesh with tangent and bitangents.
 */
export function createBoxMeshWithTangents(
  width: number,
  height: number,
  depth: number
): Mesh {
  //    __________
  //   /         /|      y
  //  /   +y    / |      ^
  // /_________/  |      |
  // |         |+x|      +---> x
  // |   +z    |  |     /
  // |         | /     z
  // |_________|/
  //
  const pX = 0; // +x
  const nX = 1; // -x
  const pY = 2; // +y
  const nY = 3; // -y
  const pZ = 4; // +z
  const nZ = 5; // -z
  const faces = [
    { tangent: nZ, bitangent: pY, normal: pX },
    { tangent: pZ, bitangent: pY, normal: nX },
    { tangent: pX, bitangent: nZ, normal: pY },
    { tangent: pX, bitangent: pZ, normal: nY },
    { tangent: pX, bitangent: pY, normal: pZ },
    { tangent: nX, bitangent: pY, normal: nZ },
  ];
  const verticesPerSide = 4;
  const indicesPerSize = 6;
  const f32sPerVertex = 14; // position : vec3f, tangent : vec3f, bitangent : vec3f, normal : vec3f, uv :vec2f
  const vertexStride = f32sPerVertex * 4;
  const vertices = new Float32Array(
    faces.length * verticesPerSide * f32sPerVertex
  );
  const indices = new Uint16Array(faces.length * indicesPerSize);
  const halfVecs = [
    [+width / 2, 0, 0], // +x
    [-width / 2, 0, 0], // -x
    [0, +height / 2, 0], // +y
    [0, -height / 2, 0], // -y
    [0, 0, +depth / 2], // +z
    [0, 0, -depth / 2], // -z
  ];

  let vertexOffset = 0;
  let indexOffset = 0;
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex];
    const tangent = halfVecs[face.tangent];
    const bitangent = halfVecs[face.bitangent];
    const normal = halfVecs[face.normal];

    for (let u = 0; u < 2; u++) {
      for (let v = 0; v < 2; v++) {
        for (let i = 0; i < 3; i++) {
          vertices[vertexOffset++] =
            normal[i] +
            (u == 0 ? -1 : 1) * tangent[i] +
            (v == 0 ? -1 : 1) * bitangent[i];
        }
        for (let i = 0; i < 3; i++) {
          vertices[vertexOffset++] = normal[i];
        }
        vertices[vertexOffset++] = u;
        vertices[vertexOffset++] = v;
        for (let i = 0; i < 3; i++) {
          vertices[vertexOffset++] = tangent[i];
        }
        for (let i = 0; i < 3; i++) {
          vertices[vertexOffset++] = bitangent[i];
        }
      }
    }

    indices[indexOffset++] = faceIndex * verticesPerSide + 0;
    indices[indexOffset++] = faceIndex * verticesPerSide + 2;
    indices[indexOffset++] = faceIndex * verticesPerSide + 1;

    indices[indexOffset++] = faceIndex * verticesPerSide + 2;
    indices[indexOffset++] = faceIndex * verticesPerSide + 3;
    indices[indexOffset++] = faceIndex * verticesPerSide + 1;
  }

  return {
    vertices,
    indices,
    vertexStride,
  };
}
