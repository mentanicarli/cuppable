import { describe, expect, test } from 'vitest';
import PARTS_L from '../src/assets/art/bar-parts-left.json';
import PAL from '../art-src/palette.json';
import { SIDE_ARROW, SIDE_KEEP_OUT, SIDE_ZONES } from '../src/game/sections';

/* Блок 30-1: левая секция «Чайный бар». Тест разбирает собранные части (src/assets/art/bar-parts-left.json): состав, габариты предметов по таблице docs/art/sides/plan.md, зоны, свободные полосы, палитра, толщины, иконки.
   Фактическую геометрию (getBBox) сверяет `node scripts/sides-preview.mjs out.png --bbox` (допуск 4 px): в юните браузера нет, поэтому здесь сверка объявленных рамок data-box. */
type Box = { x: number; y: number; w: number; h: number };
const parts = PARTS_L as unknown as Record<string, { svg: string; box: Box; texts: unknown[] }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const items = (id: string): Record<string, Box> => {
  const r: Record<string, Box> = {};
  for (const m of svgOf(id).matchAll(/data-item="(\w+)" data-box="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/g)) r[m[1] as string] = { x: +(m[2] as string), y: +(m[3] as string), w: +(m[4] as string), h: +(m[5] as string) };
  return r;
};
const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;

/** Таблица плана (разд. 1): габариты px и место. */
const WANT: Record<string, Record<string, Box>> = {
  tea: { kettle: { x: 118, y: 390, w: 74, h: 116 }, glassTeapot: { x: 200, y: 442, w: 70, h: 64 }, tinA: { x: 276, y: 450, w: 30, h: 56 }, tinB: { x: 308, y: 450, w: 30, h: 56 } },
  matcha: { tray: { x: 428, y: 496, w: 266, h: 16 }, kyusu: { x: 436, y: 438, w: 64, h: 60 }, bowl: { x: 512, y: 454, w: 70, h: 44 }, whisk: { x: 596, y: 446, w: 30, h: 52 }, jar: { x: 640, y: 440, w: 44, h: 58 } },
  powders: { stand: { x: 716, y: 484, w: 376, h: 26 }, jarCocoa: { x: 734, y: 392, w: 84, h: 92 }, jarChicory: { x: 826, y: 392, w: 84, h: 92 }, jarProtein: { x: 918, y: 392, w: 84, h: 92 } },
  decor: { teaShelf: { x: 130, y: 232, w: 300, h: 74 }, roundWindow: { x: 1010, y: 150, w: 150, h: 150 }, plant: { x: 24, y: 400, w: 70, h: 106 } }
};

describe('30-1: левая секция, состав частей', () => {
  test('ровно четыре части: tea, matcha, powders, decor (остатков старых нет)', () => {
    expect(Object.keys(parts).sort()).toEqual(['decor', 'matcha', 'powders', 'tea']);
    for (const k of Object.keys(parts)) expect((parts[k] as { texts: unknown[] }).texts).toEqual([]);
  });
  test('число предметов-групп по частям', () => {
    expect(Object.keys(items('tea'))).toHaveLength(4);
    expect(Object.keys(items('matcha'))).toHaveLength(5);
    expect(Object.keys(items('powders'))).toHaveLength(5);
    expect(Object.keys(items('decor'))).toHaveLength(3);
  });
  test('иконки на банках: чай 2, матча 1, порошки 3, полка с банками 5; слов нет', () => {
    expect(count(svgOf('tea'), 'data-icon=')).toBe(2);
    expect(count(svgOf('matcha'), 'data-icon=')).toBe(1);
    expect(count(svgOf('powders'), 'data-icon=')).toBe(3);
    expect(count(svgOf('decor'), 'data-icon=')).toBe(5);
    for (const k of Object.keys(parts)) expect(svgOf(k)).not.toContain('<text');
  });
});

describe('30-1: габариты по таблице плана (±4 px)', () => {
  for (const [part, want] of Object.entries(WANT)) {
    test(`${part}: рамки предметов`, () => {
      const got = items(part);
      for (const [id, w] of Object.entries(want)) {
        const g = got[id] as Box;
        expect(g, `${part}.${id}`).toBeDefined();
        for (const key of ['x', 'y', 'w', 'h'] as const) expect(near(g[key], w[key], 4), `${part}.${id}.${key}: ${g[key]} против ${w[key]}`).toBe(true);
      }
    });
  }
  test('предметы станций стоят на заднем ряду: низ рамки не ниже 512 (подставки и поднос)', () => {
    for (const part of ['tea', 'matcha', 'powders']) for (const [id, b] of Object.entries(items(part))) expect(b.y + b.h, `${part}.${id}`).toBeLessThanOrEqual(512);
  });
  test('box части содержит рамки всех её предметов', () => {
    for (const part of Object.keys(parts)) {
      const pb = (parts[part] as { box: Box }).box;
      for (const [id, b] of Object.entries(items(part))) {
        expect(b.x >= pb.x && b.y >= pb.y && b.x + b.w <= pb.x + pb.w && b.y + b.h <= pb.y + pb.h, `${part}.${id} внутри box части`).toBe(true);
      }
    }
  });
});

describe('30-1: предметы в зонах и вне занятых полос', () => {
  const zone = (id: string): Box => SIDE_ZONES.find((z) => z.id === id) as Box;
  test('предметы станции укладываются в её зону ±8 px', () => {
    for (const part of ['tea', 'matcha', 'powders']) {
      const z = zone(part);
      for (const [id, b] of Object.entries(items(part))) {
        expect(b.x >= z.x - 8 && b.y >= z.y - 8 && b.x + b.w <= z.x + z.w + 8 && b.y + b.h <= z.y + z.h + 8, `${part}.${id} в зоне`).toBe(true);
      }
    }
  });
  test('зоны L не пересекаются друг с другом, с интерфейсом и со стрелкой', () => {
    const zs = SIDE_ZONES.filter((z) => z.section === 'L');
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i] as Box & { id: string };
      for (let j = i + 1; j < zs.length; j++) expect(hit(a, zs[j] as Box)).toBe(false);
      for (const u of SIDE_KEEP_OUT) if (u.always) expect(hit(a, u), `зона ${a.id} и «${u.name}»`).toBe(false);
      expect(hit(a, SIDE_ARROW.L)).toBe(false);
    }
  });
  test('декор не заходит в занятые полосы (билет, в том числе развёрнутый, коуч, мини-карта, стрелка)', () => {
    for (const [id, b] of Object.entries(items('decor'))) {
      for (const u of SIDE_KEEP_OUT) expect(hit(b, u), `декор ${id} и «${u.name}»`).toBe(false);
      expect(hit(b, SIDE_ARROW.L), `декор ${id} и стрелка`).toBe(false);
      if (b.x < 494) expect(b.y).toBeGreaterThanOrEqual(232);
    }
  });
});

describe('30-1: язык эталона', () => {
  const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
  const widths = new Set(Object.values(PAL.stroke).map(String));
  test('цвета только из палитры, толщины только L/M/D (3,5 / 3 / 2), без градиентов', () => {
    for (const k of Object.keys(parts)) {
      const s = svgOf(k);
      for (const m of s.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), `${k}: цвет ${m[1]}`).toBe(true);
      for (const m of s.matchAll(/stroke-width="([\d.]+)"/g)) expect(widths.has(m[1] as string), `${k}: толщина ${m[1]}`).toBe(true);
      expect(s).not.toContain('url(#');
    }
  });
});
