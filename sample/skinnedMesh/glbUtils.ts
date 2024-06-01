import { Quatn } from 'wgpu-matrix';
import { Accessor, BufferView, GlTf, Scene } from './gltf';
import { Mat4, Vec3n, mat4 } from 'wgpu-matrix';

//NOTE: GLTF code is not generally extensible to all gltf models
// Modified from Will Usher code found at this link https://www.willusher.io/graphics/2023/05/16/0-to-gltf-first-mesh

// Associates the mode paramete of a gltf primitive object with the primitive's intended render mode
enum GLTFRenderMode {
  POINTS = 0,
  LINE = 1,
  LINE_LOOP = 2,
  LINE_STRIP = 3,
  TRIANGLES = 4,
  TRIANGLE_STRIP = 5,
  TRIANGLE_FAN = 6,
}

// Determines how to interpret each element of the structure that is accessed from our accessor
enum GLTFDataComponentType {
  BYTE = 5120,
  UNSIGNED_BYTE = 5121,
  SHORT = 5122,
  UNSIGNED_SHORT = 5123,
  INT = 5124,
  UNSIGNED_INT = 5125,
  FLOAT = 5126,
  DOUBLE = 5130,
}

// Determines how to interpret the structure of the values accessed by an accessor
enum GLTFDataStructureType {
  SCALAR = 0,
  VEC2 = 1,
  VEC3 = 2,
  VEC4 = 3,
  MAT2 = 4,
  MAT3 = 5,
  MAT4 = 6,
}

export const alignTo = (val: number, align: number): number => {
  return Math.floor((val + align - 1) / align) * align;
};

const parseGltfDataStructureType = (type: string) => {
  switch (type) {
    case 'SCALAR':
      return GLTFDataStructureType.SCALAR;
    case 'VEC2':
      return GLTFDataStructureType.VEC2;
    case 'VEC3':
      return GLTFDataStructureType.VEC3;
    case 'VEC4':
      return GLTFDataStructureType.VEC4;
    case 'MAT2':
      return GLTFDataStructureType.MAT2;
    case 'MAT3':
      return GLTFDataStructureType.MAT3;
    case 'MAT4':
      return GLTFDataStructureType.MAT4;
    default:
      throw Error(`Unhandled glTF Type ${type}`);
  }
};

const gltfDataStructureTypeNumComponents = (type: GLTFDataStructureType) => {
  switch (type) {
    case GLTFDataStructureType.SCALAR:
      return 1;
    case GLTFDataStructureType.VEC2:
      return 2;
    case GLTFDataStructureType.VEC3:
      return 3;
    case GLTFDataStructureType.VEC4:
    case GLTFDataStructureType.MAT2:
      return 4;
    case GLTFDataStructureType.MAT3:
      return 9;
    case GLTFDataStructureType.MAT4:
      return 16;
    default:
      throw Error(`Invalid glTF Type ${type}`);
  }
};

// Note: only returns non-normalized type names,
// so byte/ubyte = sint8/uint8, not snorm8/unorm8, same for ushort
const gltfVertexType = (
  componentType: GLTFDataComponentType,
  type: GLTFDataStructureType
) => {
  let typeStr = null;
  switch (componentType) {
    case GLTFDataComponentType.BYTE:
      typeStr = 'sint8';
      break;
    case GLTFDataComponentType.UNSIGNED_BYTE:
      typeStr = 'uint8';
      break;
    case GLTFDataComponentType.SHORT:
      typeStr = 'sint16';
      break;
    case GLTFDataComponentType.UNSIGNED_SHORT:
      typeStr = 'uint16';
      break;
    case GLTFDataComponentType.INT:
      typeStr = 'int32';
      break;
    case GLTFDataComponentType.UNSIGNED_INT:
      typeStr = 'uint32';
      break;
    case GLTFDataComponentType.FLOAT:
      typeStr = 'float32';
      break;
    default:
      throw Error(`Unrecognized or unsupported glTF type ${componentType}`);
  }

  switch (gltfDataStructureTypeNumComponents(type)) {
    case 1:
      return typeStr;
    case 2:
      return typeStr + 'x2';
    case 3:
      return typeStr + 'x3';
    case 4:
      return typeStr + 'x4';
    // Vertex attributes should never be a matrix type, so we should not hit this
    // unless we're passed an improperly created gltf file
    default:
      throw Error(`Invalid number of components for gltfType: ${type}`);
  }
};

