/* adapted from https://github.com/greggman/webgpu-utils/blob/dev/src/primitives.ts */
import { Mat4, vec3 } from 'wgpu-matrix';

const kVertexSize = 8; // in float32 units

export type VertexData = {
  vertices: Float32Array;
  indices: Uint16Array;
};

/**
 * Creates XZ plane vertices.
 *
 * The created plane has position, normal, and texcoord data
 */
export function createPlaneVertices({
  width = 1,
  depth = 1,
  subdivisionsWidth = 1,
  subdivisionsDepth = 1,
} = {}): VertexData {
  const numVertices = (subdivisionsWidth + 1) * (subdivisionsDepth + 1);
  const vertices = new Float32Array(numVertices * kVertexSize);

  let cursor = 0;
  for (let z = 0; z <= subdivisionsDepth; z++) {
    for (let x = 0; x <= subdivisionsWidth; x++) {
      const u = x / subdivisionsWidth;
      const v = z / subdivisionsDepth;
      // prettier-ignore
      vertices.set([
        width * u - width * 0.5, 0, depth * v - depth * 0.5, // position
        0, 1, 0, // normal
        u, v, // texcoord
      ], cursor);
      cursor += kVertexSize;
    }
  }

  const numVertsAcross = subdivisionsWidth + 1;
  const indices = new Uint16Array(
    3 * subdivisionsWidth * subdivisionsDepth * 2
  );

  cursor = 0;
  for (let z = 0; z < subdivisionsDepth; z++) {  // eslint-disable-line
    for (let x = 0; x < subdivisionsWidth; x++) {  // eslint-disable-line
      // Make triangle 1 of quad.
      indices[cursor++] = (z + 0) * numVertsAcross + x;
      indices[cursor++] = (z + 1) * numVertsAcross + x;
      indices[cursor++] = (z + 0) * numVertsAcross + x + 1;

      // Make triangle 2 of quad.
      indices[cursor++] = (z + 1) * numVertsAcross + x;
      indices[cursor++] = (z + 1) * numVertsAcross + x + 1;
      indices[cursor++] = (z + 0) * numVertsAcross + x + 1;
    }
  }

  return { vertices, indices };
}

/**
 * Creates sphere vertices.
 *
 * The created sphere has position, normal, and texcoord data
 */
export function createSphereVertices({
  radius = 1,
  subdivisionsAxis = 24,
  subdivisionsHeight = 12,
  startLatitudeInRadians = 0,
  endLatitudeInRadians = Math.PI,
  startLongitudeInRadians = 0,
  endLongitudeInRadians = Math.PI * 2,
} = {}): VertexData {
  if (subdivisionsAxis <= 0 || subdivisionsHeight <= 0) {
    throw new Error('subdivisionAxis and subdivisionHeight must be > 0');
  }

  const latRange = endLatitudeInRadians - startLatitudeInRadians;
  const longRange = endLongitudeInRadians - startLongitudeInRadians;

  // We are going to generate our sphere by iterating through its
  // spherical coordinates and generating 2 triangles for each quad on a
  // ring of the sphere.
  const numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1);
  const vertices = new Float32Array(numVertices * kVertexSize);

  // Generate the individual vertices in our vertex buffer.
  let cursor = 0;
  for (let y = 0; y <= subdivisionsHeight; y++) {
    for (let x = 0; x <= subdivisionsAxis; x++) {
      // Generate a vertex based on its spherical coordinates
      const u = x / subdivisionsAxis;
      const v = y / subdivisionsHeight;
      const theta = longRange * u + startLongitudeInRadians;
      const phi = latRange * v + startLatitudeInRadians;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const ux = cosTheta * sinPhi;
      const uy = cosPhi;
      const uz = sinTheta * sinPhi;
      // prettier-ignore
      vertices.set(
        [
          radius * ux, radius * uy, radius * uz, // position
          ux, uy, uz, // normal
          1 - u, v, // texcoord
        ],
        cursor,
      );
      cursor += kVertexSize;
    }
  }

  const numVertsAround = subdivisionsAxis + 1;
  const indices = new Uint16Array(
    3 * subdivisionsAxis * subdivisionsHeight * 2
  );
  cursor = 0;
  for (let x = 0; x < subdivisionsAxis; x++) {  // eslint-disable-line
    for (let y = 0; y < subdivisionsHeight; y++) {  // eslint-disable-line
      // Make triangle 1 of quad.
      indices[cursor++] = (y + 0) * numVertsAround + x;
      indices[cursor++] = (y + 0) * numVertsAround + x + 1;
      indices[cursor++] = (y + 1) * numVertsAround + x;

      // Make triangle 2 of quad.
      indices[cursor++] = (y + 1) * numVertsAround + x;
      indices[cursor++] = (y + 0) * numVertsAround + x + 1;
      indices[cursor++] = (y + 1) * numVertsAround + x + 1;
    }
  }

  return { vertices, indices };
}

