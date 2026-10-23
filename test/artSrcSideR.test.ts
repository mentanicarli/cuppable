import { describe, expect, test } from 'vitest';
import PARTS_R from '../src/assets/art/bar-parts-right.json';
import PAL from '../art-src/palette.json';
import { SIDE_ARROW, SIDE_KEEP_OUT, SIDE_ZONES } from '../src/game/sections';
import { hit, parseItems, union, type Box } from './helpers/sideArt';

/* Блок 30-2: правая секция «Холодный бар». Предметы нарисованы в проектных размерах плана (допуск ±5 px) и ×1,10 раскладываются transform-обёртками (data-wrap, генератор scripts/make-side-r.py); тест сверяет проектные рамки, параметры обёрток, итоговые рамки, зоны (boba покрывает пучок трубочек, shaker не пересекается с boba), свободные полосы, палитру, толщины, иконки.
   Фактическую геометрию сверяет `node scripts/sides-preview.mjs out.png --section right --bbox`. */
const parts = PARTS_R as unknown as Record<string, { svg: string; box: Box; texts: unknown[] }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
const S = 1.1;
const STATIONS = ['juice', 'whipper', 'foamer', 'blender', 'shaker'] as const;

/** Проектные размеры (план, разд. 1). */
const WANT: Record<string, Box> = {
  juice: { x: 66, y: 296, w: 152, h: 214 },
  whipper: { x: 262, y: 328, w: 134, h: 182 },
  foamer: { x: 418, y: 344, w: 104, h: 166 },
  blender: { x: 552, y: 288, w: 130, h: 220 },
  shaker: { x: 1012, y: 408, w: 150, h: 100 },
  glassShelf: { x: 706, y: 176, w: 296, h: 80 },
  iceBucket: { x: 1183, y: 425, w: 79, h: 81 },
  sink: { x: 1000, y: 394, w: 173, h: 162 }
};
/** Раскладка ×1,10: куда переехал левый край проектной рамки (translate(a b) scale(1,1) translate(c d)). */
const LAYOUT: Record<string, { a: number; b: number; c: number; d: number }> = {
  juice: { a: 14, b: 506, c: -66, d: -506 },
  whipper: { a: 199.2, b: 506, c: -262, d: -506 },
  foamer: { a: 364.6, b: 506, c: -418, d: -506 },
  blender: { a: 497, b: 506, c: -552, d: -506 },
  shaker: { a: 698.4, b: 506, c: -1012, d: -506 },
  glassShelf: { a: 706, b: 176, c: -706, d: -176 },
  iceBucket: { a: 920, b: 506, c: -1182, d: -506 },
  sink: { a: 1066, b: 506, c: -1000, d: -506 }
};
const items = (part: string): ReturnType<typeof parseItems> => parseItems(svgOf(part));
const all = (): ReturnType<typeof parseItems> => Object.keys(parts).flatMap((k) => items(k));
const final = (id: string): Box => (all().find((i) => i.id === id) as { final: Box }).final;

describe('30-2: правая секция, состав частей', () => {
  test('ровно шесть частей: пять станций и decor (31-2: boba в левой секции); текстов и слов нет', () => {
    expect(Object.keys(parts).sort()).toEqual([...STATIONS, 'decor'].sort());
    for (const k of Object.keys(parts)) {
      expect((parts[k] as { texts: unknown[] }).texts).toEqual([]);
      expect(svgOf(k)).not.toContain('<text');
    }
  });
  test('по одному предмету на станцию; в декоре полка со стаканами, ведёрко и раковина, окна нет', () => {
    for (const k of STATIONS) expect(items(k).map((i) => i.id)).toEqual([k]);
    expect(items('decor').map((i) => i.id).sort()).toEqual(['glassShelf', 'iceBucket', 'sink']);
    expect(svgOf('decor')).not.toContain('window');
  });
  test('иконки: снежинка у холодильника, пузырьки у миксера, нигде больше', () => {
    expect(count(svgOf('juice'), 'data-icon="snow"')).toBe(1);
    expect(count(svgOf('foamer'), 'data-icon="foam"')).toBe(1);
    for (const k of ['whipper', 'blender', 'shaker', 'decor']) expect(count(svgOf(k), 'data-icon=')).toBe(0);
  });
});

