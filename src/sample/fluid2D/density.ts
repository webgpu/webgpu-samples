export const DensityComputeShader = (maxWorkgroupsSizeX: number) => {
  return `
struct Density {
  densities: vec2<f32>
}

struct Predicted {
  positions: vec2<f32>
}

struct Uniforms {
  numParticles: f32,
  smoothingRadius: f32,
}


// Storage Buffers
@group(0) @binding(0) var<storage, read_write> predicted_positions: array<Density>;
@group(0) @binding(1) var<storage, read> predicted_particles: array<Predicted>;

@group(1) @binding(0) var<uniform> numParticles: u32;

@compute @workgroup_size(${maxWorkgroupsSizeX}, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > numParticles) {
    return;
  }
  var pos: vec2<f32> = predicted_particles[global_id.x];

  var originCell: vec2<i32> = GetCell2D(pos, smoothingRadius)

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
}`;
};