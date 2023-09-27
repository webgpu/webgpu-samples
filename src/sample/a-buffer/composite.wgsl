struct Uniforms {
  modelViewProjectionMatrix: mat4x4<f32>,
  maxStorableFragments: u32,
  targetWidth: u32,
};

struct SliceInfo {
  sliceStartY: i32
};

struct Heads {
  numFragments: u32,
  data: array<u32>
};

struct LinkedListElement {
  color: vec4<f32>,
  depth: f32,
  next: u32
};

struct LinkedList {
  data: array<LinkedListElement>
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;
@binding(1) @group(0) var<storage, read_write> heads: Heads;
@binding(2) @group(0) var<storage, read_write> linkedList: LinkedList;
@binding(3) @group(0) var<uniform> sliceInfo: SliceInfo;

// Output a full screen quad
@vertex
fn main_vs(@builtin(vertex_index) vertIndex: u32) -> @builtin(position) vec4<f32> {
  const position = array<vec2<f32>, 6>(
    vec2(-1.0, -1.0),
    vec2(1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, -1.0),
    vec2(1.0, 1.0),
    vec2(-1.0, 1.0),
  );
  
  return vec4(position[vertIndex], 0.0, 1.0);
}

@fragment
fn main_fs(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  let fragCoords = vec2<i32>(position.xy);
  let headsIndex = u32(fragCoords.y - sliceInfo.sliceStartY) * uniforms.targetWidth + u32(fragCoords.x);

  // The maximum layers we can process for any pixel
  const maxLayers = 24u;

  var layers: array<LinkedListElement, maxLayers>;

  var numLayers = 0u;
  var elementIndex = heads.data[headsIndex];

  // copy the list elements into an array up to the maximum amount of layers
  while elementIndex != 0xFFFFFFFFu && numLayers < maxLayers {
    layers[numLayers] = linkedList.data[elementIndex];
    numLayers++;
    elementIndex = linkedList.data[elementIndex].next;
  }

  if numLayers == 0u {
    discard;
  }
  
  // sort the fragments by depth
  for (var i = 1u; i < numLayers; i++) {
    let toInsert = layers[i];
    var j = i;

    while j > 0u && toInsert.depth > layers[j - 1u].depth {
      layers[j] = layers[j - 1u];
      j--;
    }

    layers[j] = toInsert;
  }

  // pre-multiply alpha for the first layer
  var color = vec4(layers[0].color.a * layers[0].color.rgb, layers[0].color.a);

  // blend the remaining layers
  for (var i = 1u; i < numLayers; i++) {
    let mixed = mix(color.rgb, layers[i].color.rgb, layers[i].color.aaa);
    color = vec4(mixed, color.a);
  }

  return color;
}