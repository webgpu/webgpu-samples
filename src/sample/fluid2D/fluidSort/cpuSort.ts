const GetCell2DCPU = (pos_x: number, pos_y: number, cell_size: number) => {
  return = {
    x: Math.floor(pos_x / cell_size),
    y: Math.floor(pos_y / cell_size)
  }
}

const SimpleHash2D = (cell: {x: number, y: number}, cells_per_axis: number) => {
  const x = cell.x + Math.abs(Math.min(-cells_per_axis * 0.5, 0));
  const y = cell.y + Math.abs(Math.min(-cells_per_axis * 0.5, 0)); 
}


export calculateAndSortSpatialIndices = (
  cell_size: number,
  cells_per_axis: number,
  currentPositions: Float32Array,
  spatialIndices: number,
) => {
  for (let i = 0; i < currentPositions.length; i+= 2) {
    const cell = GetCell2DCPU(currentPositions[i * 2 + 0], currentPositions[i * 2 + 1], cell_size);

  }
  

  fn GetCell2D(position: vec2<f32>, cell_size: f32) -> vec2<i32> {
    return vec2<i32>(
      i32(floor(position.x / cell_size)), 
      i32(floor(position.y / cell_size))
    );
  }
  
  // least numerically insane way to assign each cell a unique number
  // Dimensions needs to be greater than the max value of cell.x or cell.y
  // Avoid this collision scenario (2, 1) -> 12 (12, 0) -> 12
  //
  fn SimpleHash2D(cell: vec2<i32>, cells_per_axis: f32) -> u32 {
    // Adjust only if there are negative cell values
    let x = cell.x + i32(abs(min(-cells_per_axis * 0.5, 0)));
    let y = cell.y + i32(abs(min(-cells_per_axis * 0.5, 0)));
    // Has to be a u32 since we will use it to index
    return u32(x + y * i32(cells_per_axis));
  }
  
}