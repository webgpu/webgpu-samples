// Storage Buffersd
@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> current_forces: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> densities: array<f32>;
@group(0) @binding(4) var<storage, read_write> pressures: array<f32>;

// Uniforms Buffer
@group(1) @binding(0) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(256, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  let velocity: vec2<f32> = velocities[global_id.x] + (current_forces[global_id.x] / PARTICLE_MASS);
  positions[global_id.x] += velocity;
  // Do bounds checks
  velocities[global_id.x] = velocity;
}