/**
 * Makes a canvas with a border and centered text.
 */
export function makeCanvasImage({
  width,
  height,
  borderColor,
  backgroundColor,
  foregroundColor,
  font,
  text,
}: {
  width: number;
  height: number;
  borderColor: string;
  backgroundColor: string;
  foregroundColor: string;
  font?: string;
  text: string[];
}) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, width, height);
  const borderSize = 10;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(
    borderSize,
    borderSize,
    width - borderSize * 2,
    height - borderSize * 2
  );
  ctx.fillStyle = foregroundColor;
  ctx.font =
    font ?? `${Math.ceil(Math.min(width, height) * 0.8)}px bold monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const t of text) {
    const m = ctx.measureText(t);
    ctx.fillText(
      t,
      (width - m.actualBoundingBoxRight + m.actualBoundingBoxLeft) / 2,
      (height - m.actualBoundingBoxDescent + m.actualBoundingBoxAscent) / 2
    );
  }
  return canvas;
}