const gltfElementSize = (
  componentType: GLTFDataComponentType,
  type: GLTFDataStructureType
) => {
  let componentSize = 0;
  switch (componentType) {
    case GLTFDataComponentType.BYTE:
      componentSize = 1;
      break;
    case GLTFDataComponentType.UNSIGNED_BYTE:
      componentSize = 1;
      break;
    case GLTFDataComponentType.SHORT:
      componentSize = 2;
      break;
    case GLTFDataComponentType.UNSIGNED_SHORT:
      componentSize = 2;
      break;
    case GLTFDataComponentType.INT:
      componentSize = 4;
      break;
    case GLTFDataComponentType.UNSIGNED_INT:
      componentSize = 4;
      break;
    case GLTFDataComponentType.FLOAT:
      componentSize = 4;
      break;
    case GLTFDataComponentType.DOUBLE:
      componentSize = 8;
      break;
    default:
      throw Error('Unrecognized GLTF Component Type?');
  }
  return gltfDataStructureTypeNumComponents(type) * componentSize;
};

// Convert differently depending on if the shader is a vertex or compute shader
const convertGPUVertexFormatToWGSLFormat = (vertexFormat: GPUVertexFormat) => {
  switch (vertexFormat) {
    case 'float32': {
      return 'f32';
    }
    case 'float32x2': {
      return 'vec2f';
    }
    case 'float32x3': {
      return 'vec3f';
    }
    case 'float32x4': {
      return 'vec4f';
    }
    case 'uint32': {
      return 'u32';
    }
    case 'uint32x2': {
      return 'vec2u';
    }
    case 'uint32x3': {
      return 'vec3u';
    }
    case 'uint32x4': {
      return 'vec4u';
    }
    case 'uint8x2': {
      return 'vec2u';
    }
    case 'uint8x4': {
      return 'vec4u';
    }
    case 'uint16x4': {
      return 'vec4u';
    }
    case 'uint16x2': {
      return 'vec2u';
    }
    default: {
      return 'f32';
    }
  }
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
    // NOTE: This creates a uint8array view into the buffer!
    // When we call .buffer on this view, it will give us back the original array buffer
    // Accordingly, when converting our buffer from a uint8array to a float32array representation
    // we need to apply the byte offset of our view when creating our buffer
    // ie new Float32Array(this.view.buffer, this.view.byteOffset, this.view.byteLength)
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
  componentType: GLTFDataComponentType;
  structureType: GLTFDataStructureType;
  view: GLTFBufferView;
  byteOffset: number;
  constructor(view: GLTFBufferView, accessor: Accessor) {
    this.count = accessor['count'];
    this.componentType = accessor['componentType'];
    this.structureType = parseGltfDataStructureType(accessor['type']);
    this.view = view;
    this.byteOffset = 0;
    if (accessor['byteOffset'] !== undefined) {
      this.byteOffset = accessor['byteOffset'];
    }
  }

  get byteStride() {
    const elementSize = gltfElementSize(this.componentType, this.structureType);
    return Math.max(elementSize, this.view.byteStride);
  }

  get byteLength() {
    return this.count * this.byteStride;
  }

  // Get the vertex attribute type for accessors that are used as vertex attributes
  get vertexType() {
    return gltfVertexType(this.componentType, this.structureType);
  }
}

interface AttributeMapInterface {
  [key: string]: GLTFAccessor;
}

