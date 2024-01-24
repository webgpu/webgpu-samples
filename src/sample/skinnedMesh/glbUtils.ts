import { Quat } from 'wgpu-matrix/dist/2.x/quat';
import { Accessor, BufferView, GlTf, Node, Scene } from './gltf';
import { Mat4, Vec3, mat4, vec3, vec4 } from 'wgpu-matrix';

//NOTE: GLTF code is not generally extensible

enum GLTFRenderMode {
  POINTS = 0,
  LINE = 1,
  LINE_LOOP = 2,
  LINE_STRIP = 3,
  TRIANGLES = 4,
  TRIANGLE_STRIP = 5,
  // Note= fans are not supported in WebGPU, use should be
  // an error or converted into a list/strip
  TRIANGLE_FAN = 6,
}

enum GLTFComponentType {
  BYTE = 5120,
  UNSIGNED_BYTE = 5121,
  SHORT = 5122,
  UNSIGNED_SHORT = 5123,
  INT = 5124,
  UNSIGNED_INT = 5125,
  FLOAT = 5126,
  DOUBLE = 5130,
}

enum GLTFType {
  SCALAR = 0,
  VEC2 = 1,
  VEC3 = 2,
  VEC4 = 3,
  MAT2 = 4,
  MAT3 = 5,
  MAT4 = 6,
}

interface SkinRenderObject {
  inverseBindMatrices: Mat4[];
  joints: number[];
}

export const alignTo = (val: number, align: number): number => {
  return Math.floor((val + align - 1) / align) * align;
};

const parseGltfType = (type: string) => {
  switch (type) {
    case 'SCALAR':
      return GLTFType.SCALAR;
    case 'VEC2':
      return GLTFType.VEC2;
    case 'VEC3':
      return GLTFType.VEC3;
    case 'VEC4':
      return GLTFType.VEC4;
    case 'MAT2':
      return GLTFType.MAT2;
    case 'MAT3':
      return GLTFType.MAT3;
    case 'MAT4':
      return GLTFType.MAT4;
    default:
      throw Error(`Unhandled glTF Type ${type}`);
  }
};

const gltfTypeNumComponents = (type: GLTFType) => {
  switch (type) {
    case GLTFType.SCALAR:
      return 1;
    case GLTFType.VEC2:
      return 2;
    case GLTFType.VEC3:
      return 3;
    case GLTFType.VEC4:
    case GLTFType.MAT2:
      return 4;
    case GLTFType.MAT3:
      return 9;
    case GLTFType.MAT4:
      return 16;
    default:
      throw Error(`Invalid glTF Type ${type}`);
  }
};

// Note: only returns non-normalized type names,
// so byte/ubyte = sint8/uint8, not snorm8/unorm8, same for ushort
const gltfVertexType = (componentType: GLTFComponentType, type: GLTFType) => {
  let typeStr = null;
  switch (componentType) {
    case GLTFComponentType.BYTE:
      typeStr = 'sint8';
      break;
    case GLTFComponentType.UNSIGNED_BYTE:
      typeStr = 'uint8';
      break;
    case GLTFComponentType.SHORT:
      typeStr = 'sint16';
      break;
    case GLTFComponentType.UNSIGNED_SHORT:
      typeStr = 'uint16';
      break;
    case GLTFComponentType.INT:
      typeStr = 'int32';
      break;
    case GLTFComponentType.UNSIGNED_INT:
      typeStr = 'uint32';
      break;
    case GLTFComponentType.FLOAT:
      typeStr = 'float32';
      break;
    default:
      throw Error(`Unrecognized or unsupported glTF type ${componentType}`);
  }

  switch (gltfTypeNumComponents(type)) {
    case 1:
      return typeStr;
    case 2:
      return typeStr + 'x2';
    case 3:
      return typeStr + 'x3';
    case 4:
      return typeStr + 'x4';
    default:
      throw Error(`Invalid number of components for gltfType: ${type}`);
  }
};

