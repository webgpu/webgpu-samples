export default {
  name: 'Reversed Z',
  description: `This example shows the use of reversed z technique for better utilization of depth buffer precision.
    The left column uses regular method, while the right one uses reversed z technique.
    Both are using depth32float as their depth buffer format. A set of red and green planes are positioned very close to each other.
    Higher sets are placed further from camera (and are scaled for better visual purpose).
    To use reversed z to render your scene, you will need depth store value to be 0.0, depth compare function to be greater,
    and remap depth range by multiplying an additional matrix to your projection matrix.
    Related reading:
    https://developer.nvidia.com/content/depth-precision-visualized
    https://web.archive.org/web/20220724174000/https://thxforthefish.com/posts/reverse_z/
    `,
  filename: 'sample/reversedZ',
  sources: [
    { path: 'main.ts' },
    { path: 'vertex.wgsl' },
    { path: 'fragment.wgsl' },
    { path: 'vertexDepthPrePass.wgsl' },
    { path: 'vertexTextureQuad.wgsl' },
    { path: 'fragmentTextureQuad.wgsl' },
    { path: 'vertexPrecisionErrorPass.wgsl' },
    { path: 'fragmentPrecisionErrorPass.wgsl' },
  ],
};
