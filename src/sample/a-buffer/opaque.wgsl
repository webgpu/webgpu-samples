struct Uniforms {
  modelViewProjectionMatrix: mat4x4<f32>,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) @interpolate(flat) instance: u32
};

@vertex
fn main_vs(@location(0) position: vec4<f32>, @builtin(instance_index) instance: u32) -> VertexOutput {
  var output: VertexOutput;

  // distribute instances into a staggered 4x4 grid
  const gridWidth = 125.0;
  const cellSize = gridWidth / 4.0;
  let row = instance / 2u;
  let col = instance % 2u;

  let xOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 * cellSize * f32(col) + f32(row % 2u != 0u) * cellSize;
  let zOffset = -gridWidth / 2.0 + cellSize / 2.0 + 2.0 + f32(row) * cellSize;

  let offsetPos = vec4(position.x + xOffset, position.y, position.z + zOffset, position.w);

  output.position = uniforms.modelViewProjectionMatrix * offsetPos;
  output.instance = instance;
  return output;
}

@fragment
fn main_fs(@location(0) @interpolate(flat) instance: u32) -> @location(0) vec4<f32> {
  const colors = array<vec3<f32>,6>(
      vec3(1.0, 0.0, 0.0),
      vec3(0.0, 1.0, 0.0),
      vec3(0.0, 0.0, 1.0),
      vec3(1.0, 0.0, 1.0),
      vec3(1.0, 1.0, 0.0),
      vec3(0.0, 1.0, 1.0),
  );

  return vec4(colors[instance % 6u], 1.0);
}