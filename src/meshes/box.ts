import { vec3 } from 'wgpu-matrix';
import {
  calculateVertexStride,
  getMeshPosAtIndex,
  getMeshUVAtIndex,
  Mesh,
  VertexProperty,
} from './mesh';

export interface BoxMesh extends Mesh {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexStride: number;
}

//// Borrowed and simplified from https://github.com/mrdoob/three.js/blob/master/src/geometries/BoxGeometry.js
//// Presumes vertex buffer alignment of verts, normals, and uvs
const createBoxGeometry = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  heightSegments = 1.0,
  depthSegments = 1.0,
  vertProperties = 7
) => {
  widthSegments = Math.floor(widthSegments);
  heightSegments = Math.floor(heightSegments);
  depthSegments = Math.floor(depthSegments);

  const indices = [];
  const vertNormalUVBuffer = [];

  let numVertices = 0;

  const buildPlane = (
    u: 0 | 1 | 2,
    v: 0 | 1 | 2,
    w: 0 | 1 | 2,
    udir: -1 | 1,
    vdir: -1 | 1,
    planeWidth: number,
    planeHeight: number,
    planeDepth: number,
    xSections: number,
    ySections: number
  ) => {
    const segmentWidth = planeWidth / xSections;
    const segmentHeight = planeHeight / ySections;

    const widthHalf = planeWidth / 2;
    const heightHalf = planeHeight / 2;
    const depthHalf = planeDepth / 2;

    const gridX1 = xSections + 1;
    const gridY1 = ySections + 1;

    let vertexCounter = 0;

    const vertex = vec3.create();
    const normal = vec3.create();
    for (let iy = 0; iy < gridY1; iy++) {
      const y = iy * segmentHeight - heightHalf;

      for (let ix = 0; ix < gridX1; ix++) {
        const x = ix * segmentWidth - widthHalf;

        if (vertProperties & VertexProperty.POSITION) {
          //Calculate plane vertices
          vertex[u] = x * udir;
          vertex[v] = y * vdir;
          vertex[w] = depthHalf;
          vertNormalUVBuffer.push(...vertex);
        }

        if (vertProperties & VertexProperty.NORMAL) {
          //Caclulate normal
          normal[u] = 0;
          normal[v] = 0;
          normal[w] = planeDepth > 0 ? 1.0 : -1.0;
          vertNormalUVBuffer.push(...normal);
        }

        if (vertProperties & VertexProperty.UV) {
          //Calculate uvs
          vertNormalUVBuffer.push(ix / xSections);
          vertNormalUVBuffer.push(1 - iy / ySections);
        }

        vertexCounter += 1;
      }
    }

    for (let iy = 0; iy < ySections; iy++) {
      for (let ix = 0; ix < xSections; ix++) {
        const a = numVertices + ix + gridX1 * iy;
        const b = numVertices + ix + gridX1 * (iy + 1);
        const c = numVertices + (ix + 1) + gridX1 * (iy + 1);
        const d = numVertices + (ix + 1) + gridX1 * iy;

        //Push vertex indices
        //6 indices for each face
        indices.push(a, b, d);
        indices.push(b, c, d);

        numVertices += vertexCounter;
      }
    }
  };

  //Side face
  buildPlane(
    2, //z
    1, //y
    0, //x
    -1,
    -1,
    depth,
    height,
    width,
    depthSegments,
    heightSegments
  );

  //Side face
  buildPlane(
    2, //z
    1, //y
    0, //x
    1,
    -1,
    depth,
    height,
    -width,
    depthSegments,
    heightSegments
  );

  //Bottom face
  buildPlane(
    0, //x
    2, //z
    1, //y
    1,
    1,
    width,
    depth,
    height,
    widthSegments,
    depthSegments
  );

  //Top face
  buildPlane(
    0, //x
    2, //z
    1, //y
    1,
    -1,
    width,
    depth,
    -height,
    widthSegments,
    depthSegments
  );

  //Side faces
  buildPlane(
    0, //x
    1, //y
    2, //z
    1,
    -1,
    width,
    height,
    depth,
    widthSegments,
    heightSegments
  );

  //Side face
  buildPlane(
    0, //x
    1, //y
    2, //z
    -1,
    -1,
    width,
    height,
    -depth,
    widthSegments,
    heightSegments
  );

  return {
    vertices: vertNormalUVBuffer,
    indices: indices,
  };
};

type IndexFormat = 'uint16' | 'uint32';

