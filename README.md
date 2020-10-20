# WebGPU Samples

The [WebGPU Samples](//austineng.github.io/webgpu-samples/) are a set of WGSL
and SPIR-V compatible samples demonstrating the use of the
[WebGPU API](//webgpu.dev). Please see the current implementation status at
[webgpu.io](//webgpu.io). SPIR-V compatible samples will be removed when WGSL
is fully implemented.

These samples run in Chrome Canary behind the flag `--enable-unsafe-webgpu`. If
something isn't working, please file an issue
[here](https://github.com/austinEng/webgpu-samples/issues).

## Building
`webgpu-samples` is built with [Typescript](https://www.typescriptlang.org/)
and compiled using [webpack](https://webpack.js.org/). Building the project
requires an installation of [Node.js](https://nodejs.org/en/).

- Install dependencies: `npm install`.
- For development, start the dev server which will watch and recompile
  sources: `npm start`.
- For production, compile the project: `npm run build`.
- To view the project locally in the browser, start a web server in the project
  root directory. [`http-server`](https://www.npmjs.com/package/http-server) is
  the recommended package.

### Example

```
npm install
npm run-script build   # or `npm start` and do the following in a separate terminal
npm run-script serve
```
