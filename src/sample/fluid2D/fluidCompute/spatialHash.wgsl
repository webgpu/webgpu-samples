// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
// Uniforms Buffers
@group(1) @binding(0) var<uniform> uniforms: Uniforms;
// Sort Buffers
@group(2) @binding(0) var<storage, read_write> spatial_indices: array<SpatialEntry>;

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
	// Update index buffer
	var index: u32 = global_id.x;
	var cell: vec2<i32> = GetCell2D(positions[global_id.x], uniforms.cell_size);
  // Reminder: SimpleHash only works if dimensions are properly calculated
	var hash: u32 = SimpleHash2D(cell, );
	var key: u32 = KeyFromHash(hash, uniforms.num_particles);
  let spatial_entry = &spatial_indices[global_id.x];
  (*spatial_entry).index = index;
  (*spatial_entry).hash = hash;
}