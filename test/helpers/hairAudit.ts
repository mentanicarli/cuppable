/**
 * Аудит «натуральности» причёсок и бороды (32-В2, критерии Н1–Н8): числа считаются по геометрии рисунка и по маленькому растру, без браузера.
 * Координаты те же, что в art.ts (голова до масштаба 1,1): круг лица r 28 с центром (0, 432), верх черепа 404, верх глаз 432, уши (±27, 438).
 */
import { pathPoints, type Pt } from './geom';

export const HEAD = { cx: 0, cy: 432, r: 28, top: 404, eyeTop: 432, faceH: 56 } as const;
const RES = 2; /* пикселей растра на единицу */
const X0 = -64;
const Y0 = 366;
const W = 128 * RES;
const H = 140 * RES;

export interface FillShape { fill: string; poly: Pt[] }

const attr = (tag: string, name: string): string | undefined => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const num = (tag: string, name: string): number => Number(attr(tag, name));

/** Закрашенные фигуры строки SVG (path, circle, ellipse, rect) как многоугольники; fill="none" пропускается. */
export function fillShapes(svg: string): FillShape[] {
  const out: FillShape[] = [];
  for (const m of svg.matchAll(/<(path|circle|ellipse|rect)\b[^>]*>/g)) {
    const tag = m[0];
    const fill = attr(tag, 'fill') ?? '#000';
    if (fill === 'none') continue;
    if (m[1] === 'path') {
      const d = attr(tag, 'd') ?? '';
      for (const sub of d.split(/(?=M)/).filter(Boolean)) out.push({ fill, poly: pathPoints(sub) });
    } else if (m[1] === 'circle' || m[1] === 'ellipse') {
      const [cx, cy] = [num(tag, 'cx'), num(tag, 'cy')];
      const [rx, ry] = m[1] === 'circle' ? [num(tag, 'r'), num(tag, 'r')] : [num(tag, 'rx'), num(tag, 'ry')];
      out.push({ fill, poly: Array.from({ length: 40 }, (_, k) => ({ x: cx + rx * Math.cos((k / 40) * 6.2832), y: cy + ry * Math.sin((k / 40) * 6.2832) })) });
    } else {
      const [x, y, w, h] = [num(tag, 'x'), num(tag, 'y'), num(tag, 'width'), num(tag, 'height')];
      out.push({ fill, poly: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });
    }
  }
  return out;
}

export function inPoly(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Pt;
    const b = poly[j] as Pt;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Растр объединения многоугольников: 1 = закрашено. */
export function raster(polys: Pt[][]): Uint8Array {
  const g = new Uint8Array(W * H);
  for (const poly of polys) {
    if (poly.length < 3) continue;
    const ys = poly.map((p) => p.y);
    const ya = Math.max(0, Math.floor((Math.min(...ys) - Y0) * RES));
    const yb = Math.min(H - 1, Math.ceil((Math.max(...ys) - Y0) * RES));
    for (let iy = ya; iy <= yb; iy++) {
      const y = Y0 + (iy + 0.5) / RES;
      const xs: number[] = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i] as Pt;
        const b = poly[j] as Pt;
        if (a.y > y !== b.y > y) xs.push(((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x);
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(((xs[k] as number) - X0) * RES - 0.5));
        const xb = Math.min(W - 1, Math.round(((xs[k + 1] as number) - X0) * RES - 0.5));
        for (let ix = xa; ix <= xb; ix++) g[iy * W + ix] = 1;
      }
    }
  }
  return g;
}

export const rasterOf = (svg: string): Uint8Array => raster(fillShapes(svg).map((s) => s.poly));
const px = (g: Uint8Array, x: number, y: number): number => {
  const ix = Math.floor((x - X0) * RES);
  const iy = Math.floor((y - Y0) * RES);
  return ix < 0 || iy < 0 || ix >= W || iy >= H ? 0 : (g[iy * W + ix] as number);
};
const area = (g: Uint8Array, f: (x: number, y: number) => boolean): number => {
  let n = 0;
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) if (g[iy * W + ix] && f(X0 + (ix + 0.5) / RES, Y0 + (iy + 0.5) / RES)) n++;
  return n / (RES * RES);
};

/** Н1: передний край на лбу = средняя нижняя граница волос по колонкам |x| от 4 до 12 (сверху вниз, до первого просвета). */
export function hairline(front: string): number {
  const g = rasterOf(front);
  const ys: number[] = [];
  for (const sg of [-1, 1]) for (let x = 4; x <= 12; x++) {
    let y = 392;
    let seen = false;
    for (; y < 440; y += 1 / RES) {
      if (px(g, sg * x + 0.01, y)) seen = true;
      else if (seen) break;
    }
    ys.push(seen ? y : HEAD.top);
  }
  return ys.reduce((a, b) => a + b, 0) / ys.length;
}
/** Допустимая линия роста: от 30 до 55 % расстояния «верх черепа → верх глаз» и лоб не больше трети лица (то есть не выше 413,3). */
export const HAIRLINE_MIN = Math.max(HEAD.top + 0.3 * (HEAD.eyeTop - HEAD.top), HEAD.eyeTop - HEAD.faceH / 3);
export const HAIRLINE_MAX = HEAD.top + 0.55 * (HEAD.eyeTop - HEAD.top);

