export const PositionsComputeShader = (workgroupSize: number) => {
  return `
// Storage Buffers
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;

// Uniform Buffers
@group(1) @binding(0) var<uniform> general_uniforms: GeneralUniforms;
@group(1) @binding(1) var<uniform> particle_uniforms: ParticleUniforms;

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  // Copy current position and velocity values from the positions and velocity
  let input_position = positions[global_id.x];
  let input_velocity = velocities[global_id.x];
  let dst_position = &positions[global_id.x];
  let dst_velocity = &velocities[global_id.x];
  (*dst_velocity) += vec2<f32>(0.0, 1.0) * particle_uniforms.gravity;
  (*dst_position) += (*dst_velocity);
  if (
    abs((*dst_position).x) > general_uniforms.halfBoundsX
  ) {
    (*dst_position).x = general_uniforms.halfBoundsX * sign((*dst_position).x);
    (*dst_velocity).x *= -1 * particle_uniforms.damping;
  }
  if (
    abs( (*dst_position).y ) > general_uniforms.halfBoundsY
  ) {
    (*dst_position).y = general_uniforms.halfBoundsY * sign((*dst_position).y);
    (*dst_velocity).y *= -1 * particle_uniforms.damping;
  }
}
`;
};