/**
 * Array of the indices of corners of each face of a cube.
 */
const CUBE_FACE_INDICES = [
  [3, 7, 5, 1], // right
  [6, 2, 0, 4], // left
  [6, 7, 3, 2], // ??
  [0, 1, 5, 4], // ??
  [7, 6, 4, 5], // front
  [2, 3, 1, 0], // back
];

/**
 * Creates the vertices and indices for a cube.
 *
 * The cube is created around the origin. (-size / 2, size / 2).
 */
export function createCubeVertices({ size = 1 } = {}): VertexData {
  const k = size / 2;

  const cornerVertices = [
    [-k, -k, -k],
    [+k, -k, -k],
    [-k, +k, -k],
    [+k, +k, -k],
    [-k, -k, +k],
    [+k, -k, +k],
    [-k, +k, +k],
    [+k, +k, +k],
  ];

  const faceNormals = [
    [+1, +0, +0],
    [-1, +0, +0],
    [+0, +1, +0],
    [+0, -1, +0],
    [+0, +0, +1],
    [+0, +0, -1],
  ];

  const uvCoords = [
    [1, 0],
    [0, 0],
    [0, 1],
    [1, 1],
  ];

  const numVertices = 6 * 4;
  const vertices = new Float32Array(numVertices * kVertexSize);
  const indices = new Uint16Array(3 * 6 * 2);

  let vCursor = 0;
  let iCursor = 0;
  for (let f = 0; f < 6; ++f) {
    const faceIndices = CUBE_FACE_INDICES[f];
    for (let v = 0; v < 4; ++v) {
      const position = cornerVertices[faceIndices[v]];
      const normal = faceNormals[f];
      const uv = uvCoords[v];

      // Each face needs all four vertices because the normals and texture
      // coordinates are not all the same.
      vertices.set([...position, ...normal, ...uv], vCursor);
      vCursor += kVertexSize;
    }
    // Two triangles make a square face.
    const offset = 4 * f;
    indices.set([offset + 0, offset + 1, offset + 2], iCursor);
    indices.set([offset + 0, offset + 2, offset + 3], iCursor + 3);
    iCursor += 6;
  }

  return { vertices, indices };
}

/**
 * Creates vertices for a truncated cone, which is like a cylinder
 * except that it has different top and bottom radii. A truncated cone
 * can also be used to create cylinders and regular cones. The
 * truncated cone will be created centered about the origin, with the
 * y axis as its vertical axis.
 */
