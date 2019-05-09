These WebGPU samples ([source](https://github.com/austinEng/webgpu-samples)) are a set of SPIR-V compatible samples demonstrating the use of the WebGPU API. Please see the current implementation status at [webgpu.io](//webgpu.io).

## [Hello Triangle](hello_triangle.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/hello_triangle.html))
This sample shows rendering a basic triangle.

## [Rotating Cube](rotating_cube.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/rotating_cube.html))
This sample shows rendering a basic 3D cube with a dynamically updating transformation.

## [Textured Cube](textured_cube.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/textured_cube.html))
This sample builds on the Rotating Cube sample and adds an image texture to the cube faces.

## [Fractal Cube](fractal_cube.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/fractal_cube.html))
This sample draws the same rotating cube inside of itself by copying the previous frame's result into the cube texture.

## [Compute Boids](compute_boids.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/compute_boids.html))
This sample uses a compute shader to run a simple simulation of multiple "boids" moving on the screen. The simulation is based on the flocking behaviors of birds in [Craig Reynolds' SIGGRAPH paper](http://www.red3d.com/cwr/papers/1987/SIGGRAPH87.pdf).

## [Animometer](animometer.html) ([source](https://github.com/austinEng/webgpu-samples/blob/master/animometer.html))
This sample is a WebGPU port of the [WebGL Animometer](http://kenrussell.github.io/webgl-animometer/Animometer/tests/3d/webgl.html) which draws tens of thousands of rotating triangles.
