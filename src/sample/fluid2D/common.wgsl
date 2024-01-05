// Hash Functions
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
const GRAVITY = vec2<f32>(0.0, -10.0);
const REST_DENSITY = 300.0;
const GAS_CONSTANT = 2000.0;
const SMOOTHING_RADIUS = 16.0;
const SMOOTHING_RADIUS_SQR = 256.0;
const MASS = 2.5;
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
// radius represents the smoothing radius of our particle, it sphere of influence so to speak
// position 256, 38 with smoothingRadius of 10 will return Cell Coordinate (25, 3);
fn GetCell2D(position: vec2<f32>, radius: f32) -> vec2<i32> {
  return vec2<i32>(floor(position / radius));
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

// 2002 Code has a particleCellIndices 

