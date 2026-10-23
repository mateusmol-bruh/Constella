export function screenGutter(width: number) { return width < 360 ? 16 : 20; }
export function contentColumns(width: number, fontScale: number) { return width < 380 || fontScale > 1.25 ? 1 : 2; }
export function chatImageWidth(width: number) { return Math.max(96, Math.min(220, (width - 2 * screenGutter(width) - 48) * 0.78 - 28)); }
