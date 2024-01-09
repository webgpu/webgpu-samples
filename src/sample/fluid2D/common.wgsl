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
}

struct SpatialEntry {
  // The global_id.x index of the particle
  index: u32,
  // The hash of the cell that contains the particle
  hash: u32,
}

// Solver Constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
const GRAVITY = vec2<f32>(0.0, -9.8);
const REST_DENSITY = 300.0;
const GAS_CONSTANT = 2000.0;
// For now, smoothing radius and visual radius should be the same to decrease confusion
const RADIUS = 1;
const RADIUS_SQR = 1;
const MASS = 2.5;
const MASS_SQR = 6.25;
const VISCOSITY = 200.0;
const DELTA_TIME = 0.0007;

// Kernel constants from https://lucasschuermann.com/writing/implementing-sph-in-2d
const POLY6 = 4.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 8.0));
const SPIKY_GRADIENT = -10.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 5.0));
const VISCOSITY_LAPACIAN = 40.0 / (3.141592653 * pow(SMOOTHING_RADIUS, 5.0));


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
fn SimpleHash2D(cell: vec2<i32>, grid_dim: i32) -> i32 {
  // Adjust only if there are negative cell values
  let x = cell.x + abs(min(-grid_dim * 0.5, 0));
  let y = cell.y + abs(min(-grid_dim * 0.5, 0));
  return x + y * grid_dim;
}

// Hash cell coordinate to a single unsigned integer
// Although this is technically a more robust hashing solution,
// For the sake of simplicity and clarity to the user, 
// we use a hash capped to the grid's dimensions to make the hash tables
// more readable
fn HashCell2D(cell: vec2<i32>) -> u32 {
  let a : u32 = u32(cell.x) * hashK1;
  let b : u32 = u32(cell.y) * hashK2;
  return a + b;
}

// Compute the key from the hash and table size
fn KeyFromHash(hash: u32, tableSize: u32) -> u32 {
  return hash % tableSize;
}