const gltfTypeSize = (componentType: GLTFComponentType, type: GLTFType) => {
  let componentSize = 0;
  switch (componentType) {
    case GLTFComponentType.BYTE:
      componentSize = 1;
      break;
    case GLTFComponentType.UNSIGNED_BYTE:
      componentSize = 1;
      break;
    case GLTFComponentType.SHORT:
      componentSize = 2;
      break;
    case GLTFComponentType.UNSIGNED_SHORT:
      componentSize = 2;
      break;
    case GLTFComponentType.INT:
      componentSize = 4;
      break;
    case GLTFComponentType.UNSIGNED_INT:
      componentSize = 4;
      break;
    case GLTFComponentType.FLOAT:
      componentSize = 4;
      break;
    case GLTFComponentType.DOUBLE:
      componentSize = 8;
      break;
    default:
      throw Error('Unrecognized GLTF Component Type?');
  }
  return gltfTypeNumComponents(type) * componentSize;
};

export class GLTFBuffer {
  buffer: Uint8Array;
  constructor(buffer: ArrayBuffer, offset: number, size: number) {
    this.buffer = new Uint8Array(buffer, offset, size);
  }
}

export class GLTFBufferView {
  byteLength: number;
  byteStride: number;
  view: Uint8Array;
  needsUpload: boolean;
  gpuBuffer: GPUBuffer;
  usage: number;
  constructor(buffer: GLTFBuffer, view: BufferView) {
    this.byteLength = view['byteLength'];
    this.byteStride = 0;
    if (view['byteStride'] !== undefined) {
      this.byteStride = view['byteStride'];
    }
    // Create the buffer view. Note that subarray creates a new typed
    // view over the same array buffer, we do not make a copy here.
    let viewOffset = 0;
    if (view['byteOffset'] !== undefined) {
      viewOffset = view['byteOffset'];
    }
    this.view = buffer.buffer.subarray(
      viewOffset,
      viewOffset + this.byteLength
    );

    this.needsUpload = false;
    this.gpuBuffer = null;
    this.usage = 0;
  }

  addUsage(usage: number) {
    this.usage = this.usage | usage;
  }

  upload(device: GPUDevice) {
    // Note: must align to 4 byte size when mapped at creation is true
    const buf: GPUBuffer = device.createBuffer({
      size: alignTo(this.view.byteLength, 4),
      usage: this.usage,
      mappedAtCreation: true,
    });
    new Uint8Array(buf.getMappedRange()).set(this.view);
    buf.unmap();
    this.gpuBuffer = buf;
    this.needsUpload = false;
  }
}

export class GLTFAccessor {
  count: number;
  componentType: GLTFComponentType;
  gltfType: GLTFType;
  view: GLTFBufferView;
  byteOffset: number;
  constructor(view: GLTFBufferView, accessor: Accessor) {
    this.count = accessor['count'];
    this.componentType = accessor['componentType'];
    this.gltfType = parseGltfType(accessor['type']);
    this.view = view;
    this.byteOffset = 0;
    if (accessor['byteOffset'] !== undefined) {
      this.byteOffset = accessor['byteOffset'];
    }
  }

  get byteStride() {
    const elementSize = gltfTypeSize(this.componentType, this.gltfType);
    return Math.max(elementSize, this.view.byteStride);
  }

  get byteLength() {
    return this.count * this.byteStride;
  }

  // Get the vertex attribute type for accessors that are used as vertex attributes
  get vertexType() {
    return gltfVertexType(this.componentType, this.gltfType);
  }
}

interface AttributeMapInterface {
  [key: string]: GLTFAccessor;
}

