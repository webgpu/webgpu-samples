export const ViscosityComputeShader = (maxWorkgroupsSizeX: number) => {
  return `

struct GeneralUniforms {
  deltaTime: f32,
  num_particles: u32,
  halfBoundsX: f32,
  halfBoundsY: f32,
}

struct ParticleUniforms {
  damping: f32,
  gravity: f32,
  particle_radius: f32,
  smoothing_radius: f32,
  target_density: f32,
  pressure_multiplier: f32,
  near_pressure_multiplier: f32,
}

// Storage Buffers
@group(0) @binding(0) var<storage, read_write> input_positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> predicted_positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> spatial_indices: array<vec3<u32>>;
@group(0) @binding(5) var<storage, read_write> spatial_offsets: array<u32>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(1) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x >= particle_uniforms.num_particles) {
    return;
  }
	
	var pos: vec2<f32> = predicted_positions[global_id.x];
  var originCell: vec2<i32> = GetCell2D(pos, particle_uniforms.smoothing_radius);
  var sqrRadius: f32 = particle_uniforms.smoothing_radius * particle_uniforms.smoothing_radius;

  var viscosityForce: vec2<f32> = 0.0;
  var velocity: vec2<f32> = velocities[global_id.x];

  for (var i: u32 = 0; i < 9; i++) {
    var hash: u32 = HashCell2D(originCell + offsets2D[i]);
    var key: u32 = KeyFromHash(hash, numParticles);
    var currIndex: u32 = SpatialOffsets[key];
    while (currIndex < particle_uniforms.num_particles) {
      var indexData: vec3<u32> = spatial_indices[currIndex];
      currIndex++;
      // Exit if no longer looking at correct bin
      if (indexData[2] != key) {
        break;
      }
      // Skip if hash does not match
      if (indexData[1] != hash) {
        continue;
      }
      var neighborIndex: u32 = indexData[0];
      // Skip if looking at self
      if (neighborIndex == global_id.x) {
        continue;
      }
      var neighbourPos: vec2<f32> = predicted_positions[neighborIndex];
      var offsetToNeighbor: vec2<f32> = neighbourPos - pos;
      var sqrDstToNeighbour: f32 = dot(offsetToNeighbor, offsetToNeighbor);
      // Skip if not within radius
      if (sqrDstToNeighbour > sqrRadius) {
        continue;
      }
      var dst: f32 = sqrt(sqrDstToNeighbour);
      var neighborVelocity: vec2<f32> = velocities[neighborIndex];
      viscosityForce += 
        (neighborVelocity - velocity) * 
        SmoothDistribution(dst, particle_uniforms.smoothing_radius);
    }
  }

  velocities[global_id.x] += viscosityForce * viscosityStrength;
}

`;
};