export function createTruncatedConeVertices({
  bottomRadius = 1,
  topRadius = 0,
  height = 1,
  radialSubdivisions = 24,
  verticalSubdivisions = 1,
  topCap = true,
  bottomCap = true,
} = {}): VertexData {
  if (radialSubdivisions < 3) {
    throw new Error('radialSubdivisions must be 3 or greater');
  }

  if (verticalSubdivisions < 1) {
    throw new Error('verticalSubdivisions must be 1 or greater');
  }

  const extra = (topCap ? 2 : 0) + (bottomCap ? 2 : 0);

  const numVertices =
    (radialSubdivisions + 1) * (verticalSubdivisions + 1 + extra);
  const vertices = new Float32Array(numVertices * kVertexSize);
  const indices = new Uint16Array(
    3 * radialSubdivisions * (verticalSubdivisions + extra / 2) * 2
  );

  const vertsAroundEdge = radialSubdivisions + 1;

  // The slant of the cone is constant across its surface
  const slant = Math.atan2(bottomRadius - topRadius, height);
  const cosSlant = Math.cos(slant);
  const sinSlant = Math.sin(slant);

  const start = topCap ? -2 : 0;
  const end = verticalSubdivisions + (bottomCap ? 2 : 0);

  let cursor = 0;
  for (let yy = start; yy <= end; ++yy) {
    let v = yy / verticalSubdivisions;
    let y = height * v;
    let ringRadius = 0;
    if (yy < 0) {
      y = 0;
      v = 1;
      ringRadius = bottomRadius;
    } else if (yy > verticalSubdivisions) {
      y = height;
      v = 1;
      ringRadius = topRadius;
    } else {
      ringRadius =
        bottomRadius + (topRadius - bottomRadius) * (yy / verticalSubdivisions);
    }
    if (yy === -2 || yy === verticalSubdivisions + 2) {
      ringRadius = 0;
      v = 0;
    }
    y -= height / 2;
    for (let ii = 0; ii < vertsAroundEdge; ++ii) {
      const sin = Math.sin((ii * Math.PI * 2) / radialSubdivisions);
      const cos = Math.cos((ii * Math.PI * 2) / radialSubdivisions);
      vertices.set([sin * ringRadius, y, cos * ringRadius], cursor);
      if (yy < 0) {
        vertices.set([0, -1, 0], cursor + 3);
      } else if (yy > verticalSubdivisions) {
        vertices.set([0, 1, 0], cursor + 3);
      } else if (ringRadius === 0.0) {
        vertices.set([0, 0, 0], cursor + 3);
      } else {
        vertices.set([sin * cosSlant, sinSlant, cos * cosSlant], cursor + 3);
      }
      vertices.set([ii / radialSubdivisions, 1 - v], cursor + 6);
      cursor += kVertexSize;
    }
  }

  cursor = 0;
  for (let yy = 0; yy < verticalSubdivisions + extra; ++yy) {
    if (
      (yy === 1 && topCap) ||
      (yy === verticalSubdivisions + extra - 2 && bottomCap)
    ) {
      continue;
    }
    for (let ii = 0; ii < radialSubdivisions; ++ii) {
      indices[cursor++] = vertsAroundEdge * (yy + 0) + 0 + ii;
      indices[cursor++] = vertsAroundEdge * (yy + 0) + 1 + ii;
      indices[cursor++] = vertsAroundEdge * (yy + 1) + 1 + ii;

      indices[cursor++] = vertsAroundEdge * (yy + 0) + 0 + ii;
      indices[cursor++] = vertsAroundEdge * (yy + 1) + 1 + ii;
      indices[cursor++] = vertsAroundEdge * (yy + 1) + 0 + ii;
    }
  }

  return { vertices, indices };
}

/**
 * Creates cylinder vertices. The cylinder will be created around the origin
 * along the y-axis.
 */
export function createCylinderVertices({
  radius = 1,
  height = 1,
  radialSubdivisions = 24,
  verticalSubdivisions = 1,
  topCap = true,
  bottomCap = true,
} = {}): VertexData {
  return createTruncatedConeVertices({
    bottomRadius: radius,
    topRadius: radius,
    height,
    radialSubdivisions,
    verticalSubdivisions,
    topCap,
    bottomCap,
  });
}

/**
 * Creates vertices for a torus
 */