export class GLTFPrimitive {
  attributeMap: AttributeMapInterface;
  topology: GLTFRenderMode;
  renderPipeline: GPURenderPipeline;
  constructor(topology: GLTFRenderMode, attributeMap: AttributeMapInterface) {
    this.topology = topology;
    this.renderPipeline = null;
    this.attributeMap = attributeMap;

    for (const key in this.attributeMap) {
      this.attributeMap[key].view.needsUpload = true;
      if (key === 'INDICES') {
        this.attributeMap['INDICES'].view.addUsage(GPUBufferUsage.INDEX);
        continue;
      }
      this.attributeMap[key].view.addUsage(GPUBufferUsage.VERTEX);
    }
  }

  buildRenderPipeline(
    device: GPUDevice,
    vertexShaderModule: GPUShaderModule,
    fragmentShaderModule: GPUShaderModule,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    bgLayouts: GPUBindGroupLayout[],
    label: string
  ) {
    // Vertex attribute state and shader stage
    const vertexState: GPUVertexState = {
      // Shader stage info
      module: vertexShaderModule,
      entryPoint: 'vertexMain',
      // Vertex buffer info
      buffers: [
        {
          arrayStride: this.attributeMap['POSITION'].byteStride,
          attributes: [
            {
              format: this.attributeMap['POSITION'].vertexType,
              offset: 0,
              shaderLocation: 0,
            },
          ],
        },
        {
          arrayStride: this.attributeMap['NORMAL'].byteStride,
          attributes: [
            {
              format: this.attributeMap['NORMAL'].vertexType,
              offset: 0,
              shaderLocation: 1,
            },
          ],
        },
        {
          arrayStride: this.attributeMap['TEXCOORD_0'].byteStride,
          attributes: [
            {
              format: this.attributeMap['TEXCOORD_0'].vertexType,
              offset: 0,
              shaderLocation: 2,
            },
          ],
        },
        {
          arrayStride: this.attributeMap['JOINTS_0'].byteStride,
          attributes: [
            {
              format: this.attributeMap['JOINTS_0'].vertexType,
              offset: 0,
              shaderLocation: 3,
            },
          ],
        },
        {
          arrayStride: this.attributeMap['WEIGHTS_0'].byteStride,
          attributes: [
            {
              format: this.attributeMap['WEIGHTS_0'].vertexType,
              offset: 0,
              shaderLocation: 4,
            },
          ],
        },
      ],
    };

    const fragmentState: GPUFragmentState = {
      // Shader info
      module: fragmentShaderModule,
      entryPoint: 'fragmentMain',
      // Output render target info
      targets: [{ format: colorFormat }],
    };

    // Our loader only supports triangle lists and strips, so by default we set
    // the primitive topology to triangle list, and check if it's instead a triangle strip
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' };
    if (this.topology == GLTFRenderMode.TRIANGLE_STRIP) {
      primitive.topology = 'triangle-strip';
      primitive.stripIndexFormat = this.attributeMap['INDICES'].vertexType;
    }

    const layout: GPUPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: bgLayouts,
      label: `${label}.pipelineLayout`,
    });

    const rpDescript: GPURenderPipelineDescriptor = {
      layout: layout,
      label: `${label}.pipeline`,
      vertex: vertexState,
      fragment: fragmentState,
      primitive: primitive,
      depthStencil: {
        format: depthFormat,
        depthWriteEnabled: true,
        depthCompare: 'less',
      },
    };

    this.renderPipeline = device.createRenderPipeline(rpDescript);
  }

  render(renderPassEncoder: GPURenderPassEncoder, bindGroups: GPUBindGroup[]) {
    renderPassEncoder.setPipeline(this.renderPipeline);
    bindGroups.forEach((bg, idx) => {
      renderPassEncoder.setBindGroup(idx, bg);
    });

    //if skin do something with bone bind group

    renderPassEncoder.setVertexBuffer(
      0,
      this.attributeMap['POSITION'].view.gpuBuffer,
      this.attributeMap['POSITION'].byteOffset,
      this.attributeMap['POSITION'].byteLength
    );
    renderPassEncoder.setVertexBuffer(
      1,
      this.attributeMap['NORMAL'].view.gpuBuffer,
      this.attributeMap['NORMAL'].byteOffset,
      this.attributeMap['NORMAL'].byteLength
    );
    renderPassEncoder.setVertexBuffer(
      2,
      this.attributeMap['TEXCOORD_0'].view.gpuBuffer,
      this.attributeMap['TEXCOORD_0'].byteOffset,
      this.attributeMap['TEXCOORD_0'].byteLength
    );
    renderPassEncoder.setVertexBuffer(
      3,
      this.attributeMap['JOINTS_0'].view.gpuBuffer,
      this.attributeMap['JOINTS_0'].byteOffset,
      this.attributeMap['JOINTS_0'].byteLength
    );
    renderPassEncoder.setVertexBuffer(
      4,
      this.attributeMap['WEIGHTS_0'].view.gpuBuffer,
      this.attributeMap['WEIGHTS_0'].byteOffset,
      this.attributeMap['WEIGHTS_0'].byteLength
    );

    if (this.attributeMap['INDICES']) {
      renderPassEncoder.setIndexBuffer(
        this.attributeMap['INDICES'].view.gpuBuffer,
        this.attributeMap['INDICES'].vertexType,
        this.attributeMap['INDICES'].byteOffset,
        this.attributeMap['INDICES'].byteLength
      );
      renderPassEncoder.drawIndexed(this.attributeMap['INDICES'].count);
    } else {
      renderPassEncoder.draw(this.attributeMap['POSITION'].count);
    }
  }
}

