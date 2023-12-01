export const FluidComputeShader = (maxWorkgroupsSizeX: number) => {
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

// DENSITY COMPUTE SHADER
fn CalculateDensity(pos: vec2<f32>) -> vec2<f32> {
  var originCell: vec2<i32> = GetCell2D(pos, smoothingRadius)
  var squareRadius: f32 = uniforms.smoothingRadius * uniforms.smoothingRadius;
  var density: f32 = 0.0;
  var nearDensity: f32 = 0.0;

  for (var i = 0; i < 9; i++) {
    // Get the hash of current cell and surrounding cells
    var hash: u32 = HashCell2D(originCell + offsets2D[i]);
    var key: u32 = KeyFromHash(hash, numParticles);
    var currIndex = SpatialOffset[key];
    while (currIndex < numParticles) {
      var indexData = SpatialIndices[currIndex];
      currIndex++;
      if (indexData[2] != key) break;
      if (indexData[1] != hash) continue;

      var neighborIndex: u32 = indexData[0];
      var neighborPos: vec2<f32> = predicted_positions[neighborIndex];
      var offsetToNeighbor: vec2<f32> = neighborPos - pos;
      var sqrDstToNeighbor: f32 = dot(offsetToNeighbor, offsetToNeighbor);

      if (sqrDstToNeighbor > sqrRadius) continue;

      var dst: f32 = sqrt(sqrDstToNeighbor);
      density += SpikyDistributionPowerTwo(dst, smoothingRadius);
      nearDensity += SpikyDistributionPowerThree(dst, smoothingRadius);
    }
  }
  return vec2<f32>(density, nearDensity);
}

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn densityComputeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > numParticles) {
    return;
  }
  var pos: vec2<f32> = predicted_particles[global_id.x];
  densities[global_id.x] = CalculateDensity(pos);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// SPATIAL HASH COMPUTE SHADER
@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn spatialHashComputeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > general_uniforms.num_particles) {
    return;
  }
  // What is point of this?
  spatial_offsets[global_id.x] = general_uniforms.num_particles;
  // Update index buffer
  var index: u32 = global_id.x;
  // Compute Hash + Key
  var cell: vec2<i32> = GetCell2D(predicted_positions[index]);
  var hash: u32 = HashCell2D(cell);
  var key: u32 = KeyFromHash(hash, general_uniforms.num_particles);
  spatial_indices[global_id.x] = vec3<u32>(index, hash, key);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// PRESSURE FORCE COMPUTE SHADER
@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn spatialHashComputeMain( 
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// VISCOSITY COMPUTE SHADER
@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn viscositiesComputeMain( 
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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////

// POSITIONS COMPUTE SHADER

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn positionsComputeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let num_particles = arrayLength(&input_particles);
  let src_particle = input_particles[global_id.x];
  let dst_particle = &output_particles[global_id.x];
  (*dst_particle) = src_particle;
  (*dst_particle).velocity += vec2<f32>(0.0, 1.0) * particle_uniforms.gravity;
  (*dst_particle).position += (*dst_particle).velocity;
  if (
    abs((*dst_particle).position.x) > general_uniforms.halfBoundsX
  ) {
    (*dst_particle).position.x = general_uniforms.halfBoundsX * sign((*dst_particle).position.x);
    (*dst_particle).velocity.x *= -1 * particle_uniforms.damping;
  }
  if (
    abs( (*dst_particle).position.y ) > general_uniforms.halfBoundsY
  ) {
    (*dst_particle).position.y = general_uniforms.halfBoundsY * sign((*dst_particle).position.y);
    (*dst_particle).velocity.y *= -1 * particle_uniforms.damping;
  }
}
`;
};