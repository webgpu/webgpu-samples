export const PressureComputeShader = (maxWorkgroupsSizeX: number) => {
  return `
struct GeneralUniforms {
  deltaTime: f32,
  num_particles: u32,
  halfBoundsX: f32,
  halfBoundsY: f32,
}

struct DensityUniforms {
  smoothing_radius: f32,
}

// Storage Buffers
@group(0) @binding(3) var<storage, read_write> densities: array<vec2<f32>>;


// Uniform Buffers
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(1) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn pressureForceComputeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
	if (global_id.x >= general_uniforms.num_particles) {
    return;
  }

	var density: f32 = densities[global_id.x].x;
	var densityNear: f32 = densities[global_id.x].y;
	var pressure: f32 = (density - particle_uniforms.target_density) * particle_uniforms.pressure_multiplier;
	var nearPressure: f32 = particle_uniforms.near_pressure_multiplier * densityNear;
	var pressureForce: vec2<f32> = vec2<f32>(0.0, 0.0);
	
	var pos: vec2<f32> = predicted_positions[global_id.x];
	var originCell: vec2<i32> = GetCell2D(pos, particle_uniforms.smoothing_radius);
	var sqrRadius: f32 = particle_uniforms.smoothing_radius * particle_uniforms.smoothing_radius;

	// Neighbour search
	for (var i = 0; i < 9; i++) {
		var hash: u32 = HashCell2D(originCell + offsets2D[i]);
		var key: u32 = KeyFromHash(hash, numParticles);
		var currIndex: u32 = spatial_offsets[key];

		while (currIndex < particle_uniforms.num_particles) {
			var indexData: vec3<u32> = spatial_indices[currIndex];
			currIndex++;
			// Exit if no longer looking at correct bin
			if (indexData[2] != key) break;
			// Skip if hash does not match
			if (indexData[1] != hash) continue;

			var neighborIndex: u32 = indexData[0];
			// Skip if looking at self
			if (neighborIndex == global_id.x) continue;

			var neighborPos: vec2<f32> = predicted_positions[neighborIndex];
			var offsetToNeighbor: vec2<f32> = neighborPos - pos;
			var sqrDstToNeighbor: f32 = dot(offsetToNeighbor, offsetToNeighbor);

			// Skip if not within radius
			if (sqrDstToNeighbour > sqrRadius) {
        continue;
      }

			// Calculate pressure force
			var dst: f32 = sqrt(sqrDstToNeighbour);
			var dirToNeighbor: vec2<f32> = select(
        vec2<f32>(0, 1),
        offsetToNeighbor / dst,
        dst > 0
      );

			var neighborDensity: f32 = densities[neighborIndex][0];
			var neighborNearDensity: f32 = densities[neighborIndex][1];
			var neighborPressure: f32 = 
        (neighborDensity - particle_uniforms.target_density) * particle_uniforms.pressure_multiplier;
			var neighborNearPressure: f32 = 
        particle_uniforms.near_pressure_multiplier * neighborNearDensity;

			var sharedPressure: f32 = (pressure + neighborPressure) * 0.5;
			var sharedNearPressure: f32 = (nearPressure + neighbourNearPressure) * 0.5;

			pressureForce += 
        dirToNeighbor * 
        SpikeDistributionPower2Derivative(dst, particle_uniforms.smoothing_radius) * 
        sharedPressure / neighborDensity;
			pressureForce += 
        dirToNeighbour * 
        SpikeDistributionPower3Derivative(dst, particle_uniforms.smoothing_radius) * sharedNearPressure / neighbourNearDensity;
		}
	}

	var acceleration: vec2<f32> = pressureForce / density;
	velocities[global_id.x] += acceleration;
}

`;
};