export class GLTFMesh {
  name: string;
  primitives: GLTFPrimitive[];
  constructor(name: string, primitives: GLTFPrimitive[]) {
    this.name = name;
    this.primitives = primitives;
  }

  buildRenderPipeline(
    device: GPUDevice,
    vertexShaderModule: GPUShaderModule,
    fragmentShaderModule: GPUShaderModule,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    bgLayouts: GPUBindGroupLayout[]
  ) {
    // We take a pretty simple approach to start. Just loop through all the primitives and
    // build their respective render pipelines
    for (let i = 0; i < this.primitives.length; ++i) {
      this.primitives[i].buildRenderPipeline(
        device,
        vertexShaderModule,
        fragmentShaderModule,
        colorFormat,
        depthFormat,
        bgLayouts,
        `PrimitivePipeline${i}`
      );
    }
  }

  render(renderPassEncoder: GPURenderPassEncoder, bindGroups: GPUBindGroup[]) {
    // We take a pretty simple approach to start. Just loop through all the primitives and
    // call their individual draw methods
    for (let i = 0; i < this.primitives.length; ++i) {
      this.primitives[i].render(renderPassEncoder, bindGroups);
    }
  }
}

export const validateGLBHeader = (header: DataView) => {
  if (header.getUint32(0, true) != 0x46546c67) {
    throw Error('Provided file is not a glB file');
  }
  if (header.getUint32(4, true) != 2) {
    throw Error('Provided file is glTF 2.0 file');
  }
};

export const validateBinaryHeader = (header: Uint32Array) => {
  if (header[1] != 0x004e4942) {
    throw Error(
      'Invalid glB: The second chunk of the glB file is not a binary chunk!'
    );
  }
};

/* export const flattenNodeOutput = (parentNode: GLTFNode) => {
  if (!parentNode.transformationMatrix) {
    return mat4.identity();
  }
  if (parentNode.childrenNodes.length === 0) {
    return parentNode.transformationMatrix;
  }
  const accumulator = mat4.identity();
  parentNode.childrenNodes.forEach((node) => {
    mat4.multiply(accumulator, flattenNodeOutput(node), accumulator);
  });
  return parentNode.transformationMatrix;
}; */

export const mat4FromRotationTranslationScale = (
  rotation: Vec3,
  translation: Mat4,
  scale: Vec3
): Mat4 => {
  const [x, y, z, w] = rotation;
  const [sx, sy, sz] = scale;

  const x2 = x * 2;
  const y2 = y * 2;
  const z2 = z * 2;

  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  const mat = mat4.create(
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1
  );
  return mat;
};

