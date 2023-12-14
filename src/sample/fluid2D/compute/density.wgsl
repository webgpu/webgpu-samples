// Storage Buffers
@group(0) @binding(2) var<storage, read_write> predicted_positions: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<vec2<f32>>;

// Uniforms
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(1) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;
@group(1) @binding(2) var<uniform> distribution_uniforms: DistributionUniforms;

// Spatial Indices
@group(2) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(2) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

// DENSITY COMPUTE SHADER
fn CalculateDensity(pos: vec2<f32>) -> vec2<f32> {
  var origin_cell: vec2<i32> = GetCell2D(pos, particle_uniforms.smoothing_radius);
  var sqr_radius: f32 = particle_uniforms.smoothing_radius * particle_uniforms.smoothing_radius;
  var standard_density: f32 = 0.0;
  var near_density: f32 = 0.0;

  for (var i = 0; i < 9; i++) {
    // In each iteration, get the key and hash of either the current area or the 8 cardinal surrounding areas
    var hash: u32 = HashCell2D(origin_cell + CardinalOffsets[i]);
    var key: u32 = KeyFromHash(hash, general_uniforms.num_particles);
    // Access the offset into the bin that the neighbor particle exists in
    var bin_offset = spatial_offsets[key];
    // Go to every particle within the current bin/area
    while (bin_offset < general_uniforms.num_particles) {
      // Get the (index, hash, key) for the next particle in this bin
      var spatial_info: SpatialEntry = spatial_indices[bin_offset];
      // We increment through the current bin till we account for all the bin's elements and exit
      bin_offset++;
      // If the area of the current particle is not the current area we are evaluating, break the while loop 
      if (spatial_info.key != key) {
        break;
      }
      // TODO: Consider whether this is needed
      if (spatial_info.hash != hash) {
        continue;
      }

      // Get index of our neighboring particle
      var neighbor_index: u32 = spatial_info.index;
      // Get the position of the neighboring particle at 'neighbor_index'
      var neighbor_pos: vec2<f32> = predicted_positions[neighbor_index];
      // Calculate distance between neighbor particle and original particle
      var neighbor_offset: vec2<f32> = neighbor_pos - pos;
      var sqr_dst: f32 = dot(neighbor_offset, neighbor_offset);
      // Determine whether the neighbor particle is within the particle's region of influence, as specified by the smoothing radius
      // We compare against squared radius due to optimize against the cost of the sqrt call
      if (sqr_dst > sqr_radius) {
        continue;
      }

      var dst: f32 = sqrt(sqr_dst);
      // The density of a fluid within a given area is just the sum of its influences within that area
      standard_density += SpikeDistributionPower2(dst, particle_uniforms.smoothing_radius, distribution_uniforms.spike_pow2_scale);
      near_density += SpikeDistributionPower3(dst, particle_uniforms.smoothing_radius, distribution_uniforms.spike_pow3_scale);
    }
  }
  return vec2<f32>(standard_density, near_density);
}

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > general_uniforms.num_particles) {
    return;
  }
  let pos: vec2<f32> = predicted_positions[global_id.x];
  densities[global_id.x] = CalculateDensity(pos);
}