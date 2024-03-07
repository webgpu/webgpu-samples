import { vec3 } from 'wgpu-matrix';
type Vec3 = vec3.default;

function reciprocal(v: Vec3) {
  const s = 1 / vec3.lenSq(v);
  return vec3.mul(vec3.fromValues(s, s, s), v);
}

interface Quad {
  center: Vec3;
  right: Vec3;
  up: Vec3;
  color: Vec3;
  emissive?: number;
}

//      ─────────┐
//     ╱  +Y    ╱│
//    ┌────────┐ │
//    │        │+X
//    │   +Z   │ │
//    │        │╱
//    └────────┘
enum CubeFace {
  PositiveX,
  PositiveY,
  PositiveZ,
  NegativeX,
  NegativeY,
  NegativeZ,
}
function box(params: {
  center: Vec3;
  width: number;
  height: number;
  depth: number;
  rotation: number;
  color: Vec3 | Vec3[];
  type: 'convex' | 'concave';
}): Quad[] {
  //      ─────────┐
  //     ╱  +Y    ╱│
  //    ┌────────┐ │        y
  //    │        │+X        ^
  //    │   +Z   │ │        │ -z
  //    │        │╱         │╱
  //    └────────┘          └─────> x
  const x = vec3.fromValues(
    Math.cos(params.rotation) * (params.width / 2),
    0,
    Math.sin(params.rotation) * (params.depth / 2)
  );
  const y = vec3.fromValues(0, params.height / 2, 0);
  const z = vec3.fromValues(
    Math.sin(params.rotation) * (params.width / 2),
    0,
    -Math.cos(params.rotation) * (params.depth / 2)
  );
  const colors =
    params.color instanceof Array
      ? params.color
      : new Array(6).fill(params.color);
  const sign = (v: Vec3) => {
    return params.type === 'concave' ? v : vec3.negate(v);
  };
  return [
    {
      // PositiveX
      center: vec3.add(params.center, x),
      right: sign(vec3.negate(z)),
      up: y,
      color: colors[CubeFace.PositiveX],
    },
    {
      // PositiveY
      center: vec3.add(params.center, y),
      right: sign(x),
      up: vec3.negate(z),
      color: colors[CubeFace.PositiveY],
    },
    {
      // PositiveZ
      center: vec3.add(params.center, z),
      right: sign(x),
      up: y,
      color: colors[CubeFace.PositiveZ],
    },
    {
      // NegativeX
      center: vec3.sub(params.center, x),
      right: sign(z),
      up: y,
      color: colors[CubeFace.NegativeX],
    },
    {
      // NegativeY
      center: vec3.sub(params.center, y),
      right: sign(x),
      up: z,
      color: colors[CubeFace.NegativeY],
    },
    {
      // NegativeZ
      center: vec3.sub(params.center, z),
      right: sign(vec3.negate(x)),
      up: y,
      color: colors[CubeFace.NegativeZ],
    },
  ];
}

const light: Quad = {
  center: vec3.fromValues(0, 9.95, 0),
  right: vec3.fromValues(1, 0, 0),
  up: vec3.fromValues(0, 0, 1),
  color: vec3.fromValues(5.0, 5.0, 5.0),
  emissive: 1.0,
};

/**
 * Scene holds the cornell-box scene information.
 */
export default class Scene {
  readonly vertexCount: number;
  readonly indexCount: number;
  readonly vertices: GPUBuffer;
  readonly indices: GPUBuffer;
  readonly vertexBufferLayout: GPUVertexBufferLayout[];
  readonly quadBuffer: GPUBuffer;
  readonly quads = [
    ...box({
      center: vec3.fromValues(0, 5, 0),
      width: 10,
      height: 10,
      depth: 10,
      rotation: 0,
      color: [
        vec3.fromValues(0.0, 0.5, 0.0), // PositiveX
        vec3.fromValues(0.5, 0.5, 0.5), // PositiveY
        vec3.fromValues(0.5, 0.5, 0.5), // PositiveZ
        vec3.fromValues(0.5, 0.0, 0.0), // NegativeX
        vec3.fromValues(0.5, 0.5, 0.5), // NegativeY
        vec3.fromValues(0.5, 0.5, 0.5), // NegativeZ
      ],
      type: 'concave',
    }),
    ...box({
      center: vec3.fromValues(1.5, 1.5, 1),
      width: 3,
      height: 3,
      depth: 3,
      rotation: 0.3,
      color: vec3.fromValues(0.8, 0.8, 0.8),
      type: 'convex',
    }),
    ...box({
      center: vec3.fromValues(-2, 3, -2),
      width: 3,
      height: 6,
      depth: 3,
      rotation: -0.4,
      color: vec3.fromValues(0.8, 0.8, 0.8),
      type: 'convex',
    }),
    light,
  ];
  readonly lightCenter = light.center;
  readonly lightWidth = vec3.len(light.right) * 2;
  readonly lightHeight = vec3.len(light.up) * 2;