export const readNodeTransform = (node: Node): Mat4 => {
  if (node.matrix) {
    return mat4.create(...node.matrix);
  }
  const scale = node.scale
    ? vec3.fromValues(...node.scale)
    : vec3.fromValues(1, 1, 1);
  const rotation = node.rotation
    ? vec4.fromValues(...node.rotation)
    : vec4.fromValues(0, 0, 0, 1);
  const translation = node.translation
    ? vec3.fromValues(...node.translation)
    : vec3.fromValues(0, 0, 0);
  return mat4FromRotationTranslationScale(rotation, translation, scale);
};

export const setNodeWorldTransformMatrix = (
  data: GlTf,
  node: Node,
  parentWorldTransformationMatrix: Mat4
) => {
  //Do not recompute the worldMatrixTransform if it has already been computed
  if (node.worldTransformationMatrix) {
    return;
  }
  node.worldTransformationMatrix = readNodeTransform(node);
  mat4.multiply(
    node.worldTransformationMatrix,
    parentWorldTransformationMatrix,
    node.worldTransformationMatrix
  );

  if (node.children) {
    for (const childIndex of node.children) {
      const childNode = data.nodes[childIndex];
      setNodeWorldTransformMatrix(
        data,
        childNode,
        node.worldTransformationMatrix
      );
    }
  }
};

type TempReturn = {
  meshes: GLTFMesh[];
  nodes: Node[];
  scenes: GLTFScene[];
  skins: GLTFSkin[];
};

// "A scene graph is usually a tree structure where each node in the tree generates a matrix...
//  The engine walks the scene graph and figures out a list of things to draw...
//  Each node in a scene graph represent a local space. Given the correct matrix math,
//  anything in that local space can ignore anything above it"
// https://webgl2fundamentals.org/webgl/lessons/webgl-scene-graph.html

// BaseTransformation of a node;
export class BaseTransformation {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
  constructor(
    position = [0, 0, 0],
    rotation = [0, 0, 0, 1],
    scale = [1, 1, 1]
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
  getMatrix(): Mat4 {
    const dst = mat4.identity();
    mat4.scale(dst, this.scale, dst);
    mat4.fromQuat(this.rotation, dst);
    mat4.translate(dst, this.position, dst);
    return dst;
  }
}

export class GLTFNode {
  name: string;
  source: BaseTransformation;
  parent: GLTFNode | null;
  children: GLTFNode[];
  // Transforms all node's children in the node's local space, with node itself acting as the origin
  localMatrix: Mat4;
  worldMatrix: Mat4;
  // List of Meshes associated with this node
  drawables: GLTFMesh[];
  test = 0;
  skin?: GLTFSkin;
  private nodeTransformGPUBuffer: GPUBuffer;
  private nodeTransformBindGroup: GPUBindGroup;

