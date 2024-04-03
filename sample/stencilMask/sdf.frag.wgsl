fn sdfCircle(p: vec2<f32>, r: f32) -> f32 {
  return length(p)-r;
}

fn sdfTriangle(p_temp: vec2<f32>, r: f32) -> f32 {
  var p = p_temp;
  let k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r/k;
  if( p.x+k*p.y>0.0 ) { 
    p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
  }
  p.x -= clamp( p.x, -2.0*r, 0.0 );
  return -length(p)*sign(p.y);
}

struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) v_uv: vec2<f32>,
}

struct Uniforms {
  offset_x: f32,
  offset_y: f32,
  radius_scale: f32,
  sdf_id: u32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  var d = 0.0;
  switch uniforms.sdf_id {
    case 1: { // Local Flip
      d = sdfTriangle(input.v_uv, 1.0);
      break;
    } 
    default: { 
      d = sdfCircle(input.v_uv, 1.0);
    }
  }
  var blue = vec3<f32>(0.65, 0.85, 1.0);
  if (d > 0.0) {
    discard;
  }
  return vec4<f32>(blue, 1.0);
}