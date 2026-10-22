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

/* ---------- сосуды (30-2б): слои, жидкость, шарики, трубочки, лёд ---------- */
export interface Glass { id: string; inner: Box; layers: string[]; liquid: Box | null; body: string }
const nums = (d: string): number[] => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

export function parseGlasses(svg: string): Glass[] {
  const out: Glass[] = [];
  for (const m of svg.matchAll(/<g data-glass="(\w+)" data-inner="([^"]+)">([\s\S]*?)<\/g>/g)) {
    const body = m[3] as string;
    const [ix, iy, iw, ih] = (m[2] as string).split(' ').map(Number) as [number, number, number, number];
    const layers = [...body.matchAll(/data-layer="(\w+)"/g)].map((l) => l[1] as string);
    const lq = /data-layer="liquid" d="([^"]+)"/.exec(body);
    let liquid: Box | null = null;
    if (lq) {
      const v = nums(lq[1] as string);
      const xs = v.filter((_, i) => i % 2 === 0), ys = v.filter((_, i) => i % 2 === 1);
      liquid = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    out.push({ id: m[1] as string, inner: { x: ix, y: iy, w: iw, h: ih }, layers, liquid, body });
  }
  return out;
}

export const LAYER_RANK: Record<string, number> = { back: 0, liquid: 1, balls: 2, straw: 3, outline: 4, shine: 5 };

/** Верх трубочки (y) и высота выступа над верхом стекла; трубочка — rect с rotate(a cx cy) вокруг нижней точки. */
export function strawTops(body: string): { w: number; top: number; jar: boolean }[] {
  const out: { w: number; top: number; jar: boolean }[] = [];
  for (const m of body.matchAll(/<rect data-layer="straw"[^>]*>/g)) {
    const tag = m[0];
    const at = (n: string): number => +((new RegExp(String.raw`\s${n}="([-\d.]+)"`).exec(tag) as RegExpExecArray)[1] as string);
    const rot = /rotate\(([-\d.]+) /.exec(tag);
    const y = at('y'), h = at('height'), a = rot ? +(rot[1] as string) : 0;
    out.push({ w: at('width'), top: y + h - h * Math.cos((a * Math.PI) / 180), jar: tag.includes('data-straw="jar"') });
  }
  return out;
}

export interface Ball { cx: number; cy: number; r: number }
export function parseBalls(body: string): Ball[] {
  return [...body.matchAll(/<circle data-layer="balls" data-ball="1" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((m) => ({ cx: +(m[1] as string), cy: +(m[2] as string), r: +(m[3] as string) }));
}
