/** Разбор простых SVG-кусков (path с M L H V Q Z и маленькими буквами, circle, ellipse, rect) в точки: для проверки геометрии причёсок числами. */
export interface Pt { x: number; y: number }

const num = (s: string): number[] => (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);

/** Точки пути: вершины и по 16 точек на каждую квадратичную кривую (достаточно для верха и краёв). */
export function pathPoints(d: string): Pt[] {
  const out: Pt[] = [];
  const re = /([MmLlHhVvQqZz])([^MmLlHhVvQqZz]*)/g;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (let m = re.exec(d); m; m = re.exec(d)) {
    const c = m[1] as string;
    const a = num(m[2] as string);
    const rel = c === c.toLowerCase();
    const add = (x: number, y: number): void => {
      out.push({ x, y });
      cx = x;
      cy = y;
    };
    switch (c.toUpperCase()) {
      case 'M':
        for (let i = 0; i + 1 < a.length; i += 2) add((rel ? cx : 0) + (a[i] as number), (rel ? cy : 0) + (a[i + 1] as number));
        sx = cx;
        sy = cy;
        break;
      case 'L':
        for (let i = 0; i + 1 < a.length; i += 2) add((rel ? cx : 0) + (a[i] as number), (rel ? cy : 0) + (a[i + 1] as number));
        break;
      case 'H':
        for (const v of a) add((rel ? cx : 0) + v, cy);
        break;
      case 'V':
        for (const v of a) add(cx, (rel ? cy : 0) + v);
        break;
      case 'Q':
        for (let i = 0; i + 3 < a.length; i += 4) {
          const x0 = cx;
          const y0 = cy;
          const x1 = (rel ? cx : 0) + (a[i] as number);
          const y1 = (rel ? cy : 0) + (a[i + 1] as number);
          const x2 = (rel ? x0 : 0) + (a[i + 2] as number);
          const y2 = (rel ? y0 : 0) + (a[i + 3] as number);
          for (let k = 1; k <= 16; k++) {
            const t = k / 16;
            out.push({ x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2, y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2 });
          }
          cx = x2;
          cy = y2;
        }
        break;
      default:
        cx = sx;
        cy = sy;
    }
  }
  return out;
}

const attr = (tag: string, name: string): number => Number(new RegExp(`\\b${name}="(-?[\\d.]+)"`).exec(tag)?.[1] ?? NaN);

/** Все точки фигур внутри строки SVG. */
export function shapePoints(svg: string): Pt[] {
  const pts: Pt[] = [];
  for (const m of svg.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)) pts.push(...pathPoints(m[1] as string));
  for (const m of svg.matchAll(/<circle\b[^>]*>/g)) {
    const [cx, cy, r] = [attr(m[0], 'cx'), attr(m[0], 'cy'), attr(m[0], 'r')];
    for (let k = 0; k < 24; k++) pts.push({ x: cx + r * Math.cos((k / 24) * 6.2832), y: cy + r * Math.sin((k / 24) * 6.2832) });
  }
  for (const m of svg.matchAll(/<ellipse\b[^>]*>/g)) {
    const [cx, cy, rx, ry] = [attr(m[0], 'cx'), attr(m[0], 'cy'), attr(m[0], 'rx'), attr(m[0], 'ry')];
    for (let k = 0; k < 24; k++) pts.push({ x: cx + rx * Math.cos((k / 24) * 6.2832), y: cy + ry * Math.sin((k / 24) * 6.2832) });
  }
  for (const m of svg.matchAll(/<rect\b[^>]*>/g)) {
    const [x, y, w, h] = [attr(m[0], 'x'), attr(m[0], 'y'), attr(m[0], 'width'), attr(m[0], 'height')];
    pts.push({ x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h });
  }
  return pts;
}

export const minY = (p: Pt[]): number => Math.min(...p.map((q) => q.y));
export const maxY = (p: Pt[]): number => Math.max(...p.map((q) => q.y));
export const minX = (p: Pt[]): number => Math.min(...p.map((q) => q.x));
export const maxX = (p: Pt[]): number => Math.max(...p.map((q) => q.x));
