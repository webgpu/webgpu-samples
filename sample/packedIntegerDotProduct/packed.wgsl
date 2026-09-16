requires packed_4x8_integer_dot_product;

struct Input { lhs: u32, rhs: u32 }

@group(0) @binding(0) var<storage, read> input: Input;
@group(0) @binding(1) var<storage, read_write> output: i32;

@compute @workgroup_size(1)
fn main() {
  output = dot4I8Packed(input.lhs, input.rhs);
}