export function createTorusVertices({
  radius = 1,
  thickness = 0.24,
  radialSubdivisions = 24,
  bodySubdivisions = 12,
  startAngle = 0,
  endAngle = Math.PI * 2,
} = {}): VertexData {
  if (radialSubdivisions < 3) {
    throw new Error('radialSubdivisions must be 3 or greater');
  }

  if (bodySubdivisions < 3) {
    throw new Error('verticalSubdivisions must be 3 or greater');
  }
  const range = endAngle - startAngle;

  const radialParts = radialSubdivisions + 1;
  const bodyParts = bodySubdivisions + 1;
  const numVertices = radialParts * bodyParts;
  const vertices = new Float32Array(numVertices * kVertexSize);
  const indices = new Uint16Array(
    3 * radialSubdivisions * bodySubdivisions * 2
  );

  let cursor = 0;
  for (let slice = 0; slice < bodyParts; ++slice) {
    const v = slice / bodySubdivisions;
    const sliceAngle = v * Math.PI * 2;
    const sliceSin = Math.sin(sliceAngle);
    const ringRadius = radius + sliceSin * thickness;
    const ny = Math.cos(sliceAngle);
    const y = ny * thickness;
    for (let ring = 0; ring < radialParts; ++ring) {
      const u = ring / radialSubdivisions;
      const ringAngle = startAngle + u * range;
      const xSin = Math.sin(ringAngle);
      const zCos = Math.cos(ringAngle);
      const x = xSin * ringRadius;
      const z = zCos * ringRadius;
      const nx = xSin * sliceSin;
      const nz = zCos * sliceSin;
      // prettier-ignore
      vertices.set([
        x, y, z, // position
        nx, ny, nz, // normal
        u, 1 - v, // texcoord
      ], cursor);
      cursor += kVertexSize;
    }
  }

  cursor = 0;
  for (let slice = 0; slice < bodySubdivisions; ++slice) {
    for (let ring = 0; ring < radialSubdivisions; ++ring) {
      const nextRingIndex = 1 + ring;
      const nextSliceIndex = 1 + slice;

      indices[cursor++] = radialParts * slice + ring;
      indices[cursor++] = radialParts * nextSliceIndex + ring;
      indices[cursor++] = radialParts * slice + nextRingIndex;

      indices[cursor++] = radialParts * nextSliceIndex + ring;
      indices[cursor++] = radialParts * nextSliceIndex + nextRingIndex;
      indices[cursor++] = radialParts * slice + nextRingIndex;
    }
  }

  return { vertices, indices };
}

/**
 * Creates disc vertices. The disc will be in the xz plane, centered at
 * the origin. When creating, at least 3 divisions, or pie
 * pieces, need to be specified, otherwise the triangles making
 * up the disc will be degenerate. You can also specify the
 * number of radial pieces `stacks`. A value of 1 for
 * stacks will give you a simple disc of pie pieces.  If you
 * want to create an annulus you can set `innerRadius` to a
 * value > 0. Finally, `stackPower` allows you to have the widths
 * increase or decrease as you move away from the center. This
 * is particularly useful when using the disc as a ground plane
 * with a fixed camera such that you don't need the resolution
 * of small triangles near the perimeter. For example, a value
 * of 2 will produce stacks whose outside radius increases with
 * the square of the stack index. A value of 1 will give uniform
 * stacks.
 */
