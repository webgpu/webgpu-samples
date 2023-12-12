// Storage Buffer
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> predicted_positions: array<vec2<f32>>;

// Uniforms Buffer
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(1) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;


fn ExternalForces(pos: vec2<f32>, velocity: vec2<f32>) -> vec2<f32> {
	// Currently bounds seem to work fine, but they are looping instead of bouncing
	var gravity: vec2<f32> = vec2<f32>(0.0, particle_uniforms.gravity);
	return gravity;
}

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
	if (global_id.x >= general_uniforms.num_particles) {
    return;
  }

	// External forces (gravity and input interaction)
	velocities[global_id.x] += ExternalForces(positions[global_id.x], velocities[global_id.x]);

	let prediction_factor: f32 = 3.0 / 120.0;
  //let predicted_position = &predicted_positions[global_id.x];
  predicted_positions[global_id.x] += positions[global_id.x] + velocities[global_id.x];
}