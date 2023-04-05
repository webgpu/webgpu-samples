// The lightmap data
@group(1) @binding(0) var lightmap : texture_2d_array<f32>;

// The sampler used to sample the lightmap
@group(1) @binding(1) var smpl : sampler;

// The output framebuffer
@group(1) @binding(2) var framebuffer : texture_storage_2d<rgba16float, write>;

override WorkgroupSizeX : u32;
override WorkgroupSizeY : u32;

@compute @workgroup_size(WorkgroupSizeX, WorkgroupSizeY)
fn main(@builtin(global_invocation_id) invocation_id : vec3u) {
  // Calculate the fragment's NDC coordinates for the intersection of the near
  // clip plane and far clip plane
  let uv = vec2f(invocation_id.xy) / vec2f(textureDimensions(framebuffer).xy);
  let ndcXY = (uv - 0.5) * vec2(2, -2);

  // Transform the coordinates back into world space
  var near = common_uniforms.inv_mvp * vec4f(ndcXY, 0.0, 1);
  var far = common_uniforms.inv_mvp * vec4f(ndcXY, 1, 1);
  near /= near.w;
  far /= far.w;

  // Create a ray that starts at the near clip plane, heading in the fragment's
  // z-direction, and raytrace to find the nearest quad that the ray intersects.
  let ray = Ray(near.xyz, normalize(far.xyz - near.xyz));
  let hit = raytrace(ray);
  let quad = quads[hit.quad];

  // Sample the quad's lightmap, and add emissive.
  let color = textureSampleLevel(lightmap, smpl, hit.uv, hit.quad, 0).rgb +
              quad.emissive * quad.color;
  textureStore(framebuffer, invocation_id.xy, vec4(color, 1));
}
