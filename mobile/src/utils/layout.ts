export function screenGutter(width: number) { return width < 360 ? 16 : 20; }
export function contentColumns(width: number, fontScale: number) { return width < 380 || fontScale > 1.25 ? 1 : 2; }
export function chatImageWidth(width: number) { return Math.max(96, Math.min(220, (width - 2 * screenGutter(width) - 48) * 0.78 - 28)); }
export function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = width > 0 && height > 0 ? width / height : 1;
  return { width: Math.min(maxWidth, maxHeight * ratio), height: Math.min(maxHeight, maxWidth / ratio) };
}
