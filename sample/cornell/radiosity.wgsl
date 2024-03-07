// A storage buffer holding an array of atomic<u32>.
// The array elements are a sequence of red, green, blue components, for each
// lightmap texel, for each quad surface.
@group(1) @binding(0)
var<storage, read_write> accumulation : array<atomic<u32>>;

// The output lightmap texture.
@group(1) @binding(1)
var lightmap : texture_storage_2d_array<rgba16float, write>;

// Uniform data used by the accumulation_to_lightmap entry point
struct Uniforms {
  // Scalar for converting accumulation values to output lightmap values
  accumulation_to_lightmap_scale : f32,
  // Accumulation buffer rescaling value
  accumulation_buffer_scale : f32,
  // The width of the light
  light_width : f32,
  // The height of the light
  light_height : f32,
  // The center of the light
  light_center : vec3f,
}

// accumulation_to_lightmap uniforms binding point
@group(1) @binding(2) var<uniform> uniforms : Uniforms;

// Number of photons emitted per workgroup
override PhotonsPerWorkgroup : u32;

// Maximum value that can be added to the accumulation buffer from a single photon
override PhotonEnergy : f32;

// Number of bounces of each photon
const PhotonBounces = 4;

// Amount of light absorbed with each photon bounce (0: 0%, 1: 100%)
const LightAbsorbtion = 0.5;

// Radiosity compute shader.
// Each invocation creates a photon from the light source, and accumulates
// bounce lighting into the 'accumulation' buffer.
@compute @workgroup_size(PhotonsPerWorkgroup)
fn radiosity(@builtin(global_invocation_id) invocation_id : vec3u) {
  init_rand(invocation_id);
  photon();
}

// Spawns a photon at the light source, performs ray tracing in the scene,
// accumulating light values into 'accumulation' for each quad surface hit.
fn photon() {
  // Create a random ray from the light.
  var ray = new_light_ray();
  // Give the photon an initial energy value.
  var color = PhotonEnergy * vec3f(1, 0.8, 0.6);

  // Start bouncing.
  for (var i = 0; i < (PhotonBounces+1); i++) {
    // Find the closest hit of the ray with the scene's quads.
    let hit = raytrace(ray);
    let quad = quads[hit.quad];

    // Bounce the ray.
    ray.start = hit.pos + quad.plane.xyz * 1e-5;
    ray.dir = normalize(reflect(ray.dir, quad.plane.xyz) + rand_unit_sphere() * 0.75);

    // Photon color is multiplied by the quad's color.
    color *= quad.color;

    // Accumulate the aborbed light into the 'accumulation' buffer.
    accumulate(hit.uv, hit.quad, color * LightAbsorbtion);

    // What wasn't absorbed is reflected.
    color *= 1 - LightAbsorbtion;
  }
}

// Performs an atomicAdd() with 'color' into the 'accumulation' buffer at 'uv'
// and 'quad'.
fn accumulate(uv : vec2f, quad : u32, color : vec3f) {
  let dims = textureDimensions(lightmap);
  let base_idx = accumulation_base_index(vec2u(uv * vec2f(dims)), quad);
  atomicAdd(&accumulation[base_idx + 0], u32(color.r + 0.5));
  atomicAdd(&accumulation[base_idx + 1], u32(color.g + 0.5));
  atomicAdd(&accumulation[base_idx + 2], u32(color.b + 0.5));
}

// Returns the base element index for the texel at 'coord' for 'quad'
fn accumulation_base_index(coord : vec2u, quad : u32) -> u32 {
  let dims = textureDimensions(lightmap);
  let c = min(vec2u(dims) - 1, coord);
  return 3 * (c.x + dims.x * c.y + dims.x * dims.y * quad);
}

// Returns a new Ray at a random point on the light, in a random downwards
// direction.
fn new_light_ray() -> Ray {
  let center = uniforms.light_center;
  let pos = center + vec3f(uniforms.light_width * (rand() - 0.5),
                           0,
                           uniforms.light_height * (rand() - 0.5));
  var dir = rand_cosine_weighted_hemisphere().xzy;
  dir.y = -dir.y;
  return Ray(pos, dir);
}

override AccumulationToLightmapWorkgroupSizeX : u32;
override AccumulationToLightmapWorkgroupSizeY : u32;

// Compute shader used to copy the atomic<u32> data in 'accumulation' to
// 'lightmap'. 'accumulation' might also be scaled to reduce integer overflow.
@compute @workgroup_size(AccumulationToLightmapWorkgroupSizeX, AccumulationToLightmapWorkgroupSizeY)
fn accumulation_to_lightmap(@builtin(global_invocation_id) invocation_id : vec3u,
                            @builtin(workgroup_id)         workgroup_id  : vec3u) {
  let dims = textureDimensions(lightmap);
  let quad = workgroup_id.z; // The workgroup 'z' value holds the quad index.
  let coord = invocation_id.xy;
  if (all(coord < dims)) {
    // Load the color value out of 'accumulation'
    let base_idx = accumulation_base_index(coord, quad);
    let color = vec3(f32(atomicLoad(&accumulation[base_idx + 0])),
                     f32(atomicLoad(&accumulation[base_idx + 1])),
                     f32(atomicLoad(&accumulation[base_idx + 2])));

    // Multiply the color by 'uniforms.accumulation_to_lightmap_scale' and write it to
    // the lightmap.
    textureStore(lightmap, coord, quad, vec4(color * uniforms.accumulation_to_lightmap_scale, 1));

    // If the 'accumulation' buffer is nearing saturation, then
    // 'uniforms.accumulation_buffer_scale' will be less than 1, scaling the values
    // to something less likely to overflow the u32.
    if (uniforms.accumulation_buffer_scale != 1.0) {
      let scaled = color * uniforms.accumulation_buffer_scale + 0.5;
      atomicStore(&accumulation[base_idx + 0], u32(scaled.r));
      atomicStore(&accumulation[base_idx + 1], u32(scaled.g));
      atomicStore(&accumulation[base_idx + 2], u32(scaled.b));
    }
  }
}
