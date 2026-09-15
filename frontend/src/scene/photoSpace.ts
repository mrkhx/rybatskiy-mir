/** Same cover, overscan and object-position as .plate-stage, in CSS pixels. */
export function photoToStage(
  u: number, v: number, width: number, height: number,
  imageWidth: number, imageHeight: number,
  objectX = .22, objectY = .62, overscan = 1.04,
) {
  const boxWidth = width * overscan;
  const boxHeight = height * overscan;
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
  return {
    x: (width - boxWidth) / 2 + (boxWidth - imageWidth * scale) * objectX + u * imageWidth * scale,
    y: (height - boxHeight) / 2 + (boxHeight - imageHeight * scale) * objectY + v * imageHeight * scale,
  };
}
