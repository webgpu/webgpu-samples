// Storage Buffersd
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> current_forces: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<f32>;
@group(0) @binding(4) var<storage, read_write> pressures: array<f32>;

// Uniforms Buffer
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

fn HandleCollision(id: u32) {
  let dst_position = &positions[id];
  let dst_velocity = &velocities[id];
  let half_size = vec2<f32>(uniforms.bounds_size * 0.5, uniforms.bounds_size * 0.5);
  let edge_dst = half_size - abs((*dst_position));
  if (edge_dst.x <= 0) {
    (*dst_position).x = half_size.x * sign((*dst_position).x);
    (*dst_velocity).x *= -1 * 0.5;
  }
  if (edge_dst.y <= 0) {
    (*dst_position).y = half_size.y * sign((*dst_position).y);
    (*dst_velocity).y *= -1 * 0.5;
  }
}

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let new_velocity = velocities[global_id.x] + uniforms.delta_time * current_forces[global_id.x] / MASS;
  velocities[global_id.x] = new_velocity;
  positions[global_id.x] += uniforms.delta_time * new_velocity;
  HandleCollision(global_id.x);
}

/*
// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

fn HandleCollision(id: u32) {
  let dst_position = &positions[id];
  let dst_velocity = &velocities[id];
  let half_size = vec2<f32>(uniforms.bounds_x * 0.5, uniforms.bounds_y * 0.5);
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
  if (global_id.x > uniforms.num_particles) {
    return;
  }
  let dst_position = &positions[global_id.x];
  (*dst_position) += velocities[global_id.x] * uniforms.delta_time;
  HandleCollision(global_id.x);
}
*/