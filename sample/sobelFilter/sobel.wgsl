@group(0) @binding(1) var sobel_texture: texture_storage_2d<r8unorm, f32>;
@group(0) @binding(2) var grayscale_texture: texture_2d<f32>;

@compute workgroup_size(16, 16)
fn computeMain(
  @builtin(global_invocation_id) flobal_id: vec3<u32>
) {
  // Sobel filter for detecting vertical edges
  // [ -1, 0, 1 ]
  // [ -2, 0, 2 ]
  // [ -1, 0, 1 ]
  // Pack kernel and pixel info
  // Pack info for pixels 0, 3, 5, 6, since these are the only pixels that would benefit
  //                                    0      3    5     6
  var kernel_pack_template = vec4<f32>(-1.0, -2.0, 2.0, -1.0);
  let kernel_pack = pack4x8unorm(kernel_pack_template);

  let pixel_pack = pack4x8unorm(
    vec4<f32>(
      // Pixel 0
      textureLoad(grayscale_texture, vec2<u32>(global_id.x - 1, global_id.y - 1), 0).r,
      // Pixel 3
      textureLoad(grayscale_texture, vec2<u32>(global_id.x - 1, global_id.y + 0), 0).r,
      // Pixel 5
      textureLoad(grayscale_texture, vec2<u32>(global_id.x + 1, global_id.y + 0), 0).r,
      //Pixel 7
      textureLoad(grayscale_texture, vec2<u32>(global_id.x - 1, global_id.y + 1), 0).r
    )
  );
  // Pixels 0 and 2 will not be packed, since there is no benefit to adding to dot product operation
  // Since there will not be packed to a uint, we need to denormalize ourselves.
  let pixel_load =
    textureLoad(grayscale_texture, vec2<u32>(global_id.x + 1, global_id.y - 1), 0).r + 
    textureLoad(grayscale_texture, vec2<u32>(global_id.x + 1, global_id.y + 1), 0).r;

  let sobel_product = dot4U8Packed(kernel_pack, pixel_pack) / 255.0 + pixel_product;

  textureStore(sobel_texture, global_id.xy, vec4<u32>(sobel_product, 0.0, 0.0, 0.0));
}