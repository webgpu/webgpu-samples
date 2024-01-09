// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

fn HandleCollision(id: u32) {
  let dst_position = &positions[id];
  let dst_velocity = &velocities[id];
  let half_size = vec2<f32>(general_uniforms.bounds_x * 0.5, general_uniforms.bounds_y * 0.5);
  let edge_dst = half_size - abs((*dst_position));
  if (edge_dst.x <= 0) {
    (*dst_position).x = half_size.x * sign((*dst_position).x);
    (*dst_velocity).x *= -1 * particle_uniforms.damping;
  }
  if (edge_dst.y <= 0) {
    (*dst_position).y = half_size.y * sign((*dst_position).y);
    (*dst_velocity).y *= -1 * particle_uniforms.damping;
  }
}

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > general_uniforms.num_particles) {
    return;
  }
  let dst_position = &positions[global_id.x];
  (*dst_position) += velocities[global_id.x] * general_uniforms.delta_time;
  HandleCollision(global_id.x);
}
