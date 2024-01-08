// The offsets represent nine possible movements (from top to bottom)
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

struct GeneralUniforms {
  num_particles: u32,
  delta_time: f32,
  bounds_x: f32,
  bounds_y: f32,
}

struct SpatialEntry {
  index: u32,
  hash: u32,
  key: u32,
}

// Hash constants
const hashK1: u32 = 15823;
const hashK2: u32 = 9737333;

// Solver Constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
const GRAVITY = vec2<f32>(0.0, -9.8);
const REST_DENSITY = 300.0;
const GAS_CONSTANT = 2000.0;
// For now, smoothing radius and visual radius should be the same to decrease confusion
const RADIUS = 1;
const RADIUS_SQR = 256.0;
const MASS = 2.5;
const MASS_SQR = 6.25;
const VISCOSITY = 200.0;
const DELTA_TIME = 0.0007;

// Kernel constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
const POLY6 = 4.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 8.0));
const SPIKY_GRADIENT = -10.0 / (3.141592653 * POW(SMOOTHING_RADIUS, 5.0));
const VISCOSITY_LAPACIAN = 40.0 / (3.141592653 * POW(SMOOTHING_RADIUS, 5.0));


const DENSITY_WEIGHT_CONSTANT = 0.00497359197162172924277761760539;
const SPIKY_GRADIENT_CONSTANT = -0.09947183943243458485555235210782;
const VISC_LAPASIAN_CONSTANT = 0.39788735772973833942220940843129;

// Convert floating point position into an integer cell coordinate
// Each cell is twice the length of our particle's smoothing radius,
// allowing each particle to only have to look in nine directions 
// for neighboring particles within its cell
// Example: Particle radius: 2.0, Cell_size: 4.0, Position: 24.5, 7.2
// Cell = (24.5 / 4.0, 7.2 / 4.0) -> (6, 1)
fn GetCell2D(position: vec2<f32>, cell_size: f32) -> vec2<i32> {
  return vec2<i32>(position.x / cell_size, position.y / cell_size);
}

// least numerically insane way to assign each cell a unique number
// Dimensions needs to be greater than the max value of cell.x or cell.y
// Avoid this collision scenario (2, 1) -> 12 (12, 0) -> 12
fn SimpleHash2D(cell: vec2<i32>, bounds_min: i32) -> i32 {
  // Adjust only if there are negative cell values
  let x = cell.x + abs(min(bounds_min, 0));
  let y = cell.y + abs(min(bounds_min, 0));
  cell.x + cell.y * grid_dim;
}

// Hash cell coordinate to a single unsigned integer
fn HashCell2D(cell: vec2<i32>) -> u32 {
  let a : u32 = u32(cell.x) * hashK1;
  let b : u32 = u32(cell.y) * hashK2;
  return a + b;
}

// Compute the key from the hash and table size
fn KeyFromHash(hash: u32, tableSize: u32) -> u32 {
  return hash % tableSize;
}
