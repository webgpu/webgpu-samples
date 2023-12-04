export const GasDensityComputeMain = (workgroupSize: number) => {
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

fn SmoothingKernel(dst: f32, radius: f32) -> f32 {
  var powRadius = pow(radius, 8) / 4;
  var value: f32 = max(0, radius * radius - dst * dst);
  return value * value * value / volume;
}

fn SmoothingKernelDerivative(dst: f32, radius: f32) -> f32 {
  if (dst >= radius) {
    return 0.0;
  }
  var f: f32 = radius * radius - dst * dst;
  var scale = -24 / 3.1415 * pow(radius, 8);
  return scale * dst * f * f;
}

// DENSITY COMPUTE SHADER
fn CalculateDensity(pos: vec2<f32>) -> vec2<f32> {
  var originCell: vec2<i32> = GetCell2D(pos, smoothingRadius)
  var squareRadius: f32 = uniforms.smoothingRadius * uniforms.smoothingRadius;
  var density: f32 = 0.0;
  var nearDensity: f32 = 0.0;

  for (var i = 0; i < 9; i++) {
    // Get the hash of current cell and surrounding cells
    var hash: u32 = HashCell2D(originCell + offsets2D[i]);
    var key: u32 = KeyFromHash(hash, numParticles);
    var currIndex = SpatialOffset[key];
    while (currIndex < numParticles) {
      var indexData = SpatialIndices[currIndex];
      currIndex++;
      if (indexData[2] != key) break;
      if (indexData[1] != hash) continue;

      var neighborIndex: u32 = indexData[0];
      var neighborPos: vec2<f32> = predicted_positions[neighborIndex];
      var offsetToNeighbor: vec2<f32> = neighborPos - pos;
      var sqrDstToNeighbor: f32 = dot(offsetToNeighbor, offsetToNeighbor);

      if (sqrDstToNeighbor > sqrRadius) continue;

      var dst: f32 = sqrt(sqrDstToNeighbor);
      density += SpikyDistributionPowerTwo(dst, smoothingRadius);
      nearDensity += SpikyDistributionPowerThree(dst, smoothingRadius);
    }
  }
  return vec2<f32>(density, nearDensity);
}

@compute @workgroup_size(${workgroupSize}, 1, 1)
fn computeMain( 
  @builtin(global_invocation_id) global_id: vec3<u32>,
) {
  if (global_id.x > numParticles) {
    return;
  }
  densities[global_id.x] = CalculateDensity(pos);
}
`;
};
