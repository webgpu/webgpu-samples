import { Mat4 } from 'wgpu-matrix';
import { GLTFNode } from './glbUtils';

/* Sourced from https://github.com/bwasty/gltf-loader-ts/blob/master/source/gltf.ts */
/* License for use can be found here: https://github.com/bwasty/gltf-loader-ts/blob/master/LICENSE */
/* Comments have been excluded from original source for sake of cleanliness and brevity */
export type GlTfId = number;

export interface AccessorSparseIndices {
  bufferView: GlTfId;
  byteOffset?: number;
  componentType: 5121 | 5123 | 5125 | number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface AccessorSparseValues {
  bufferView: GlTfId;
  byteOffset?: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface AccessorSparse {
  count: number;
  indices: AccessorSparseIndices;
  values: AccessorSparseValues;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Accessor {
  bufferView?: GlTfId;
  bufferViewUsage?: 34962 | 34963 | number;
  byteOffset?: number;
  componentType: 5120 | 5121 | 5122 | 5123 | 5125 | 5126 | number;
  normalized?: boolean;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4' | string;
  max?: number[];
  min?: number[];
  sparse?: AccessorSparse;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface AnimationChannelTarget {
  node?: GlTfId;
  path: 'translation' | 'rotation' | 'scale' | 'weights' | string;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface AnimationChannel {
  sampler: GlTfId;
  target: AnimationChannelTarget;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface AnimationSampler {
  input: GlTfId;
  interpolation?: 'LINEAR' | 'STEP' | 'CUBICSPLINE' | string;
  output: GlTfId;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Animation {
  channels: AnimationChannel[];
  samplers: AnimationSampler[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Asset {
  copyright?: string;
  generator?: string;
  version: string;
  minVersion?: string;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Buffer {
  uri?: string;
  byteLength: number;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface BufferView {
  buffer: GlTfId;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
  target?: 34962 | 34963 | number;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
  usage?: number;
}

export interface CameraOrthographic {
  xmag: number;
  ymag: number;
  zfar: number;
  znear: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface CameraPerspective {
  aspectRatio?: number;
  yfov: number;
  zfar?: number;
  znear: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Camera {
  orthographic?: CameraOrthographic;
  perspective?: CameraPerspective;
  type: 'perspective' | 'orthographic' | string;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Image {
  uri?: string;
  mimeType?: 'image/jpeg' | 'image/png' | string;
  bufferView?: GlTfId;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface TextureInfo {
  index: GlTfId;
  texCoord?: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface MaterialPbrMetallicRoughness {
  baseColorFactor?: number[];
  baseColorTexture?: TextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  metallicRoughnessTexture?: TextureInfo;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}
export interface MaterialNormalTextureInfo {
  index?: any;
  texCoord?: any;
  scale?: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}
export interface MaterialOcclusionTextureInfo {
  index?: any;
  texCoord?: any;
  strength?: number;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Material {
  name?: any;
  extensions?: any;
  extras?: any;
  pbrMetallicRoughness?: MaterialPbrMetallicRoughness;
  normalTexture?: MaterialNormalTextureInfo;
  occlusionTexture?: MaterialOcclusionTextureInfo;
  emissiveTexture?: TextureInfo;
  emissiveFactor?: number[];
  alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND' | string;
  alphaCutoff?: number;
  doubleSided?: boolean;
  [k: string]: any;
}

export interface MeshPrimitive {
  attributes: {
    [k: string]: GlTfId;
  };
  indices?: GlTfId;
  material?: GlTfId;
  mode?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | number;
  targets?: {
    [k: string]: GlTfId;
  }[];
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Mesh {
  primitives: MeshPrimitive[];
  weights?: number[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Node {
  camera?: GlTfId;
  children?: GlTfId[];
  skin?: GlTfId;
  matrix?: number[];
  worldTransformationMatrix?: Mat4;
  mesh?: GlTfId;
  rotation?: number[];
  scale?: number[];
  translation?: number[];
  weights?: number[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface Sampler {
  magFilter?: 9728 | 9729 | number;
  minFilter?: 9728 | 9729 | 9984 | 9985 | 9986 | 9987 | number;
  wrapS?: 33071 | 33648 | 10497 | number;
  wrapT?: 33071 | 33648 | 10497 | number;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}
/**
 * The root nodes of a scene.
 */
export interface Scene {
  nodes?: GlTfId[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
  root?: GLTFNode;
}
export interface Skin {
  /**
   * The index of the accessor containing the floating-point 4x4 inverse-bind matrices.  The default is that each matrix is a 4x4 identity matrix, which implies that inverse-bind matrices were pre-applied.
   */
  inverseBindMatrices?: GlTfId;
  /**
   * The index of the node used as a skeleton root. When undefined, joints transforms resolve to scene root.
   */
  skeleton?: GlTfId;
  /**
   * Indices of skeleton nodes, used as joints in this skin.
   */
  joints: GlTfId[];
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}
/**
 * A texture and its sampler.
 */
export interface Texture {
  sampler?: GlTfId;
  source?: GlTfId;
  name?: any;
  extensions?: any;
  extras?: any;
  [k: string]: any;
}

export interface GlTf {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  accessors?: Accessor[];
  animations?: Animation[];
  asset: Asset;
  buffers?: Buffer[];
  bufferViews?: BufferView[];
  cameras?: Camera[];
  images?: Image[];
  materials?: Material[];
  meshes?: Mesh[];
  nodes?: Node[];
  samplers?: Sampler[];
  scene?: GlTfId;
  scenes?: Scene[];
  skins?: Skin[];
  textures?: Texture[];
  extensions?: any;
  extras?: any;
  [k: string]: any;
}
