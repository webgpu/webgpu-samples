// Spatial Sort Storage Buffers
@group(0) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;
@group(0) @binding(1) var<storage, read_write> spatial_offsets: array<u32>;

// Predicted Positions Storage Buffer
@group(1) @binding(2) var<storage, read_write> predicted_positions: array<vec2<f32>>;

// Uniforms Buffer
@group(2) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(2) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
	// Reset spatial offsets
	spatial_offsets[global_id.x] = 0;
	// Update index buffer
	var index: u32 = global_id.x;
	var cell: vec2<i32> = GetCell2D(predicted_positions[global_id.x], particle_uniforms.smoothing_radius);
	var hash: u32 = HashCell2D(cell);
	var key: u32 = KeyFromHash(hash, general_uniforms.num_particles);
  let spatial_entry = &spatial_indices[global_id.x];
	(*spatial_entry).index = global_id.x;
  (*spatial_entry).hash = hash;
  (*spatial_entry).key = key;
}