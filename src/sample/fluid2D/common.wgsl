/* DEFINITIONS */

// The offsets represent nine (TODO: eight?) possible movements (from top to bottom)
const CardinalOffsets: array<vec2<i32>, 9> = array<vec2<i32>, 9>(
  vec2<i32>(-1, 1),
  vec2<i32>(0, 1),
  vec2<i32>(1, 1),
  vec2<i32>(-1, 0),
  vec2<i32>(0, 0),
  vec2<i32>(1, 0),
  vec2<i32>(-1, -1),
  vec2<i32>(0, -1),
  vec2<i32>(1, -1)
);

struct Uniforms {
  // Number of particles in the simulation
  num_particles: u32,
  // Fixed time step
  delta_time: f32,
  // Width and height of the bounding box
  bounds_size: f32,
  // Minimum x, y position in the bounding_box,
  bounds_min: f32,
  // Width / height of a single cell within the simulation box
  cell_size: f32,
  // Number of cells along any axis
  cells_per_axis: f32,
  /// EPSILON Value
  eps: f32,
}

struct SpatialEntry {
  // The global_id.x index of the particle
  index: u32,
  // The hash of the cell that contains the particle
  hash: u32,
}

// Solver Constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
const GRAVITY = vec2<f32>(0.0, -9.8);
const REST_DENSITY = 2.0;
//const REST_DENSITY = 300.0;
const GAS_CONSTANT = 2000.0;
const VISCOSITY_COEFFICIENT = 0.25;
// For now, smoothing radius and visual radius should be the same to decrease confusion
const RADIUS = 1.0;
const RADIUS2 = 1.0;
const RADIUS3 = 1.0;
const RADIUS4 = 1.0;
const RADIUS5 = 1.0;
const MASS = 2.5;
const MASS2 = 6.25;
const VISCOSITY = 200.0;
const DT = 0.0007;
const PI = 3.14159265;

/* HASH FUNCTIONS */

// Convert floating point position into an integer cell coordinate
// Each cell is twice the length of our particle's smoothing radius,
// allowing each particle to only have to look in nine directions 
// for neighboring particles within its cell
// Example: Particle radius: 2.0, Cell_size: 4.0, Position: 24.5, 7.2
// Cell = (24.5 / 4.0, 7.2 / 4.0) -> (6, 1)
fn GetCell2D(position: vec2<f32>, cell_size: f32) -> vec2<i32> {
  return vec2<i32>(
    i32(floor(position.x / cell_size)), 
    i32(floor(position.y / cell_size))
  );
}

// least numerically insane way to assign each cell a unique number
// Dimensions needs to be greater than the max value of cell.x or cell.y
// Avoid this collision scenario (2, 1) -> 12 (12, 0) -> 12
//
fn SimpleHash2D(cell: vec2<i32>, cells_per_axis: f32) -> u32 {
  // Adjust only if there are negative cell values
  let x = cell.x + i32(abs(min(-cells_per_axis * 0.5, 0)));
  let y = cell.y + i32(abs(min(-cells_per_axis * 0.5, 0)));
  // Has to be a u32 since we will use it to index
  return u32(x + y * i32(cells_per_axis));
}

/* DISTRIBUTION FUNCTIONS / CONSTANTS */

fn SmoothKernel(dst: f32) -> f32 {
  let x = 1.0 - dst / RADIUS2;
  return 315.0 / (64.0 * PI * RADIUS3) * x * x * x;
}

// Doyub Kim page 130
fn SpikyKernelFirstDerivative(dst: f32) -> f32 {
  let x = 1.0 - dst / RADIUS;
  return -45.0 / ( PI * RADIUS4 ) * x * x;
}

// Doyub Kim page 130
fn SpikyKernelSecondDerivative(dst: f32) -> f32 {
  let x = 1.0 - dst / RADIUS;
  return 90.0 / ( PI * RADIUS5 ) * x;
}

// Doyub Kim page 130
fn SpikyKernelGradient(dst: f32, dir: vec2<f32>) -> vec2<f32> {
  return dir * SpikyKernelFirstDerivative(dst);
}

// Kernel constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
/*const POLY6 = 4.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 8.0));
const SPIKY_GRADIENT = -10.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 5.0));
const VISCOSITY_LAPACIAN = 40.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 5.0));


const DENSITY_WEIGHT_CONSTANT = 0.00497359197162172924277761760539;
const SPIKY_GRADIENT_CONSTANT = -0.09947183943243458485555235210782;
const VISC_LAPASIAN_CONSTANT = 0.39788735772973833942220940843129; */