describe('30-2: проектные размеры и раскладка ×1,10', () => {
  test('проектные рамки предметов совпадают с планом ±5 px', () => {
    for (const it of all()) {
      const w = WANT[it.id] as Box;
      expect(w, it.id).toBeDefined();
      for (const key of ['x', 'y', 'w', 'h'] as const) expect(near(it.design[key], w[key], 5), `${it.id}.${key}: ${it.design[key]} против ${w[key]}`).toBe(true);
    }
  });
  test('масштаб ×1,10 и положения обёрток по таблице раскладки', () => {
    for (const it of all()) {
      expect(it.s, `${it.id} масштаб`).toBeCloseTo(S, 5);
      const L = LAYOUT[it.id] as { a: number; b: number; c: number; d: number };
      expect([it.a, it.b, it.c, it.d], it.id).toEqual([L.a, L.b, L.c, L.d]);
    }
  });
  test('станции стоят на заднем ряду: низ итоговой рамки 506…514', () => {
    for (const k of [...STATIONS, 'iceBucket']) {
      const f = final(k === 'iceBucket' ? 'iceBucket' : k);
      expect(f.y + f.h, k).toBeGreaterThanOrEqual(505);
      expect(f.y + f.h, k).toBeLessThanOrEqual(514);
    }
  });
  test('порядок слева направо: juice, whipper, foamer, blender, shaker, ведро, раковина; промежутки ≥ 12 px, у трёх последних равные (31-2)', () => {
    const seq = [...STATIONS, 'iceBucket', 'sink'].map((k) => final(k));
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i] as Box, b = seq[i + 1] as Box;
      expect(b.x - (a.x + a.w), `${i}`).toBeGreaterThanOrEqual(12);
    }
    const last = seq[seq.length - 1] as Box;
    expect(last.x + last.w).toBeLessThanOrEqual(1270);
    const gap = (i: number): number => (seq[i + 1] as Box).x - ((seq[i] as Box).x + (seq[i] as Box).w);
    expect(Math.abs(gap(3) - gap(4)), 'зазоры blender–shaker и shaker–ведро').toBeLessThanOrEqual(6);
    expect(Math.abs(gap(4) - gap(5)), 'зазоры shaker–ведро и ведро–раковина').toBeLessThanOrEqual(6);
    expect((seq[0] as Box).x).toBeGreaterThanOrEqual(8);
  });
  test('box части содержит итоговые рамки её предметов', () => {
    for (const part of Object.keys(parts)) {
      const pb = (parts[part] as { box: Box }).box;
      for (const it of items(part)) {
        const f = it.final;
        expect(f.x >= pb.x - 1 && f.y >= pb.y - 1 && f.x + f.w <= pb.x + pb.w + 1 && f.y + f.h <= pb.y + pb.h + 1, `${part}.${it.id} внутри box части`).toBe(true);
      }
    }
  });
});

describe('30-2: предметы в зонах и вне занятых полос', () => {
  const zone = (id: string): Box & { id: string } => SIDE_ZONES.find((z) => z.id === id) as Box & { id: string };
  test('предмет станции укладывается в её зону ±8 px', () => {
    for (const k of STATIONS) {
      const z = zone(k), b = final(k);
      expect(b.x >= z.x - 8 && b.y >= z.y - 8 && b.x + b.w <= z.x + z.w + 8 && b.y + b.h <= z.y + z.h + 8, `${k} в зоне`).toBe(true);
    }
  });
  test('зоны R не пересекаются (зазор ≥ 12), не заходят в интерфейс и стрелку; низ не ниже 514', () => {
    const zs = SIDE_ZONES.filter((z) => z.section === 'R');
    expect(zs).toHaveLength(5);
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i] as Box & { id: string };
      for (let j = i + 1; j < zs.length; j++) {
        const o = zs[j] as Box;
        expect(Math.max(o.x - (a.x + a.w), a.x - (o.x + o.w)), a.id).toBeGreaterThanOrEqual(12);
      }
      for (const u of SIDE_KEEP_OUT) if (u.always) expect(hit(a, u), `зона ${a.id} и «${u.name}»`).toBe(false);
      expect(hit(a, SIDE_ARROW.R)).toBe(false);
      expect(a.y + a.h).toBeLessThanOrEqual(514);
    }
  });
  test('предметы и декор не заходят в занятые полосы (в том числе развёрнутый билет, коуч, стрелка)', () => {
    for (const it of all()) {
      for (const u of SIDE_KEEP_OUT) expect(hit(it.final, u), `${it.id} и «${u.name}»`).toBe(false);
      expect(hit(it.final, SIDE_ARROW.R), `${it.id} и стрелка`).toBe(false);
      /* раковина врезана в столешницу и лежит ниже базы (31-2); остальное выше 514 */
      expect(it.final.y + it.final.h, it.id).toBeLessThanOrEqual(it.id === 'sink' ? 612 : 514);
    }
    const u = union(all().map((i) => i.final));
    expect(u.x).toBeGreaterThanOrEqual(0);
    expect(u.x + u.w).toBeLessThanOrEqual(1280);
  });
});

