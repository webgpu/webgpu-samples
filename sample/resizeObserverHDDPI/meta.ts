export default {
  name: 'ResizeObserver HD-DPI Fullscreen',
  description: `This example shows how to use ResizeObserver, handle HD-DPI correctly, and Fullscreen
  
There should be no [Moiré patterns](https://www.google.com/search?q=Moir%C3%A9%20pattern) regardless of zoom level.  
<sup>(<a href="https://caniuse.com/mdn-api_resizeobserverentry_devicepixelcontentboxsize">except possibly in Safari</a>)</sup>`,
  filename: __DIRNAME__,
  sources: [{ path: 'main.ts' }, { path: 'checker.wgsl' }],
};
