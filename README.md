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
and compiled using [Next.js](https://nextjs.org/). Building the project
requires an installation of [Node.js](https://nodejs.org/en/).

- Install dependencies: `npm install`.
- For development, start the dev server which will watch and recompile
  sources: `npm start`. You can navigate to http://localhost:3000 to view the project.
- For production, compile the project: `npm run build`.
- To run a production server to serve the built assets, do `npm run serve`.

### Example

```
npm install
npm run-script build   # or `npm start` and do the following in a separate terminal
npm run-script serve
```
