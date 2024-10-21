export default {
  name: 'Text Rendering - MSDF',
  description: `This example uses multichannel signed distance fields (MSDF) to render text. MSDF
fonts are more complex to implement than using Canvas 2D to generate text, but the resulting
text looks smoother while using less memory than the Canvas 2D approach, especially at high
zoom levels. They can be used to render larger amounts of text efficiently.

The font texture is generated using [Don McCurdy's MSDF font generation tool](https://msdf-bmfont.donmccurdy.com/),
which is built on [Viktor Chlumský's msdfgen library](https://github.com/Chlumsky/msdfgen).`,
  filename: __DIRNAME__,
  sources: [
    { path: 'main.ts' },
    { path: 'msdfText.ts' },
    { path: 'msdfText.wgsl' },
    { path: '../../shaders/basic.vert.wgsl' },
    { path: '../../shaders/vertexPositionColor.frag.wgsl' },
    { path: '../../meshes/cube.ts' },
  ],
};