  constructor(device: GPUDevice) {
    const quadStride = 16 * 4;
    const quadBuffer = device.createBuffer({
      size: quadStride * this.quads.length,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    const quadData = new Float32Array(quadBuffer.getMappedRange());
    const vertexStride = 4 * 10;
    const vertexData = new Float32Array(this.quads.length * vertexStride);
    const indexData = new Uint32Array(this.quads.length * 9); // TODO: 6?
    let vertexCount = 0;
    let indexCount = 0;
    let quadDataOffset = 0;
    let vertexDataOffset = 0;
    let indexDataOffset = 0;
    for (let quadIdx = 0; quadIdx < this.quads.length; quadIdx++) {
      const quad = this.quads[quadIdx];
      const normal = vec3.normalize(vec3.cross(quad.right, quad.up));
      quadData[quadDataOffset++] = normal[0];
      quadData[quadDataOffset++] = normal[1];
      quadData[quadDataOffset++] = normal[2];
      quadData[quadDataOffset++] = -vec3.dot(normal, quad.center);

      const invRight = reciprocal(quad.right);
      quadData[quadDataOffset++] = invRight[0];
      quadData[quadDataOffset++] = invRight[1];
      quadData[quadDataOffset++] = invRight[2];
      quadData[quadDataOffset++] = -vec3.dot(invRight, quad.center);

      const invUp = reciprocal(quad.up);
      quadData[quadDataOffset++] = invUp[0];
      quadData[quadDataOffset++] = invUp[1];
      quadData[quadDataOffset++] = invUp[2];
      quadData[quadDataOffset++] = -vec3.dot(invUp, quad.center);

      quadData[quadDataOffset++] = quad.color[0];
      quadData[quadDataOffset++] = quad.color[1];
      quadData[quadDataOffset++] = quad.color[2];
      quadData[quadDataOffset++] = quad.emissive ?? 0;

      // a ----- b
      // |       |
      // |   m   |
      // |       |
      // c ----- d
      const a = vec3.add(vec3.sub(quad.center, quad.right), quad.up);
      const b = vec3.add(vec3.add(quad.center, quad.right), quad.up);
      const c = vec3.sub(vec3.sub(quad.center, quad.right), quad.up);
      const d = vec3.sub(vec3.add(quad.center, quad.right), quad.up);

      vertexData[vertexDataOffset++] = a[0];
      vertexData[vertexDataOffset++] = a[1];
      vertexData[vertexDataOffset++] = a[2];
      vertexData[vertexDataOffset++] = 1;
      vertexData[vertexDataOffset++] = 0; // uv.x
      vertexData[vertexDataOffset++] = 1; // uv.y
      vertexData[vertexDataOffset++] = quadIdx;
      vertexData[vertexDataOffset++] = quad.color[0] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[1] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[2] * (quad.emissive ?? 0);

      vertexData[vertexDataOffset++] = b[0];
      vertexData[vertexDataOffset++] = b[1];
      vertexData[vertexDataOffset++] = b[2];
      vertexData[vertexDataOffset++] = 1;
      vertexData[vertexDataOffset++] = 1; // uv.x
      vertexData[vertexDataOffset++] = 1; // uv.y
      vertexData[vertexDataOffset++] = quadIdx;
      vertexData[vertexDataOffset++] = quad.color[0] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[1] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[2] * (quad.emissive ?? 0);

      vertexData[vertexDataOffset++] = c[0];
      vertexData[vertexDataOffset++] = c[1];
      vertexData[vertexDataOffset++] = c[2];
      vertexData[vertexDataOffset++] = 1;
      vertexData[vertexDataOffset++] = 0; // uv.x
      vertexData[vertexDataOffset++] = 0; // uv.y
      vertexData[vertexDataOffset++] = quadIdx;
      vertexData[vertexDataOffset++] = quad.color[0] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[1] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[2] * (quad.emissive ?? 0);

      vertexData[vertexDataOffset++] = d[0];
      vertexData[vertexDataOffset++] = d[1];
      vertexData[vertexDataOffset++] = d[2];
      vertexData[vertexDataOffset++] = 1;
      vertexData[vertexDataOffset++] = 1; // uv.x
      vertexData[vertexDataOffset++] = 0; // uv.y
      vertexData[vertexDataOffset++] = quadIdx;
      vertexData[vertexDataOffset++] = quad.color[0] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[1] * (quad.emissive ?? 0);
      vertexData[vertexDataOffset++] = quad.color[2] * (quad.emissive ?? 0);

      indexData[indexDataOffset++] = vertexCount + 0; // a
      indexData[indexDataOffset++] = vertexCount + 2; // c
      indexData[indexDataOffset++] = vertexCount + 1; // b
      indexData[indexDataOffset++] = vertexCount + 1; // b
      indexData[indexDataOffset++] = vertexCount + 2; // c
      indexData[indexDataOffset++] = vertexCount + 3; // d
      indexCount += 6;
      vertexCount += 4;
    }

    quadBuffer.unmap();

    const vertices = device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(vertices.getMappedRange()).set(vertexData);
    vertices.unmap();

    const indices = device.createBuffer({
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(indices.getMappedRange()).set(indexData);
    indices.unmap();

    const vertexBufferLayout: GPUVertexBufferLayout[] = [
      {
        arrayStride: vertexStride,
        attributes: [
          {
            // position
            shaderLocation: 0,
            offset: 0 * 4,
            format: 'float32x4',
          },
          {
            // uv
            shaderLocation: 1,
            offset: 4 * 4,
            format: 'float32x3',
          },
          {
            // color
            shaderLocation: 2,
            offset: 7 * 4,
            format: 'float32x3',
          },
        ],
      },
    ];

    this.vertexCount = vertexCount;
    this.indexCount = indexCount;
    this.vertices = vertices;
    this.indices = indices;
    this.vertexBufferLayout = vertexBufferLayout;
    this.quadBuffer = quadBuffer;
  }
}
