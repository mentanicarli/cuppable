/** Читаемый текст на цветных плашках (билет бара, пузырь гостя): WCAG-контраст не ниже 4,5 для любого фона. */
const INK = '#4A2F25';
const CREAM = '#FFF8EC';
export const MIN_CONTRAST = 4.5;

const chan = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Относительная яркость цвета `#RRGGBB` (WCAG 2.x). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Цвет текста для фона плашки: чернильный или кремовый, а если ни один не даёт 4,5 (середина яркости) — чёрный или белый. */
export function readableOn(bg: string): string {
  for (const c of [INK, CREAM]) if (contrastRatio(bg, c) >= MIN_CONTRAST) return c;
  return contrastRatio(bg, '#000000') >= contrastRatio(bg, '#FFFFFF') ? '#000000' : '#FFFFFF';
}

/** Фоны плашек заказа: размер, шоты, «крепкий», еда (сироп берёт свой цвет из SYRUP_META). */
export const TAG_BG = { size: '#8FA58A', shots: '#7A5A4A', strong: '#C4694A', food: '#C98B5A' } as const;
