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

// Distribution Functions
fn SmoothDistribution(
  dist: f32, 
  radius: f32, 
  scale: f32
) -> f32 {
  if (dist > radius) {
    return 0;
  }
  var v: f32 = radius * radius - dist * dist;
  return v * v * v * scale;
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
const offsets2D: array<vec2<i32>, 9> = array<vec2<i32>, 9>(
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
  numParticles: u32,
  deltaTime: f32,
  halfBoundsX: f32,
  halfBoundsY: f32,
}

struct ParticleUniforms {
  damping: f32,
  gravity: f32,
  smoothingRadius: f32,
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