describe('30-2: язык эталона', () => {
  const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
  const widths = new Set(Object.values(PAL.stroke).map((v) => String(+(v / S).toFixed(2))));
  test('цвета только из палитры, толщины только L/M/D (с учётом ×1,10), без градиентов', () => {
    for (const k of Object.keys(parts)) {
      const s = svgOf(k);
      for (const m of s.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), `${k}: цвет ${m[1]}`).toBe(true);
      for (const m of s.matchAll(/stroke-width="([\d.]+)"/g)) expect(widths.has(m[1] as string), `${k}: толщина ${m[1]}`).toBe(true);
      expect(s).not.toContain('url(#');
    }
  });
});

describe('31-2: раковина с краном (декор правого края)', () => {
  const sink = (): Box => final('sink');
  test('рамка раковины: x ≤ 1270, внутри плоскости столешницы по y, зазор до ведра и станций ≥ 12, зон и клика нет', () => {
    const f = sink();
    expect(f.x + f.w).toBeLessThanOrEqual(1270);
    expect(f.y + f.h).toBeLessThanOrEqual(612);
    expect(f.y).toBeGreaterThanOrEqual(330);
    for (const k of [...STATIONS, 'iceBucket']) {
      const o = final(k);
      expect(f.x - (o.x + o.w), k).toBeGreaterThanOrEqual(12);
    }
    expect(SIDE_ZONES.some((z) => z.id === 'sink')).toBe(false);
    expect(hit(f, SIDE_ARROW.R)).toBe(false);
    for (const u of SIDE_KEEP_OUT) expect(hit(f, u), `«${u.name}»`).toBe(false);
  });
  test('размеры по масштабу бара 4,64 px/см: мойка 32–43 см, кран 22–28 см (106–130 px)', () => {
    const svg = svgOf('decor');
    const wrap = svg.split('data-wrap="sink"')[1] as string;
    const rim = /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="11"/.exec(wrap) as RegExpExecArray;
    const rimW = S * +(rim[3] as string);
    expect(rimW / 4.64).toBeGreaterThanOrEqual(32);
    expect(rimW / 4.64).toBeLessThanOrEqual(43);
    const neck = /<path d="M1079 500V422Q1079 (\d+) /.exec(wrap) as RegExpExecArray;
    const tapH = S * (506 - +(neck[1] as string));
    expect(tapH).toBeGreaterThanOrEqual(100);
    expect(tapH).toBeLessThanOrEqual(130);
  });
  test('состав: светлый обод, тёмная чаша, гусак над чашей с носиком и одной каплей, рычажок сбоку, слив, без текста', () => {
    const wrap = (svgOf('decor').split('data-wrap="sink"')[1] as string);
    expect(wrap).toContain(PAL.colors.STEEL_HI);
    expect(wrap).toContain(PAL.colors.DARK);
    expect(count(wrap, 'data-drop="1"')).toBe(1);
    expect(wrap).not.toContain('<text');
    /* носик (прямоугольник 1133–1151) над чашей (1008–1165) по x */
    expect(1133).toBeGreaterThanOrEqual(1008);
    expect(1151).toBeLessThanOrEqual(1165);
  });
});