export function createDiscVertices({
  radius = 1,
  divisions = 24,
  stacks = 1,
  innerRadius = 0,
  stackPower = 1,
} = {}): VertexData {
  if (divisions < 3) {
    throw new Error('divisions must be at least 3');
  }

  // Note: We don't share the center vertex because that would
  // mess up texture coordinates.
  const numVertices = (divisions + 1) * (stacks + 1);

  const vertices = new Float32Array(numVertices * kVertexSize);
  const indices = new Uint16Array(3 * stacks * divisions * 2);

  let firstIndex = 0;
  const radiusSpan = radius - innerRadius;
  const pointsPerStack = divisions + 1;

  // Build the disk one stack at a time.
  let vCursor = 0;
  let iCursor = 0;
  for (let stack = 0; stack <= stacks; ++stack) {
    const stackRadius =
      innerRadius + radiusSpan * Math.pow(stack / stacks, stackPower);

    for (let i = 0; i <= divisions; ++i) {
      const theta = (2.0 * Math.PI * i) / divisions;
      const x = stackRadius * Math.cos(theta);
      const z = stackRadius * Math.sin(theta);

      // prettier-ignore
      vertices.set([
        x, 0, z, // position
        0, 1, 0, // normal
        1 - i / divisions, stack / stacks, // texcoord
      ], vCursor);
      vCursor += kVertexSize;
      if (stack > 0 && i !== divisions) {
        // a, b, c and d are the indices of the vertices of a quad.  unless
        // the current stack is the one closest to the center, in which case
        // the vertices a and b connect to the center vertex.
        const a = firstIndex + (i + 1);
        const b = firstIndex + i;
        const c = firstIndex + i - pointsPerStack;
        const d = firstIndex + (i + 1) - pointsPerStack;

        // Make a quad of the vertices a, b, c, d.
        indices.set([a, b, c], iCursor);
        indices.set([a, c, d], iCursor + 3);
        iCursor += 6;
      }
    }

    firstIndex += divisions + 1;
  }

  return { vertices, indices };
}

/**
 * Given indexed vertices creates a new set of vertices un-indexed by expanding the vertices by index.
 */
export function deindex(src: VertexData) {
  const numElements = src.indices.length;
  const vertices = new Float32Array(numElements * kVertexSize);
  const indices = new Uint16Array(numElements);
  for (let i = 0; i < numElements; ++i) {
    const off = src.indices[i] * kVertexSize;
    vertices.set(
      src.vertices.subarray(off, off + kVertexSize),
      i * kVertexSize
    );
    indices[i] = i;
  }

  return {
    vertices,
    indices,
  };
}

/**
 * Similar to TypedArray.subarray but takes (start, length) instead of (start, end)
 */
function subpart<
  T extends { length: number; subarray(start: number, end?: number): T }
>(typedArray: T, start: number, length?: number) {
  return typedArray.subarray(
    start,
    length === undefined ? typedArray.length - start : start + length
  );
}

/**
 * Generate triangle normals from positions.
 * Assumes every 3 values is a position and every 3 positions come from the same triangle
 */
export function generateTriangleNormalsInPlace(data: VertexData): VertexData {
  for (let ii = 0; ii < data.vertices.length; ii += 3 * kVertexSize) {
    // pull out the 3 positions for this triangle
    const p0 = subpart(data.vertices, ii + kVertexSize * 0, 3);
    const p1 = subpart(data.vertices, ii + kVertexSize * 1, 3);
    const p2 = subpart(data.vertices, ii + kVertexSize * 2, 3);

    const n0 = vec3.normalize(vec3.subtract(p0, p1));
    const n1 = vec3.normalize(vec3.subtract(p0, p2));
    const n = vec3.cross(n0, n1);

    // copy them back in
    data.vertices.set(n, ii + kVertexSize * 0 + 3);
    data.vertices.set(n, ii + kVertexSize * 1 + 3);
    data.vertices.set(n, ii + kVertexSize * 2 + 3);
  }

  return data;
}

/**
 * Converts vertex data so each triangle
 * has normals perpendicular to the triangle.
 */
export function facet(vertexData: VertexData): VertexData {
  const newData = deindex(vertexData);
  generateTriangleNormalsInPlace(newData);
  return newData;
}

/**
 * Reorients the vertex data by the given matrix.
 */
export function reorientInPlace(
  vertexData: VertexData,
  matrix: Mat4
): VertexData {
  const { vertices } = vertexData;
  for (let i = 0; i < vertices.length; i += kVertexSize) {
    // reorient position
    vertices.set(vec3.transformMat4(subpart(vertices, i, 3), matrix), i);
    // reorient normal
    vertices.set(
      vec3.transformMat4Upper3x3(subpart(vertices, i + 3, 3), matrix),
      i + 3
    );
  }
  return vertexData;
}