export class GLTFPrimitive {
  topology: GLTFRenderMode;
  renderPipeline: GPURenderPipeline;
  private attributeMap: AttributeMapInterface;
  private attributes: string[] = [];
  constructor(
    topology: GLTFRenderMode,
    attributeMap: AttributeMapInterface,
    attributes: string[]
  ) {
    this.topology = topology;
    this.renderPipeline = null;
    // Maps attribute names to accessors
    this.attributeMap = attributeMap;
    this.attributes = attributes;

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
    vertexShader: string,
    fragmentShader: string,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    bgLayouts: GPUBindGroupLayout[],
    label: string
  ) {
    // For now, just check if the attributeMap contains a given attribute using map.has(), and add it if it does
    // POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 for order
    // Vertex attribute state and shader stage
    let VertexInputShaderString = `struct VertexInput {\n`;
    const vertexBuffers: GPUVertexBufferLayout[] = this.attributes.map(
      (attr, idx) => {
        const vertexFormat: GPUVertexFormat =
          this.attributeMap[attr].vertexType;
        const attrString = attr.toLowerCase().replace(/_0$/, '');
        VertexInputShaderString += `\t@location(${idx}) ${attrString}: ${convertGPUVertexFormatToWGSLFormat(
          vertexFormat
        )},\n`;
        return {
          arrayStride: this.attributeMap[attr].byteStride,
          attributes: [
            {
              format: this.attributeMap[attr].vertexType,
              offset: this.attributeMap[attr].byteOffset,
              shaderLocation: idx,
            },
          ],
        } as GPUVertexBufferLayout;
      }
    );
    VertexInputShaderString += '}';

    const vertexState: GPUVertexState = {
      // Shader stage info
      module: device.createShaderModule({
        code: VertexInputShaderString + vertexShader,
      }),
      buffers: vertexBuffers,
    };

    const fragmentState: GPUFragmentState = {
      // Shader info
      module: device.createShaderModule({
        code: VertexInputShaderString + fragmentShader,
      }),
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
    this.attributes.map((attr, idx) => {
      renderPassEncoder.setVertexBuffer(
        idx,
        this.attributeMap[attr].view.gpuBuffer,
        this.attributeMap[attr].byteOffset,
        this.attributeMap[attr].byteLength
      );
    });

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
    vertexShader: string,
    fragmentShader: string,
    colorFormat: GPUTextureFormat,
    depthFormat: GPUTextureFormat,
    bgLayouts: GPUBindGroupLayout[]
  ) {
    // We take a pretty simple approach to start. Just loop through all the primitives and
    // build their respective render pipelines
    for (let i = 0; i < this.primitives.length; ++i) {
      this.primitives[i].buildRenderPipeline(
        device,
        vertexShader,
        fragmentShader,
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

type TempReturn = {
  meshes: GLTFMesh[];
  nodes: GLTFNode[];
  scenes: GLTFScene[];
  skins: GLTFSkin[];
};

export class BaseTransformation {
  position: Vec3n;
  rotation: Quatn;
  scale: Vec3n;
  constructor(
    // Identity translation vec3
    position = [0, 0, 0],
    // Identity quaternion
    rotation = [0, 0, 0, 1],
    // Identity scale vec3
    scale = [1, 1, 1]
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
  getMatrix(): Mat4 {
    // Analagous to let transformationMatrix: mat4x4f = translation * rotation * scale;
    const dst = mat4.identity();
    // Scale the transformation Matrix
    mat4.scale(dst, this.scale, dst);
    // Calculate the rotationMatrix from the quaternion
    const rotationMatrix = mat4.fromQuat(this.rotation);
    // Apply the rotation Matrix to the scaleMatrix (rotMat * scaleMat)
    mat4.multiply(rotationMatrix, dst, dst);
    // Translate the transformationMatrix
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
    // Get local transform of this particular node, and if the node has a parent,
    // multiply it against the parent's transform matrix to get transformMatrix relative to world.
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
      worldMatrix.buffer,
      worldMatrix.byteOffset,
      worldMatrix.byteLength
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
        if (this.skin) {
          drawable.render(passEncoder, [
            ...bindGroups,
            this.nodeTransformBindGroup,
            this.skin.skinBindGroup,
          ]);
        } else {
          drawable.render(passEncoder, [
            ...bindGroups,
            this.nodeTransformBindGroup,
          ]);
        }
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
  root: GLTFNode;
  name?: string;

  constructor(
    device: GPUDevice,
    nodeTransformBGL: GPUBindGroupLayout,
    baseScene: Scene
  ) {
    this.nodes = baseScene.nodes;
    this.name = baseScene.name;
    this.root = new GLTFNode(
      device,
      nodeTransformBGL,
      new BaseTransformation(),
      baseScene.name
    );
  }
}

export class GLTFSkin {
  // Nodes of the skin's joints
  // [5, 2, 3] means our joint info is at nodes 5, 2, and 3
  joints: number[];
  // Bind Group for this skin's uniform buffer
  skinBindGroup: GPUBindGroup;
  // Static bindGroupLayout shared across all skins
  // In a larger shader with more properties, certain bind groups
  // would likely have to be combined due to device limitations in the number of bind groups
  // allowed within a shader
  // Inverse bind matrices parsed from the accessor
  private inverseBindMatrices: Float32Array;
  private jointMatricesUniformBuffer: GPUBuffer;
  private inverseBindMatricesUniformBuffer: GPUBuffer;
  static skinBindGroupLayout: GPUBindGroupLayout;

  static createSharedBindGroupLayout(device: GPUDevice) {
    this.skinBindGroupLayout = device.createBindGroupLayout({
      label: 'StaticGLTFSkin.bindGroupLayout',
      entries: [
        // Holds the initial joint matrices buffer
        {
          binding: 0,
          buffer: {
            type: 'read-only-storage',
          },
          visibility: GPUShaderStage.VERTEX,
        },
        // Holds the inverse bind matrices buffer
        {
          binding: 1,
          buffer: {
            type: 'read-only-storage',
          },
          visibility: GPUShaderStage.VERTEX,
        },
      ],
    });
  }

  // For the sake of simplicity and easier debugging, we're going to convert our skin gpu accessor to a
  // float32array, which should be performant enough for this example since there is only one skin (again, this)
  // is not a comprehensive gltf parser
  constructor(
    device: GPUDevice,
    inverseBindMatricesAccessor: GLTFAccessor,
    joints: number[]
  ) {
    if (
      inverseBindMatricesAccessor.componentType !==
        GLTFDataComponentType.FLOAT ||
      inverseBindMatricesAccessor.byteStride !== 64
    ) {
      throw Error(
        `This skin's provided accessor does not access a mat4x4f matrix, or does not access the provided mat4x4f data correctly`
      );
    }
    // NOTE: Come back to this uint8array to float32array conversion in case it is incorrect
    this.inverseBindMatrices = new Float32Array(
      inverseBindMatricesAccessor.view.view.buffer,
      inverseBindMatricesAccessor.view.view.byteOffset,
      inverseBindMatricesAccessor.view.view.byteLength / 4
    );
    this.joints = joints;
    const skinGPUBufferUsage: GPUBufferDescriptor = {
      size: Float32Array.BYTES_PER_ELEMENT * 16 * joints.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    };
    this.jointMatricesUniformBuffer = device.createBuffer(skinGPUBufferUsage);
    this.inverseBindMatricesUniformBuffer =
      device.createBuffer(skinGPUBufferUsage);
    device.queue.writeBuffer(
      this.inverseBindMatricesUniformBuffer,
      0,
      this.inverseBindMatrices
    );
    this.skinBindGroup = device.createBindGroup({
      layout: GLTFSkin.skinBindGroupLayout,
      label: 'StaticGLTFSkin.bindGroup',
      entries: [
        {
          binding: 0,
          resource: {
            buffer: this.jointMatricesUniformBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: this.inverseBindMatricesUniformBuffer,
          },
        },
      ],
    });
  }

  update(device: GPUDevice, currentNodeIndex: number, nodes: GLTFNode[]) {
    const globalWorldInverse = mat4.inverse(
      nodes[currentNodeIndex].worldMatrix
    );
    for (let j = 0; j < this.joints.length; j++) {
      const joint = this.joints[j];
      const dstMatrix = mat4.identity();
      mat4.multiply(globalWorldInverse, nodes[joint].worldMatrix, dstMatrix);
      const toWrite = dstMatrix;
      device.queue.writeBuffer(
        this.jointMatricesUniformBuffer,
        j * 64,
        toWrite.buffer,
        toWrite.byteOffset,
        toWrite.byteLength
      );
    }
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
      const attributes = [];
      if (jsonChunk['accessors'][prim['indices']] !== undefined) {
        const indices = accessors[prim['indices']];
        primitiveAttributeMap['INDICES'] = indices;
      }

      // Loop through all the attributes and store within our attributeMap
      for (const attr in prim['attributes']) {
        const accessor = accessors[prim['attributes'][attr]];
        primitiveAttributeMap[attr] = accessor;
        if (accessor.structureType > 3) {
          throw Error(
            'Vertex attribute accessor accessed an unsupported data type for vertex attribute'
          );
        }
        attributes.push(attr);
      }
      meshPrimitives.push(
        new GLTFPrimitive(topology, primitiveAttributeMap, attributes)
      );
    }
    meshes.push(new GLTFMesh(mesh.name, meshPrimitives));
  }

  const skins: GLTFSkin[] = [];
  for (const skin of jsonChunk.skins) {
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

  GLTFSkin.createSharedBindGroupLayout(device);
  for (const skin of jsonChunk.skins) {
    const inverseBindMatrixAccessor = accessors[skin.inverseBindMatrices];
    const joints = skin.joints;
    skins.push(new GLTFSkin(device, inverseBindMatrixAccessor, joints));
  }

  const nodes: GLTFNode[] = [];

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
      currNode.name,
      skins[currNode.skin]
    );
    const meshToAdd = meshes[currNode.mesh];
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
  return {
    meshes,
    nodes,
    scenes,
    skins,
  };
};
