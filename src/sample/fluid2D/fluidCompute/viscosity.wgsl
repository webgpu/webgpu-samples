// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> current_forces: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<f32>;
@group(0) @binding(4) var<storage, read_write> pressures: array<f32>;

// Uniforms
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

// Spatial Indices
@group(2) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(2) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

//VISCOSITY COMPUTE SHADER
@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > uniforms.num_particles) {
    return;
  }
  let pos: vec2<f32> = positions[global_id.x];
  // Calculate the cell of the hash grid where the currently positioned particle is located
  let origin_cell: vec2<i32> = GetCell2D(pos, uniforms.cell_size);
  let current_density_2 = densities[global_id.x] * densities[global_id.x];
  let force = &current_forces[global_id.x];
  var standard_density: f32 = 0.0;

  // For each neighboring cell in all eight cardinal directions
  for (var i = 0; i < 9; i++) {
    // In each iteration, get the cell hash of the surrounding cells
    var hash: u32 = SimpleHash2D(origin_cell + CardinalOffsets[i], uniforms.cells_per_axis);
    // Access the offset into our spatial_indices array that starts the area where we represent particles in the neighboring cell
    var bin_offset = spatial_offsets[hash];
    // Access every individual particle within the neighboring cell to account for its accumulated density
    // If too many particles are being considered within a single cell, it may be prudent to adjust the cell size
    while (bin_offset < uniforms.num_particles) {
      // Get the (index, hash, key) for the next particle in this bin
      var spatial_info: SpatialEntry = spatial_indices[bin_offset];
      // We increment through the current bin till we account for all the bin's elements and exit
      bin_offset++;
      // If we exit into a new cell, exit the loop
      if (spatial_info.hash != hash) {
        break;
      }
      // Don't consider the current particle as a neighboring particle!
      if (spatial_info.index == global_id.x) {
        continue;
      }
      // Get index of our neighboring particle
      var neighbor_index: u32 = spatial_info.index;
      // Get the position of the neighboring particle at 'neighbor_index'
      var neighbor_pos: vec2<f32> = positions[neighbor_index];
      // Calculate distance between neighbor particle and original particle
      var dst_to_neighbor: vec2<f32> = neighbor_pos - pos;
      // Calculate square magnitude of dst_to_neighbor vector
      var sqr_dst: f32 = dot(dst_to_neighbor, dst_to_neighbor);
      // Determine whether the neighbor particle is within the particle's region of influence, as specified by the smoothing radius
      // We compare against squared radius due to optimize against the cost of the sqrt call
      if (sqr_dst > RADIUS2) {
        continue;
      }
      // If we are within smoothing radius, then perform square root call to get dst_to_neighbor magnitude
      var dst: f32 = sqrt(sqr_dst);
      // Calculate direction/unit vector of dst_to_neighbor
      var dir: vec2<f32> = dst_to_neighbor / dst;

      // Pressure graident (Doyub Kim pg. 136)
      
      let neighbor_density_2 = densities[neighbor_index] * densities[neighbor_index];

      // Calculate the pressure gradient force
      // (cite github.com/Gornhoth/Unity-Smoothed-Particle, cited from Kim Doyub)
      (*force) -= MASS2 * (
        pressures[global_id.x] / current_density_2 + pressures[neighbor_index] / neighbor_density_2
      ) * SpikyKernelGradient(dst, dir);

      (*force) += VISCOSITY_COEFFICIENT * MASS2 * (
        velocities[neighbor_index] - velocities[global_id.x]
      ) / densities[neighbor_index] * SpikyKernelSecondDerivative(dst);
    }
  }
  (*force) += GRAVITY;
}