//Possibly used later
export const createBoxMesh = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  heightSegments = 1.0,
  depthSegments = 1.0,
  vertexProperties = 7,
  indexFormat: IndexFormat = 'uint16'
): Mesh => {
  const { vertices, indices } = createBoxGeometry(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments,
    vertexProperties
  );

  const vertexStride = calculateVertexStride(vertexProperties);

  const indicesArray =
    indexFormat === 'uint16'
      ? new Uint16Array(indices)
      : new Uint32Array(indices);

  console.log(indicesArray);

  return {
    vertices: new Float32Array(vertices),
    indices: indicesArray,
    vertexStride: vertexStride,
  };
};

export const createBoxMeshWithTangents = (
  width = 1.0,
  height = 1.0,
  depth = 1.0,
  widthSegments = 1.0,
  heightSegments = 1.0,
  depthSegments = 1.0
): Mesh => {
  const mesh = createBoxMesh(
    width,
    height,
    depth,
    widthSegments,
    heightSegments,
    depthSegments
  );

  const originalStrideElements =
    mesh.vertexStride / Float32Array.BYTES_PER_ELEMENT;

  const vertexCount = mesh.vertices.length / originalStrideElements;

  const tangents = new Array(vertexCount);
  tangents.fill(vec3.create(0.0, 0.0, 0.0));
  const bitangents = new Array(vertexCount);
  bitangents.fill(vec3.create(0.0, 0.0, 0.0));
  const counts = new Array(vertexCount);
  counts.fill(0);

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [idx1, idx2, idx3] = [
      mesh.indices[i],
      mesh.indices[i + 1],
      mesh.indices[i + 2],
    ];

    const [pos1, pos2, pos3] = [
      getMeshPosAtIndex(mesh, idx1),
      getMeshPosAtIndex(mesh, idx2),
      getMeshPosAtIndex(mesh, idx3),
    ];

    const [uv1, uv2, uv3] = [
      getMeshUVAtIndex(mesh, idx1),
      getMeshUVAtIndex(mesh, idx2),
      getMeshUVAtIndex(mesh, idx3),
    ];

    const edge1 = vec3.sub(pos2, pos1);
    const edge2 = vec3.sub(pos3, pos1);
    const deltaUV1 = vec3.sub(uv2, uv1);
    const deltaUV2 = vec3.sub(uv3, uv1);

    //Edge of a triangle moves in both u and v direction (2d)
    //deltaU * tangent vector + deltav * bitangent
    //Manipulating the data into matrices, we get an equation

    const constantVal =
      1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);

    const tangent = vec3.fromValues(
      constantVal * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
      constantVal * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
      constantVal * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
    );

    const bitangent = vec3.fromValues(
      constantVal * (-deltaUV2[0] * edge1[0] + deltaUV1[0] * edge2[0]),
      constantVal * (-deltaUV2[0] * edge1[1] + deltaUV1[0] * edge2[1]),
      constantVal * (-deltaUV2[0] * edge1[2] + deltaUV1[0] * edge2[2])
    );

    //Accumulate tangents and bitangents
    tangents[idx1] = vec3.add(tangents[idx1], tangent);
    bitangents[idx1] = vec3.add(bitangents[idx1], bitangent);
    tangents[idx2] = vec3.add(tangents[idx2], tangent);
    bitangents[idx2] = vec3.add(bitangents[idx2], bitangent);
    tangents[idx3] = vec3.add(tangents[idx3], tangent);
    bitangents[idx3] = vec3.add(bitangents[idx3], bitangent);

    //Increment index count
    counts[idx1]++;
    counts[idx2]++;
    counts[idx3]++;
  }

  for (let i = 0; i < tangents.length; i++) {
    tangents[i] = vec3.divScalar(tangents[i], counts[i]);
    bitangents[i] = vec3.divScalar(bitangents[i], counts[i]);
  }

  const newStrideElements = 14;
  const wTangentArray = new Float32Array(vertexCount * newStrideElements);

  for (let i = 0; i < vertexCount; i++) {
    //Copy original vertex data (pos, normal uv)
    wTangentArray.set(
      //Get the original vertex [8 elements] (3 ele pos, 3 ele normal, 2 ele uv)
      mesh.vertices.subarray(
        i * originalStrideElements,
        (i + 1) * originalStrideElements
      ),
      //And put it at the proper location in the new array [14 bytes = 8 og + 6 empty]
      i * newStrideElements
    );
    //For each vertex, place tangent after originalStride
    wTangentArray.set(
      tangents[i],
      i * newStrideElements + originalStrideElements
    );
    //Place bitangent after 3 elements of tangent
    wTangentArray.set(
      bitangents[i],
      i * newStrideElements + originalStrideElements + 3
    );
  }

  return {
    vertices: wTangentArray,
    indices: mesh.indices,
    vertexStride: mesh.vertexStride + Float32Array.BYTES_PER_ELEMENT * 3 * 2,
  };
};
