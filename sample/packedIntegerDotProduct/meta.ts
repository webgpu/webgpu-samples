export default {
  name: 'Packed Integer Dot Product',
  description:
    'Packs four signed 8-bit integers into each u32, computes their dot product with dot4I8Packed, and reads back the results.',
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: 'packed.wgsl' }],
};