/** Н2: замкнутые просветы внутри объединения закраски (не достижимые снаружи) в px² и непокрытая макушка (круг лица выше y 408). */
export function gaps(layers: string): { holes: number; crown: number } {
  const g = rasterOf(layers);
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const push = (ix: number, iy: number): void => {
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const k = iy * W + ix;
    if (g[k] || seen[k]) return;
    seen[k] = 1;
    stack.push(k);
  };
  for (let ix = 0; ix < W; ix++) { push(ix, 0); push(ix, H - 1); }
  for (let iy = 0; iy < H; iy++) { push(0, iy); push(W - 1, iy); }
  while (stack.length) {
    const k = stack.pop() as number;
    const ix = k % W;
    const iy = (k - ix) / W;
    push(ix + 1, iy); push(ix - 1, iy); push(ix, iy + 1); push(ix, iy - 1);
  }
  let holes = 0;
  let crown = 0;
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const k = iy * W + ix;
    const x = X0 + (ix + 0.5) / RES;
    const y = Y0 + (iy + 0.5) / RES;
    if (!g[k] && !seen[k]) holes++;
    if (!g[k] && y <= 408 && Math.hypot(x - HEAD.cx, y - HEAD.cy) <= HEAD.r - 1) crown++;
  }
  return { holes: holes / (RES * RES), crown: crown / (RES * RES) };
}

/** Н3: сколько незакрашенных штрихов (fill none) и площадь закраски. */
export function mass(layers: string): { strokes: number; area: number; strokeWidths: number[] } {
  const strokes = [...layers.matchAll(/<path\b[^>]*fill="none"[^>]*>/g)].length;
  const widths = [...layers.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));
  return { strokes, area: area(rasterOf(layers), () => true), strokeWidths: widths };
}

/** Н4: самая нижняя точка закраски у висков (|x| ≥ 24). */
export function sideEnd(layers: string): number {
  const g = rasterOf(layers);
  let y = 0;
  for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
    const x = X0 + (ix + 0.5) / RES;
    if (g[iy * W + ix] && Math.abs(x) >= 24 && Y0 + iy / RES > y) y = Y0 + iy / RES;
  }
  return y;
}

/** Н5: завитки (круги и эллипсы): число, отношение наибольшего радиуса к наименьшему, разброс от общей окружности, перекрывающиеся пары. */
export function curls(layers: string): { n: number; ratio: number; ringStd: number; overlaps: number } {
  const cs = [...layers.matchAll(/<(circle|ellipse)\b[^>]*>/g)].map((m) => {
    const t = m[0];
    return { x: num(t, 'cx'), y: num(t, 'cy'), r: m[1] === 'circle' ? num(t, 'r') : (num(t, 'rx') + num(t, 'ry')) / 2 };
  });
  /* не повторяем пары «контур + заливка»: одинаковые центры считаем одним завитком */
  const uniq = cs.filter((c, i) => cs.findIndex((d) => d.x === c.x && d.y === c.y && d.r === c.r) === i);
  if (uniq.length < 3) return { n: uniq.length, ratio: 1, ringStd: 0, overlaps: 0 };
  const mx = uniq.reduce((a, c) => a + c.x, 0) / uniq.length;
  const my = uniq.reduce((a, c) => a + c.y, 0) / uniq.length;
  const ds = uniq.map((c) => Math.hypot(c.x - mx, c.y - my));
  const md = ds.reduce((a, b) => a + b, 0) / ds.length;
  const ringStd = Math.sqrt(ds.reduce((a, d) => a + (d - md) ** 2, 0) / ds.length);
  let overlaps = 0;
  for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
    const a = uniq[i] as { x: number; y: number; r: number };
    const b = uniq[j] as { x: number; y: number; r: number };
    if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - 1) overlaps++;
  }
  const rs = uniq.map((c) => c.r);
  return { n: uniq.length, ratio: Math.max(...rs) / Math.min(...rs), ringStd, overlaps };
}

/** Н8: разница площадей левой и правой половин закраски, доля от большей. */
export function asymmetry(layers: string): number {
  const g = rasterOf(layers);
  const l = area(g, (x) => x < 0);
  const r = area(g, (x) => x >= 0);
  return Math.abs(l - r) / Math.max(l, r);
}

