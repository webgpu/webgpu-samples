/* Replicates a Gaussian distribution */
/*
                     ______
                   /        \
                /             \
              /                 \                   
           /                     \                      
         /                         \                               
       /                            \                            
      /                              \                                       
     /                                \                                          
----/                                  \________ */

/* Spike Distribution */
/*
                /\       
               /  \        
              /    \       
             /      \      
            /        \     
           /          \    
          /            \   
         /              \  
        /                \ 
       /                  \
      /                    \
_____/                      \_____*/


const PI = 3.141592653589793;
const poly6_scale = 4 / (
  PI * pow(particle_uniforms.smoothing_radius, 8)
);
const spike_pow3_scale = 10 / (
  PI * pow(particle_uniforms.smoothing_radius, 5)
);
const spike_pow2_scale = 6 / (
  PI * pow(particle_uniforms.smoothing_radius, 4)
);
const spike_pow3_derivative_scale = 30 / (
  pow(particle_uniforms.smoothing_radius, 5) * PI
);
const spike_pow2_derivative_scale = 12 / (
  pow(particle_uniforms.smoothing_radius, 4) * PI
);




// Distribution Functions
fn SmoothDistributionPoly6(
  dist: f32, 
  radius: f32, 
) -> f32 {
  if (dist > radius) {
    return 0;
  }
  var v: f32 = radius * radius - dist * dist;
  return v * v * v * poly6_scale;
}

fn SpikeDistributionPower2(
  dist: f32, 
  radius: f32, 
  scale: f32
) -> f32 { 
  if (dist > radius) {
    return 0;
  }
  var v: f32 = radius - dist;
  return v * v * scale;
}

fn SpikeDistributionPower2Derivative(
  dist: f32,
  radius: f32,
  scale: f32
) -> f32 {
  if (dist >= radius) {
    return 0;
  }
  var v: f32 = radius - dist;
  return -v * scale;
}

fn SpikeDistributionPower3(
  dist: f32, 
  radius: f32, 
  scale: f32
) -> f32 {
  if (dist > radius) {
    return 0;
  }
  var v: f32 = radius - dist;
  return v * v * v * scale;
}

fn SpikeDistributionPower3Derivative(
  dist: f32,
  radius: f32,
  scale: f32
) -> f32 {
  if (dist >= radius) {
    return 0;
  }
  var v: f32 = radius - dist;
  return -v * v * scale;
}

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

struct ParticleUniforms {
  damping: f32,
  gravity: f32,
  smoothing_radius: f32,
  target_density: f32,
  pressure_multiplier: f32,
  near_pressure_multiplier: f32,
  viscosity_strength: f32,
}

struct SpatialEntry {
  index: u32,
  hash: u32,
  key: u32,
}

// Hash constants
const hashK1: u32 = 15823;
const hashK2: u32 = 9737333;

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

