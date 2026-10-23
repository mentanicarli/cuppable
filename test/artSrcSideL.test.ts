import { describe, expect, test } from 'vitest';
import PARTS_L from '../src/assets/art/bar-parts-left.json';
import PAL from '../art-src/palette.json';
import { SIDE_ARROW, SIDE_KEEP_OUT, SIDE_ZONES } from '../src/game/sections';
import { hit, parseItems, union, type Box } from './helpers/sideArt';

/* Блоки 30-1 и 30-2 (правки): левая секция «Чайный бар». Предметы нарисованы в проектных размерах плана и ×1,10 раскладываются transform-обёртками (data-wrap); тест сверяет проектные рамки (±4 px), параметры обёрток, итоговые рамки, зоны, свободные полосы, палитру, толщины (3,5 / 3 / 2 делятся на data-scale 1,1), иконки и этикетки.
   Фактическую геометрию сверяет `node scripts/sides-preview.mjs out.png --bbox`. */
const parts = PARTS_L as unknown as Record<string, { svg: string; box: Box; texts: unknown[] }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const near = (a: number, b: number, tol: number): boolean => Math.abs(a - b) <= tol;
const S = 1.1;

/** Проектные размеры (план, разд. 1). */
const WANT: Record<string, Record<string, Box>> = {
  tea: { kettle: { x: 118, y: 390, w: 74, h: 116 }, glassTeapot: { x: 200, y: 442, w: 70, h: 64 }, tinA: { x: 276, y: 450, w: 30, h: 56 }, tinB: { x: 308, y: 450, w: 30, h: 56 } },
  matcha: { tray: { x: 428, y: 496, w: 266, h: 16 }, kyusu: { x: 436, y: 438, w: 64, h: 60 }, bowl: { x: 512, y: 454, w: 70, h: 44 }, whisk: { x: 596, y: 446, w: 30, h: 52 }, jar: { x: 640, y: 440, w: 44, h: 58 } },
  boba: { boba: { x: 716, y: 388, w: 284, h: 122 } },
  powders: { stand: { x: 716, y: 484, w: 304, h: 26 }, jarCocoa: { x: 734, y: 392, w: 84, h: 92 }, jarChicory: { x: 826, y: 392, w: 84, h: 92 }, jarProtein: { x: 918, y: 392, w: 84, h: 92 } },
  decor: { teaShelf: { x: 130, y: 232, w: 300, h: 74 } }
};
/** Раскладка ×1,10: куда переехал левый край проектного ряда (translate(a b) scale(1,1) translate(c d)). */
const LAYOUT: Record<string, { a: number; b: number; c: number; d: number }> = {
  tea: { a: 18, b: 506, c: -117, d: -506 },
  matcha: { a: 285, b: 506, c: -428, d: -506 },
  boba: { a: 598, b: 506, c: -716, d: -506 },
  powders: { a: 928, b: 506, c: -716, d: -506 },
  teaShelf: { a: 140, b: 232, c: -130, d: -232 }
};
const items = (part: string): ReturnType<typeof parseItems> => parseItems(svgOf(part));
const finals = (part: string): Box[] => items(part).map((i) => i.final);

describe('30-1/30-2: левая секция, состав частей', () => {
  test('ровно пять частей: tea, matcha, boba, powders, decor (31-2: boba переехала из правой секции)', () => {
    expect(Object.keys(parts).sort()).toEqual(['boba', 'decor', 'matcha', 'powders', 'tea']);
    for (const k of Object.keys(parts)) expect((parts[k] as { texts: unknown[] }).texts).toEqual([]);
  });
  test('число предметов-групп по частям; окна нет', () => {
    expect(items('tea')).toHaveLength(4);
    expect(items('matcha')).toHaveLength(5);
    expect(items('powders')).toHaveLength(4); /* стойка и три банки: мерный стаканчик убран в 31-2 */
    expect(items('boba').map((i) => i.id)).toEqual(['boba']);
    expect(items('decor').map((i) => i.id)).toEqual(['teaShelf']); /* растение убрано в 31-2 */
    expect(svgOf('decor')).not.toContain('roundWindow');
    expect(svgOf('decor')).not.toContain('circle');
  });
  test('иконки: у чая и банок на полке нет (там этикетки), у матчи 1, у порошков 3; слов нет', () => {
    expect(count(svgOf('tea'), 'data-icon=')).toBe(0);
    expect(count(svgOf('decor'), 'data-icon=')).toBe(0);
    expect(count(svgOf('boba'), 'data-icon=')).toBe(0);
    expect(count(svgOf('matcha'), 'data-icon=')).toBe(1);
    expect(count(svgOf('powders'), 'data-icon=')).toBe(3);
    for (const k of Object.keys(parts)) expect(svgOf(k)).not.toContain('<text');
  });
  test('этикетки на банках чая: две у станции, пять на полке; у каждой бумажная плашка и две строчки', () => {
    expect(count(svgOf('tea'), 'data-label=')).toBe(2);
    expect(count(svgOf('decor'), 'data-label=')).toBe(5);
    for (const k of ['tea', 'decor']) {
      for (const seg of svgOf(k).split('data-label="').slice(1)) {
        const g = seg.slice(0, seg.indexOf('</g>'));
        expect(g.toLowerCase()).toContain('#fff8ec');
        expect(count(g, 'M')).toBe(2); /* два отрезка-строчки */
      }
    }
  });
});

