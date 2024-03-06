import { Mat4 } from 'wgpu-matrix';
import { GLTFNode } from './glbUtils';

/* eslint @typescript-eslint/no-explicit-any: "off" */

/* Sourced from https://github.com/bwasty/gltf-loader-ts/blob/master/source/gltf.ts */
/* License for use can be found here: https://github.com/bwasty/gltf-loader-ts/blob/master/LICENSE */
/* Comments and types have been excluded from original source for sake of cleanliness and brevity */
export type GlTfId = number;

export interface AccessorSparseIndices {
  bufferView: GlTfId;
  byteOffset?: number;
  componentType: 5121 | 5123 | 5125 | number;
}

export interface AccessorSparseValues {
  bufferView: GlTfId;
  byteOffset?: number;
}

export interface AccessorSparse {
  count: number;
  indices: AccessorSparseIndices;
  values: AccessorSparseValues;
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
  name?: string;
}

export interface AnimationChannelTarget {
  node?: GlTfId;
  path: 'translation' | 'rotation' | 'scale' | 'weights' | string;
}

export interface AnimationChannel {
  sampler: GlTfId;
  target: AnimationChannelTarget;
}

export interface AnimationSampler {
  input: GlTfId;
  interpolation?: 'LINEAR' | 'STEP' | 'CUBICSPLINE' | string;
  output: GlTfId;
}

export interface Animation {
  channels: AnimationChannel[];
  samplers: AnimationSampler[];
  name?: string;
}

export interface Asset {
  copyright?: string;
  generator?: string;
  version: string;
  minVersion?: string;
}

export interface Buffer {
  uri?: string;
  byteLength: number;
  name?: string;
}

export interface BufferView {
  buffer: GlTfId;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
  target?: 34962 | 34963 | number;
  name?: string;
  usage?: number;
}

export interface CameraOrthographic {
  xmag: number;
  ymag: number;
  zfar: number;
  znear: number;
}

export interface CameraPerspective {
  aspectRatio?: number;
  yfov: number;
  zfar?: number;
  znear: number;
}

export interface Camera {
  orthographic?: CameraOrthographic;
  perspective?: CameraPerspective;
  type: 'perspective' | 'orthographic' | string;
  name?: string;
}

export interface Image {
  uri?: string;
  mimeType?: 'image/jpeg' | 'image/png' | string;
  bufferView?: GlTfId;
  name?: string;
}

export interface TextureInfo {
  index: GlTfId;
  texCoord?: number;
}

export interface MaterialPbrMetallicRoughness {
  baseColorFactor?: number[];
  baseColorTexture?: TextureInfo;
  metallicFactor?: number;
  roughnessFactor?: number;
  metallicRoughnessTexture?: TextureInfo;
}
export interface MaterialNormalTextureInfo {
  index?: number;
  texCoord?: number;
  scale?: number;
}
export interface MaterialOcclusionTextureInfo {
  index?: number;
  texCoord?: number;
  strength?: number;
}

export interface Material {
  name?: string;
  pbrMetallicRoughness?: MaterialPbrMetallicRoughness;
  normalTexture?: MaterialNormalTextureInfo;
  occlusionTexture?: MaterialOcclusionTextureInfo;
  emissiveTexture?: TextureInfo;
  emissiveFactor?: number[];
  alphaMode?: 'OPAQUE' | 'MASK' | 'BLEND' | string;
  alphaCutoff?: number;
  doubleSided?: boolean;
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
}

export interface Mesh {
  primitives: MeshPrimitive[];
  weights?: number[];
  name?: string;
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
  name?: string;
}

export interface Sampler {
  magFilter?: 9728 | 9729 | number;
  minFilter?: 9728 | 9729 | 9984 | 9985 | 9986 | 9987 | number;
  wrapS?: 33071 | 33648 | 10497 | number;
  wrapT?: 33071 | 33648 | 10497 | number;
  name?: string;
}

export interface Scene {
  nodes?: GlTfId[];
  name?: string;
  root?: GLTFNode;
}
export interface Skin {
  inverseBindMatrices?: GlTfId;
  skeleton?: GlTfId;
  joints: GlTfId[];
  name?: string;
}

export interface Texture {
  sampler?: GlTfId;
  source?: GlTfId;
  name?: string;
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
}