  constructor(
    device: GPUDevice,
    bgLayout: GPUBindGroupLayout,
    source: BaseTransformation,
    name?: string,
    skin?: GLTFSkin
  ) {
    this.name = name
      ? name
      : `node_${source.position} ${source.rotation} ${source.scale}`;
    this.source = source;
    this.parent = null;
    this.children = [];
    this.localMatrix = mat4.identity();
    this.worldMatrix = mat4.identity();
    this.drawables = [];
    this.nodeTransformGPUBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.nodeTransformBindGroup = device.createBindGroup({
      layout: bgLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.nodeTransformGPUBuffer,
          },
        },
      ],
    });
    this.skin = skin;
  }

  setParent(parent: GLTFNode) {
    if (this.parent) {
      this.parent.removeChild(this);
      this.parent = null;
    }
    parent.addChild(this);
    this.parent = parent;
  }

  updateWorldMatrix(device: GPUDevice, parentWorldMatrix?: Mat4) {
    // Calculate the localMatrix
    this.localMatrix = this.source.getMatrix();
    if (parentWorldMatrix) {
      mat4.multiply(parentWorldMatrix, this.localMatrix, this.worldMatrix);
    } else {
      mat4.copy(this.localMatrix, this.worldMatrix);
    }
    const worldMatrix = this.worldMatrix;
    device.queue.writeBuffer(
      this.nodeTransformGPUBuffer,
      0,
      worldMatrix as Float32Array
    );
    for (const child of this.children) {
      child.updateWorldMatrix(device, worldMatrix);
    }
  }

  traverse(fn: (n: GLTFNode, ...args) => void) {
    fn(this);
    for (const child of this.children) {
      child.traverse(fn);
    }
  }

  renderDrawables(
    passEncoder: GPURenderPassEncoder,
    bindGroups: GPUBindGroup[]
  ) {
    if (this.drawables !== undefined) {
      for (const drawable of this.drawables) {
        this.skin
          ? drawable.render(passEncoder, [
              ...bindGroups,
              this.nodeTransformBindGroup,
              this.skin.skinBindGroup,
            ])
          : drawable.render(passEncoder, [
              ...bindGroups,
              this.nodeTransformBindGroup,
            ]);
      }
    }
    // Render any of its children
    for (const child of this.children) {
      child.renderDrawables(passEncoder, bindGroups);
    }
  }

  private addChild(child: GLTFNode) {
    this.children.push(child);
  }

  private removeChild(child: GLTFNode) {
    const ndx = this.children.indexOf(child);
    this.children.splice(ndx, 1);
  }
}

export class GLTFScene {
  nodes?: number[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
  root: GLTFNode;

  constructor(
    device: GPUDevice,
    nodeTransformBGL: GPUBindGroupLayout,
    baseScene: Scene
  ) {
    console.log(baseScene.nodes);
    this.nodes = baseScene.nodes;
    this.name = baseScene.name;
    this.extensions = baseScene.extensions;
    this.extras = baseScene.extras;
    this.root = new GLTFNode(
      device,
      nodeTransformBGL,
      new BaseTransformation(),
      baseScene.name
    );
  }
}

export class GLTFSkin {
  inverseBindMatricesAccessor: GLTFAccessor;
  joints: number[];
  jointGPUBuffer: GPUBuffer;
  skinBindGroup: GPUBindGroup;
  skinBindGroupLayout: GPUBindGroupLayout;
  private jointArrayBuffer: Float32Array;

  constructor(
    device: GPUDevice,
    invBindMatricesAccessor: GLTFAccessor,
    joints: number[]
  ) {
    this.jointArrayBuffer = new Float32Array(joints.length * 16);
    console.log(invBindMatricesAccessor);
    this.inverseBindMatricesAccessor = invBindMatricesAccessor;
    this.joints = joints;
    this.jointGPUBuffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT * joints.length,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.skinBindGroupLayout = device.createBindGroupLayout({
      label: 'StaticGLTFSkin.bindGroupLayout',
      entries: [
        {
          binding: 0,
          buffer: {
            type: 'uniform',
          },
          visibility: GPUShaderStage.VERTEX,
        },
        {
          binding: 1,
          buffer: {
            type: 'uniform',
          },
          visibility: GPUShaderStage.VERTEX,
        },
      ],
    });
    this.skinBindGroup = device.createBindGroup({
      layout: this.skinBindGroupLayout,
      label: 'StaticGLTFSkin.bindGroup',
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.inverseBindMatricesAccessor.view.gpuBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.jointGPUBuffer,
          },
        },
      ],
    });
  }

  updateJoints(device: GPUDevice, nodes: GLTFNode[]) {
    for (const [index, joint] of this.joints.entries()) {
      this.jointArrayBuffer.set(nodes[joint].worldMatrix, index * 16);
    }
    device.queue.writeBuffer(this.jointGPUBuffer, 0, this.jointArrayBuffer);
  }
}