describe('30-1/30-2: проектные размеры и раскладка ×1,10', () => {
  for (const [part, want] of Object.entries(WANT)) {
    test(`${part}: проектные рамки предметов ±4 px`, () => {
      const got = Object.fromEntries(items(part).map((i) => [i.id, i.design]));
      for (const [id, w] of Object.entries(want)) {
        const g = got[id] as Box;
        expect(g, `${part}.${id}`).toBeDefined();
        for (const key of ['x', 'y', 'w', 'h'] as const) expect(near(g[key], w[key], 4), `${part}.${id}.${key}: ${g[key]} против ${w[key]}`).toBe(true);
      }
    });
  }
  test('масштаб ×1,10 и положения обёрток по таблице раскладки', () => {
    for (const part of Object.keys(parts)) {
      for (const it of items(part)) {
        expect(it.s, `${part}.${it.id} масштаб`).toBeCloseTo(S, 5);
        const key = part === 'decor' ? it.id : part;
        const L = LAYOUT[key] as { a: number; b: number; c: number; d: number };
        expect([it.a, it.b, it.c, it.d], `${part}.${it.id}`).toEqual([L.a, L.b, L.c, L.d]);
      }
    }
  });
  test('предметы станций стоят на заднем ряду: низ итоговой рамки 506…514', () => {
    for (const part of ['tea', 'matcha', 'boba', 'powders']) {
      const u = union(finals(part));
      expect(u.y + u.h, part).toBeGreaterThanOrEqual(505);
      expect(u.y + u.h, part).toBeLessThanOrEqual(514);
    }
  });
  test('порядок слева направо: чай, матча, бабл ти, порошки; промежутки между рамками ≥ 12 px; всё в x 10–1270', () => {
    const us = ['tea', 'matcha', 'boba', 'powders'].map((p) => union(finals(p)));
    expect((us[0] as Box).x).toBeGreaterThanOrEqual(10);
    const last = us[us.length - 1] as Box;
    expect(last.x + last.w).toBeLessThanOrEqual(1270);
    for (let i = 0; i < us.length - 1; i++) expect((us[i + 1] as Box).x - ((us[i] as Box).x + (us[i] as Box).w)).toBeGreaterThanOrEqual(12);
  });
  test('box части содержит итоговые рамки всех её предметов', () => {
    for (const part of Object.keys(parts)) {
      const pb = (parts[part] as { box: Box }).box;
      for (const it of items(part)) {
        const f = it.final;
        expect(f.x >= pb.x - 1 && f.y >= pb.y - 1 && f.x + f.w <= pb.x + pb.w + 1 && f.y + f.h <= pb.y + pb.h + 1, `${part}.${it.id} внутри box части`).toBe(true);
      }
    }
  });
});

describe('30-1/30-2: предметы в зонах и вне занятых полос', () => {
  const zone = (id: string): Box => SIDE_ZONES.find((z) => z.id === id) as Box;
  test('предметы станции укладываются в её зону ±8 px', () => {
    for (const part of ['tea', 'matcha', 'boba', 'powders']) {
      const z = zone(part);
      for (const it of items(part)) {
        const b = it.final;
        expect(b.x >= z.x - 8 && b.y >= z.y - 8 && b.x + b.w <= z.x + z.w + 8 && b.y + b.h <= z.y + z.h + 8, `${part}.${it.id} в зоне`).toBe(true);
      }
    }
  });
  test('зоны L не пересекаются (зазор ≥ 12), не заходят в интерфейс и стрелку', () => {
    const zs = SIDE_ZONES.filter((z) => z.section === 'L');
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i] as Box & { id: string };
      for (let j = i + 1; j < zs.length; j++) {
        const o = zs[j] as Box;
        expect(Math.max(o.x - (a.x + a.w), a.x - (o.x + o.w)), `${a.id}`).toBeGreaterThanOrEqual(12);
      }
      for (const u of SIDE_KEEP_OUT) if (u.always) expect(hit(a, u), `зона ${a.id} и «${u.name}»`).toBe(false);
      expect(hit(a, SIDE_ARROW.L)).toBe(false);
      expect(a.y + a.h).toBeLessThanOrEqual(515);
    }
  });
  test('предметы и декор не заходят в занятые полосы (билет, в том числе развёрнутый, коуч, мини-карта, стрелка); выше базы 514', () => {
    for (const part of Object.keys(parts)) {
      for (const it of items(part)) {
        for (const u of SIDE_KEEP_OUT) expect(hit(it.final, u), `${part}.${it.id} и «${u.name}»`).toBe(false);
        expect(hit(it.final, SIDE_ARROW.L), `${part}.${it.id} и стрелка`).toBe(false);
        expect(it.final.y + it.final.h, `${part}.${it.id}`).toBeLessThanOrEqual(514);
        if (it.final.x < 494 && part === 'decor') expect(it.final.y, `${part}.${it.id}`).toBeGreaterThanOrEqual(232);
      }
    }
  });
});

describe('30-1/30-2: язык эталона', () => {
  const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
  /* art-build делит толщины на data-scale (1,1), обёртка ×1,1 возвращает 3,5 / 3 / 2 px на экране */
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
