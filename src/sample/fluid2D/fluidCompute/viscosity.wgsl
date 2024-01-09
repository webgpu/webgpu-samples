// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
// Uniform Buffers
@group(1) @binding(0) var<uniform> uniforms: Uniforms;
// Sort Buffers
@group(2) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(2) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x >= uniforms.num_particles) {
    return;
  }
	
  // Get the predicted position of the current particle
	var pos: vec2<f32> = predicted_positions[global_id.x];
  var origin_cell: vec2<i32> = GetCell2D(pos, uniforms.cell_size);
  var sqr_radius: f32 = RADIUS * RADIUS;

  var viscosity_force = vec2<f32>(0.0, 0.0);
  let current_velocity: vec2<f32> = velocities[global_id.x];

  for (var i: u32 = 0; i < 9; i++) {
    // In each iteration, get the key and hash of either the current area or the 8 cardinal surrounding areas
    var hash: u32 = HashCell2D(origin_cell + CardinalOffsets[i]);
    var key: u32 = KeyFromHash(hash, uniforms.num_particles);
    // The offset into spatial_indices where the current bin starts
    var bin_offset: u32 = spatial_offsets[key];
    while (bin_offset < uniforms.num_particles) {
      // Get the (index, hash, key) for the next particle in this bin
      var spatial_info: SpatialEntry = spatial_indices[bin_offset];
      // We increment through the current bin till we account for all the bins elements and exit
      bin_offset++;
      // Exit the while loop if we have exited the bin specified by our intial bin_offset assignment
      if (spatial_info.key != key) {
        break;
      }
      // Skip if hash does not match
      if (spatial_info.hash != hash) {
        continue;
      }
      // Get index of our neighboring particle
      var neighbor_particle_index: u32 = spatial_info.index;
      // Skip when the neighboring particle is the current particle (when CardinalOffsets[i] = vec2<f32>(0.0, 0.0))
      if (neighbor_particle_index == global_id.x) {
        continue;
      }
      // Get the position of the neighboring particle at 'neighbor_particle_index'
      var neighbor_pos: vec2<f32> = predicted_positions[neighbor_particle_index];
      var neighbor_offset: vec2<f32> = neighbor_pos - pos;
      var sqr_dst: f32 = dot(neighbor_offset, neighbor_offset);
      // Skip if not within radius
      if (sqr_dst > sqr_radius) {
        continue;
      }
      var dst: f32 = sqrt(sqr_dst);
      var neighbor_velocity: vec2<f32> = velocities[neighbor_particle_index];
      viscosity_force += 
        (neighbor_velocity - current_velocity) * 
        SmoothDistributionPoly6(dst, particle_uniforms.smoothing_radius, distribution_uniforms.poly6_scale);
    }
  }

  let new_velocity = &velocities[global_id.x];
  let viscosity = viscosity_force * particle_uniforms.viscosity_strength * uniforms.delta_time;
  velocities[global_id.x] += viscosity;
}
