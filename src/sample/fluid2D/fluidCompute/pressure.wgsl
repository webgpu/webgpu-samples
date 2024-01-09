
// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

// Spatial Info Buffers
@group(2) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(2) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

fn PressureFromDensity(density: f32) -> f32 {
  return (density - particle_uniforms.target_density) * particle_uniforms.standard_pressure_multiplier;
}

fn NearPressureFromDensity(density: f32) -> f32 {
  return density * particle_uniforms.near_pressure_multiplier;
}

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  // TODO: Might not need this if our particles will always be 256 alligned...
	if (global_id.x >= uniforms.num_particles) {
    return;
  }

	var standard_density: f32 = densities[global_id.x].x;
  if (standard_density == 0) {
    return;
  }
	var near_density: f32 = densities[global_id.x].y;
  if (near_density == 0) { 
    return;
  }
  // Initial pressure calculated by getting the scaled difference between our density and the target density
	var standard_pressure: f32 = PressureFromDensity(standard_density);
	var near_pressure: f32 = NearPressureFromDensity(near_density);
	var pressure_force: vec2<f32> = vec2<f32>(0.0, 0.0);
	
	var pos: vec2<f32> = predicted_positions[global_id.x];
	var origin_cell: vec2<i32> = GetCell2D(pos, uniforms.cell_size);
	var sqr_radius: f32 = RADIUS * RADIUS;

	for (var i = 0; i < 9; i++) {
    // In each iteration, get the key and hash of either the current area or the 8 cardinal surrounding areas
		var hash: u32 = HashCell2D(origin_cell + CardinalOffsets[i]);
    // Access the offset into the bin that the neighbor particle exists in
		var bin_offset: u32 = spatial_offsets[hash];

    // Go to every particle within the current bin/area
		while (bin_offset < uniforms.num_particles) {
      // Get the (index, hash, key) for the next particle in this bin
			var spatial_info: SpatialEntry = spatial_indices[bin_offset];
      // We increment through the current bin till we account for all the bin's elements and exit
			bin_offset++;
			// Skip if hash does not match
			if (spatial_info.hash != hash) {
        break;
      }

      // Get index of our neighboring particle
			var neighbor_index: u32 = spatial_info.index;
			// Skip when the neighboring particle is the current particle (when CardinalOffsets[i] = vec2<f32>(0.0, 0.0))
			if (neighbor_index == global_id.x) {
        continue;
      }

      // Get the position of the neighboring particle at 'neighbor_particle_index'
			var neighbor_pos: vec2<f32> = positions[neighbor_index];
      // Calculate distance between neighbor particle and original particle
			var neighbor_offset: vec2<f32> = neighbor_pos - pos;
			var sqr_dst: f32 = dot(neighbor_offset, neighbor_offset);
      // Determine whether the neighbor particle is within the particle's region of influence, as specified by the smoothing radius
      // We compare against squared radius due to optimize against the cost of the sqrt call
			if (sqr_dst > sqr_radius) {
        continue;
      }

			// Calculate pressure force
			var dst: f32 = sqrt(sqr_dst);
			var dirToNeighbor: vec2<f32> = select(
        vec2<f32>(0, 1),
        neighbor_offset / dst,
        dst > 0
      );

      // Access the density and pressure of the neighboring particle
			var neighbor_standard_density: f32 = densities[neighbor_index].x;
			var neighbor_near_density: f32 = densities[neighbor_index].y;
			var neighbor_standard_pressure: f32 = PressureFromDensity(neighbor_standard_density);
			var neighbor_near_pressure: f32 = NearPressureFromDensity(neighbor_near_density);
      //Calculate the average pressure between the two particles
			var average_standard_pressure: f32 = (standard_pressure + neighbor_standard_pressure) * 0.5;
			var average_near_pressure: f32 = (near_pressure + neighbor_near_pressure) * 0.5;

      // Property of the particle calculated as such
      // Sum of that property across a range of particles * mass (constant 1) / density * our distribution function
      // For optimization purposes, we perform all our multiplicative calculations in the loop, then apply our mass / density
      // Once we have performed all our sum and multiplication operations

      // density slopes, how fast is the density of our particle changing at this distance from the particle's center?
      let standard_density_slope = SpikeDistributionPower2Derivative(dst, particle_uniforms.smoothing_radius, distribution_uniforms.spike_pow2_derivative_scale);
      let near_density_slope = SpikeDistributionPower3Derivative(dst, particle_uniforms.smoothing_radius, distribution_uniforms.spike_pow3_derivative_scale);
			pressure_force += dirToNeighbor * standard_density_slope * average_standard_pressure / neighbor_standard_density;
			pressure_force += dirToNeighbor * near_density_slope * average_near_pressure / neighbor_near_density;
		}
	}

	let acceleration: vec2<f32> = pressure_force / standard_density;
  let velocity = &velocities[global_id.x];
  (*velocity) += acceleration * uniforms.delta_time;
}
