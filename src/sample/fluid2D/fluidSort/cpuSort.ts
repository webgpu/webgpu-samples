export const GetCell2DCPU = (
  pos_x: number,
  pos_y: number,
  cell_size: number
) => {
  return {
    x: Math.floor(pos_x / cell_size),
    y: Math.floor(pos_y / cell_size)
  }
}

export const SimpleHash2D = (
  cell: { x: number; y: number },
  cells_per_axis: number
) => {
  const x = cell.x + Math.abs(Math.min(-cells_per_axis * 0.5, 0));
  const y = cell.y + Math.abs(Math.min(-cells_per_axis * 0.5, 0)); 
  return x + y * cells_per_axis;
}