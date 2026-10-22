/* Разбор частей боковых секций (30-1, 30-2): предметы с проектными рамками data-box и итоговыми рамками через transform обёртки data-wrap (translate(a b) scale(s) translate(c d)). */
export type Box = { x: number; y: number; w: number; h: number };
export interface SideItem { id: string; design: Box; final: Box; s: number; a: number; b: number; c: number; d: number }

export function parseItems(svg: string): SideItem[] {
  const out: SideItem[] = [];
  const parts = svg.split('data-wrap="').slice(1);
  for (const seg of parts) {
    const m = /^(\w+)" transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\) translate\(([-\d.]+) ([-\d.]+)\)"/.exec(seg);
    if (!m) throw new Error('нет transform у обёртки ' + seg.slice(0, 30));
    const [a, b, s, c, d] = [+(m[2] as string), +(m[3] as string), +(m[4] as string), +(m[5] as string), +(m[6] as string)];
    for (const it of seg.matchAll(/data-item="(\w+)" data-box="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/g)) {
      const dx = +(it[2] as string), dy = +(it[3] as string), dw = +(it[4] as string), dh = +(it[5] as string);
      out.push({ id: it[1] as string, design: { x: dx, y: dy, w: dw, h: dh }, final: { x: a + s * (dx + c), y: b + s * (dy + d), w: s * dw, h: s * dh }, s, a, b, c, d });
    }
  }
  return out;
}

export const hit = (p: Box, q: Box): boolean => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
export const union = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