/** Расстояние между силуэтами двух закрасок: наибольшее отклонение границы одной от другой (в единицах рисунка). */
export function silhouetteGap(a: string, b: string): number {
  const ga = rasterOf(a);
  const gb = rasterOf(b);
  let worst = 0;
  for (const [g, o] of [[ga, gb], [gb, ga]] as const) {
    const edge: Pt[] = [];
    for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) if (g[iy * W + ix] && !(g[iy * W + ix + 1] && g[iy * W + ix - 1] && g[(iy + 1) * W + ix] && g[(iy - 1) * W + ix])) edge.push({ x: X0 + (ix + 0.5) / RES, y: Y0 + (iy + 0.5) / RES });
    const oe: Pt[] = [];
    for (let iy = 1; iy < H - 1; iy++) for (let ix = 1; ix < W - 1; ix++) if (o[iy * W + ix] && !(o[iy * W + ix + 1] && o[iy * W + ix - 1] && o[(iy + 1) * W + ix] && o[(iy - 1) * W + ix])) oe.push({ x: X0 + (ix + 0.5) / RES, y: Y0 + (iy + 0.5) / RES });
    for (const p of edge) {
      let d = Infinity;
      for (const q of oe) d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y));
      worst = Math.max(worst, d);
    }
  }
  return worst;
}
/** Площадь симметричной разности двух закрасок, доля от большей. */
export function diffShare(a: string, b: string): number {
  const ga = rasterOf(a);
  const gb = rasterOf(b);
  let d = 0;
  let m = 0;
  for (let k = 0; k < W * H; k++) {
    if (ga[k] !== gb[k]) d++;
    m = Math.max(m, 0);
  }
  const na = ga.reduce((s, v) => s + v, 0);
  const nb = gb.reduce((s, v) => s + v, 0);
  return d / Math.max(na, nb, 1 + m);
}

/** Нижняя граница закраски в колонке x (сверху вниз до первого просвета после закраски); null, если колонка пуста. */
export function columnBottom(svg: string, x: number): number | null {
  const g = rasterOf(svg);
  let seen = false;
  let y = 392;
  for (; y < 505; y += 1 / RES) {
    if (px(g, x, y)) seen = true;
    else if (seen) return y;
  }
  return seen ? y : null;
}
/** Линия роста по ширине лба: нижняя граница закраски в колонках от xa до xb. */
export function hairlineProfile(svg: string, xa: number, xb: number): number[] {
  const out: number[] = [];
  for (let x = xa; x <= xb; x++) out.push(columnBottom(svg, x + 0.01) ?? HEAD.top);
  return out;
}
/** Закрашена ли точка. */
export const covered = (svg: string, x: number, y: number): boolean => px(rasterOf(svg), x, y) === 1;

/** Растр штрихов (path без заливки: линии бровей, морщин, носа, рта) и цветных пятен румянца; толщина из stroke-width (по умолчанию 3). */
export function marksRaster(svg: string): Uint8Array {
  const g = new Uint8Array(W * H);
  const disc = (cx: number, cy: number, r: number): void => {
    const ya = Math.max(0, Math.floor((cy - r - Y0) * RES));
    const yb = Math.min(H - 1, Math.ceil((cy + r - Y0) * RES));
    for (let iy = ya; iy <= yb; iy++) for (let ix = Math.max(0, Math.floor((cx - r - X0) * RES)); ix <= Math.min(W - 1, Math.ceil((cx + r - X0) * RES)); ix++) {
      const x = X0 + (ix + 0.5) / RES;
      const y = Y0 + (iy + 0.5) / RES;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g[iy * W + ix] = 1;
    }
  };
  for (const m of svg.matchAll(/<path\b[^>]*fill="none"[^>]*>/g)) {
    const d = attr(m[0], 'd') ?? '';
    const w = Number(attr(m[0], 'stroke-width') ?? 3);
    for (const sub of d.split(/(?=M)/).filter(Boolean)) {
      const pts = pathPoints(sub);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i] as Pt;
        disc(a.x, a.y, w / 2);
        const n = pts[i + 1];
        if (n) {
          const steps = Math.ceil(Math.hypot(n.x - a.x, n.y - a.y) / 0.4);
          for (let k = 1; k < steps; k++) disc(a.x + ((n.x - a.x) * k) / steps, a.y + ((n.y - a.y) * k) / steps, w / 2);
        }
      }
    }
  }
  const blush = fillShapes([...svg.matchAll(/<ellipse\b[^>]*fill="#E3806C"[^>]*>/g)].map((m) => m[0]).join(''));
  const br = raster(blush.map((b) => b.poly));
  for (let k = 0; k < g.length; k++) if (br[k]) g[k] = 1;
  return g;
}
/** Доля площади (в единицах рисунка², от круга лица r 28) отличающихся пикселей двух растров. */
export function maskDiff(a: Uint8Array, b: Uint8Array, region?: Uint8Array): number {
  let d = 0;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k] && (!region || region[k])) d++;
  return d / (RES * RES) / (Math.PI * 28 * 28);
}
export const polyRaster = (poly: Pt[]): Uint8Array => raster([poly]);