// Upload a GLB model, parse its JSON and Binary components, and create the requisite GPU resources
// to render them. NOTE: Not extensible to all GLTF contexts at this point in time
export const convertGLBToJSONAndBinary = async (
  buffer: ArrayBuffer,
  device: GPUDevice
): Promise<TempReturn> => {
  // Binary GLTF layout: https://cdn.willusher.io/webgpu-0-to-gltf/glb-layout.svg
  const jsonHeader = new DataView(buffer, 0, 20);
  validateGLBHeader(jsonHeader);

  // Length of the jsonChunk found at jsonHeader[12 - 15]
  const jsonChunkLength = jsonHeader.getUint32(12, true);

  // Parse the JSON chunk of the glB file to a JSON object
  const jsonChunk: GlTf = JSON.parse(
    new TextDecoder('utf-8').decode(new Uint8Array(buffer, 20, jsonChunkLength))
  );

  console.log(jsonChunk);

  // Binary data located after jsonChunk
  const binaryHeader = new Uint32Array(buffer, 20 + jsonChunkLength, 2);
  validateBinaryHeader(binaryHeader);

  const binaryChunk = new GLTFBuffer(
    buffer,
    28 + jsonChunkLength,
    binaryHeader[0]
  );

  //Const populate missing properties of jsonChunk
  for (const accessor of jsonChunk.accessors) {
    accessor.byteOffset = accessor.byteOffset ?? 0;
    accessor.normalized = accessor.normalized ?? false;
  }

  for (const bufferView of jsonChunk.bufferViews) {
    bufferView.byteOffset = bufferView.byteOffset ?? 0;
  }

  if (jsonChunk.samplers) {
    for (const sampler of jsonChunk.samplers) {
      sampler.wrapS = sampler.wrapS ?? 10497; //GL.REPEAT
      sampler.wrapT = sampler.wrapT ?? 10947; //GL.REPEAT
    }
  }

  //Iterate through the ancestor nodes of the gltf scene, applying world transforms down the tree to children
  /*for (let i = 0; i < jsonChunk.scenes.length; i++) {
    for (const nodeIndex of jsonChunk.scenes[i].nodes) {
      const currentNode = jsonChunk.nodes[nodeIndex];
      setNodeWorldTransformMatrix(jsonChunk, currentNode, mat4.identity());
    }
  } */

  //Mark each accessor with its intended usage within the vertexShader.
  //Often necessary due to infrequencey with which the BufferView target field is populated.
  for (const mesh of jsonChunk.meshes) {
    for (const primitive of mesh.primitives) {
      if ('indices' in primitive) {
        const accessor = jsonChunk.accessors[primitive.indices];
        jsonChunk.accessors[primitive.indices].bufferViewUsage |=
          GPUBufferUsage.INDEX;
        jsonChunk.bufferViews[accessor.bufferView].usage |=
          GPUBufferUsage.INDEX;
      }
      for (const attribute of Object.values(primitive.attributes)) {
        const accessor = jsonChunk.accessors[attribute];
        jsonChunk.accessors[attribute].bufferViewUsage |= GPUBufferUsage.VERTEX;
        jsonChunk.bufferViews[accessor.bufferView].usage |=
          GPUBufferUsage.VERTEX;
      }
    }
  }

  // Create GLTFBufferView objects for all the buffer views in the glTF file
  const bufferViews: GLTFBufferView[] = [];
  for (let i = 0; i < jsonChunk.bufferViews.length; ++i) {
    bufferViews.push(new GLTFBufferView(binaryChunk, jsonChunk.bufferViews[i]));
  }

  const accessors: GLTFAccessor[] = [];
  for (let i = 0; i < jsonChunk.accessors.length; ++i) {
    const accessorInfo = jsonChunk.accessors[i];
    const viewID = accessorInfo['bufferView'];
    accessors.push(new GLTFAccessor(bufferViews[viewID], accessorInfo));
  }

  // Load the first mesh
  const meshes: GLTFMesh[] = [];
  console.log(accessors);
  for (let i = 0; i < jsonChunk.meshes.length; i++) {
    const mesh = jsonChunk.meshes[i];
    const meshPrimitives: GLTFPrimitive[] = [];
    for (let j = 0; j < mesh.primitives.length; ++j) {
      const prim = mesh.primitives[j];
      let topology = prim['mode'];
      // Default is triangles if mode specified
      if (topology === undefined) {
        topology = GLTFRenderMode.TRIANGLES;
      }
      if (
        topology != GLTFRenderMode.TRIANGLES &&
        topology != GLTFRenderMode.TRIANGLE_STRIP
      ) {
        throw Error(`Unsupported primitive mode ${prim['mode']}`);
      }

      const primitiveAttributeMap = {};
      if (jsonChunk['accessors'][prim['indices']] !== undefined) {
        const indices = accessors[prim['indices']];
        primitiveAttributeMap['INDICES'] = indices;
      }

      // Loop through all the attributes to find the POSITION attribute.
      // While we only want the position attribute right now, we'll load
      // the others later as well.
      for (const attr in prim['attributes']) {
        const accessor = accessors[prim['attributes'][attr]];
        primitiveAttributeMap[attr] = accessor;
      }
      meshPrimitives.push(new GLTFPrimitive(topology, primitiveAttributeMap));
    }
    meshes.push(new GLTFMesh(mesh.name, meshPrimitives));
  }

  const skins = [];
  for (const skin of jsonChunk.skins) {
    // Why is this designed this way...
    const inverseBindMatrixAccessor = accessors[skin.inverseBindMatrices];
    inverseBindMatrixAccessor.view.addUsage(
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );
    inverseBindMatrixAccessor.view.needsUpload = true;
  }

  // Upload the buffer views used by mesh
  for (let i = 0; i < bufferViews.length; ++i) {
    if (bufferViews[i].needsUpload) {
      bufferViews[i].upload(device);
    }
  }

  for (const skin of jsonChunk.skins) {
    const inverseBindMatrixAccessor = accessors[skin.inverseBindMatrices];
    const joints = skin.joints;
    skins.push(new GLTFSkin(device, inverseBindMatrixAccessor, joints));
  }

  const nodes: GLTFNode[] = [];

  console.log(jsonChunk.skins);

  // Access each node. If node references a mesh, add mesh to that node
  const nodeUniformsBindGroupLayout = device.createBindGroupLayout({
    label: 'NodeUniforms.bindGroupLayout',
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'uniform',
        },
        visibility: GPUShaderStage.VERTEX,
      },
    ],
  });
  for (const currNode of jsonChunk.nodes) {
    const baseTransformation = new BaseTransformation(
      currNode.translation,
      currNode.rotation,
      currNode.scale
    );
    const nodeToCreate = new GLTFNode(
      device,
      nodeUniformsBindGroupLayout,
      baseTransformation,
      currNode.mesh,
      currNode.name
    );
    const meshToAdd = meshes[currNode.mesh];
    const skinToAdd = currNode.skin;
    if (meshToAdd) {
      nodeToCreate.drawables.push(meshToAdd);
    }
    nodes.push(nodeToCreate);
  }

  // Assign each node its children
  nodes.forEach((node, idx) => {
    const children = jsonChunk.nodes[idx].children;
    if (children) {
      children.forEach((childIdx) => {
        const child = nodes[childIdx];
        child.setParent(node);
      });
    }
  });

  console.log(nodes);

  const scenes: GLTFScene[] = [];

  for (const jsonScene of jsonChunk.scenes) {
    const scene = new GLTFScene(device, nodeUniformsBindGroupLayout, jsonScene);
    const sceneChildren = scene.nodes;
    sceneChildren.forEach((childIdx) => {
      const child = nodes[childIdx];
      child.setParent(scene.root);
    });
    scenes.push(scene);
  }
  console.log(scenes);
  return {
    meshes,
    nodes: jsonChunk.nodes,
    scenes: scenes,
    skins,
  };
};
