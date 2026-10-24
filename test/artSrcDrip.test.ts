import { describe, expect, test } from 'vitest';
import CENTER from '../src/assets/art/bar-parts.json';
import PAL from '../art-src/palette.json';
import INDEX from '../index.html?raw';
import BAR from '../src/legacy/06-bar.js?raw';
import BAR_TS from '../src/render/world/bar.ts?raw';
import { SIDE_KEEP_OUT } from '../src/game/sections';
import { STATIONS } from '../src/game/sections';
import { TASK_ZONE } from '../src/game/recipes';
import { barItems } from '../src/game/barItems';

/* Блок 31-8В: капельная кофеварка на столешнице справа от кофемашины (раскладка Ц2 docs/design/filter-coffee.md, раздел 4; стенная полка Ц1 убрана).
   Предмет 130 × 160 в x 859–989, y 346–506 (база заднего ряда), зона drip 859, 336, 130 × 184, масштаб ×1,0 (центр бара без ×1,10). Питчер ×0,7 на переднем крае (880, 530, 91 × 77). */
type Part = { svg: string; box: { x: number; y: number; w: number; h: number } };
const P = CENTER as unknown as Record<string, Part>;
const drip = P['drip'] as Part;
const front = P['dripFront'] as Part;
const S_BAR = 4.64;
type R = { x: number; y: number; w: number; h: number };
const gap = (a: R, b: R): number => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h));
const ITEM: R = { x: 859, y: 346, w: 130, h: 160 };
const ZONE: R = { x: 859, y: 336, w: 130, h: 184 };
const box = (id: string): R => (P[id] as Part).box;
/* питчер: части лежат в рамке 880, 420, 130 × 110 от якоря (940, 514); контейнер в (922, 595,8), масштаб 0,7 (bar.ts) */
const PIT_POS = { x: 922, y: 595.8, k: 0.7 };
const pitcher = (): R => ({ x: PIT_POS.x + PIT_POS.k * (box('pitFront').x - 940), y: PIT_POS.y + PIT_POS.k * (box('pitFront').y - 514), w: PIT_POS.k * box('pitFront').w, h: PIT_POS.k * box('pitFront').h });
const zones = (): Record<string, R> => Object.fromEntries([...INDEX.matchAll(/<rect data-z="(\w+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)].map((m) => [m[1] as string, { x: +(m[2] as string), y: +(m[3] as string), w: +(m[4] as string), h: +(m[5] as string) }]));

describe('кофеварка: часть drip', () => {
  test('две части: drip (корпус и колба) и dripFront (блики, деления), рамки по планам, полки нет', () => {
    expect(drip.box).toEqual({ x: 855, y: 342, w: 138, h: 168 });
    expect(front.box).toEqual({ x: 878, y: 424, w: 58, h: 68 });
    expect((drip.svg.match(/data-item="drip"/g) ?? []).length).toBe(1);
    expect(drip.svg).not.toContain('data-shelf');
    const m = /data-item="drip" data-box="([\d. ]+)"/.exec(drip.svg);
    expect(m?.[1]?.split(' ').map(Number)).toEqual([ITEM.x, ITEM.y, ITEM.w, ITEM.h]);
  });
  test('размер предмета 130 × 160 px (28 × 34,5 см при 4,64 px/см): не меньше 0,75 и не больше 1,5 от реальных 28 × 34; ширина 130–145', () => {
    for (const [px, cm] of [[ITEM.w, 28], [ITEM.h, 34]] as const) {
      expect(px / (cm * S_BAR)).toBeGreaterThanOrEqual(0.75);
      expect(px / (cm * S_BAR)).toBeLessThanOrEqual(1.5);
    }
    expect(ITEM.w).toBeGreaterThanOrEqual(130);
    expect(ITEM.w).toBeLessThanOrEqual(145);
  });
  test('основание стоит на базе заднего ряда y 506, контактная тень под ним', () => {
    expect(ITEM.y + ITEM.h).toBe(506);
    expect(drip.svg).toMatch(/<ellipse cx="924" cy="508"[^>]*fill-opacity="\.16"/);
  });
  test('только цвета палитры, толщины L/M/D, без градиентов и подписей', () => {
    const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
    const widths = new Set(Object.values(PAL.stroke).map(String));
    for (const part of [drip, front]) {
      for (const m of part.svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), `цвет ${m[1]}`).toBe(true);
      for (const m of part.svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(widths.has(m[1] as string), `толщина ${m[1]}`).toBe(true);
      expect(part.svg).not.toContain('url(#');
      expect(part.svg).not.toContain('<text');
    }
  });
  test('предмет внутри рамки части; нарисованы только внутри неё (rect в пределах рамки ±1)', () => {
    const b = drip.box;
    for (const m of drip.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
      const [x, y, w, h] = [m[1], m[2], m[3], m[4]].map(Number) as [number, number, number, number];
      expect(x >= b.x - 1 && y >= b.y - 1 && x + w <= b.x + b.w + 1 && y + h <= b.y + b.h + 1, `rect ${x},${y},${w},${h}`).toBe(true);
    }
    expect(ITEM.x).toBeGreaterThanOrEqual(b.x);
    expect(ITEM.x + ITEM.w).toBeLessThanOrEqual(b.x + b.w);
  });
  test('колба: кофе рисует код в прямоугольнике x 884–928 над дном y 486, до y 434 (полная колба), внутри стекла', () => {
    expect(drip.svg).toContain('<path d="M878 424H936L931 487Q931 491 925 491H888Q882 491 882 487Z"');
    /* левая стенка идёт от (878, 424) к (882, 487), правая от (936, 424) к (931, 487) */
    const left = (y: number): number => 878 + ((y - 424) / 63) * 4;
    const right = (y: number): number => 936 - ((y - 424) / 63) * 5;
    expect(884).toBeGreaterThan(left(434) + 3);
    expect(928).toBeLessThan(right(434) - 3);
    expect(486 - 434).toBe(52);
    expect(BAR_TS).toContain('roundRect(884, 486 - h, 44, h, 3)');
  });
  test('деления на колбе: три штриха поверх кофе', () => {
    expect((front.svg.match(/M927 447H933M928 460H933M927 473H932/g) ?? []).length).toBe(1);
  });
});

describe('кофеварка: зазоры и зона drip', () => {
  test('зазоры ≥ 12 px до кофемашины, звонка, полки сиропов, вывески, питчера, кофемолки, доски, мата и темпера (рамки частей)', () => {
    for (const id of ['machine', 'bell', 'syrupShelf', 'grinderFront', 'corkBoard', 'tamperMat', 'tamper', 'sign']) expect(gap(ITEM, box(id)), id).toBeGreaterThanOrEqual(12);
    expect(gap(ITEM, pitcher())).toBeGreaterThanOrEqual(12);
  });
  test('питчер ×0,7 на переднем крае столешницы: 880, 530, 91 × 77, ниже носа столешницы (607) не уходит', () => {
    const p = pitcher();
    expect([p.x, p.y, Math.round(p.w), Math.round(p.h)]).toEqual([880, 530, 91, 77]);
    expect(p.y + p.h).toBeLessThanOrEqual(607.1);
    expect(BAR_TS).toContain('this.pitcher.pivot.set(940, 514)');
    expect(BAR_TS).toContain('this.pitcher.position.set(922, 595.8)');
    expect(BAR_TS).toContain('this.pitcher.scale.set(0.7)');
  });
  test('зона drip в index.html: 859, 336, 130 × 184; охватывает предмет; ZONE_POS по центру зоны', () => {
    const z = zones()['drip'] as R;
    expect(z).toEqual(ZONE);
    expect(ITEM.x >= ZONE.x && ITEM.y >= ZONE.y && ITEM.x + ITEM.w <= ZONE.x + ZONE.w && ITEM.y + ITEM.h <= ZONE.y + ZONE.h).toBe(true);
    const pos = /drip: \[(\d+), (\d+)\]/.exec(BAR);
    expect(pos?.slice(1).map(Number)).toEqual([ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h / 2]);
  });
  test('зона drip не заходит в HUD, билет (в том числе развёрнутый), тосты, коуч; соседние зоны index.html на расстоянии ≥ 12', () => {
    for (const u of SIDE_KEEP_OUT) expect(gap(ZONE, u), u.name).toBeGreaterThanOrEqual(u.name === 'коуч' ? 0 : 12);
    for (const [id, r] of Object.entries(zones())) if (id !== 'drip') expect(gap(ZONE, r), id).toBeGreaterThanOrEqual(12);
  });
  test('зоны пара и звонка сужены до зазора 12 к кофеварке; зона молока не ближе 12 к зоне звонка', () => {
    const z = zones();
    expect(z['steam']).toEqual({ x: 776, y: 296, w: 71, h: 170 });
    expect(gap(z['steam'] as R, ZONE)).toBeGreaterThanOrEqual(12);
    expect(z['bell']).toEqual({ x: 1002, y: 470, w: 60, h: 70 });
    expect(gap(z['bell'] as R, ZONE)).toBeGreaterThanOrEqual(12);
    expect(gap(z['bell'] as R, z['milk'] as R)).toBeGreaterThanOrEqual(12);
  });
  test('станция drip в центре, шаг drip идёт в зону drip, зона показывается только при eq_drip', () => {
    expect(STATIONS.find((s) => s.id === 'drip')).toMatchObject({ section: 'C', zones: ['drip'] });
    expect(TASK_ZONE['drip']).toBe('drip');
    expect(BAR).toMatch(/if \(z === 'drip'\) return !!G\.eq_drip;/);
  });
});

/* четыре комбинации покупок: нет молока и сливок / только молоко / только сливки / оба; в каждой кофеварка (куплена) ни с чем не пересекается */
describe('кофеварка: раскладка при четырёх комбинациях покупок', () => {
  const COMBOS: [string, { milk: boolean; cream: boolean; rank: number }][] = [
    ['нет молока и сливок, ранг 1', { milk: false, cream: false, rank: 1 }],
    ['только молоко, ранг 2', { milk: true, cream: false, rank: 2 }],
    ['только сливки, ранг 3', { milk: false, cream: true, rank: 3 }],
    ['молоко и сливки, ранг 5', { milk: true, cream: true, rank: 5 }]
  ];
  test.each(COMBOS)('%s: предметы и зоны кофеварки не наложены, зазоры ≥ 12', (_n, st) => {
    const vis = barItems({ milk: st.milk, cream: st.cream, rank: st.rank });
    expect(vis.pitcher).toBe(st.milk || st.cream);
    const items: Record<string, R> = { grinder: box('grinderFront'), mat: box('tamperMat'), tamper: box('tamper'), machine: box('machine'), bell: box('bell'), cork: box('corkBoard') };
    if (vis.pitcher) items['pitcher'] = pitcher();
    if (vis.syrupShelf) items['syrups'] = box('syrupShelf');
    const z = zones();
    const zs: Record<string, R> = { grind: z['grind'] as R, tamp: z['tamp'] as R, water: z['water'] as R, steam: z['steam'] as R, bell: z['bell'] as R };
    if (st.milk) { items['milk'] = box('milk'); zs['milk'] = z['milk'] as R; }
    if (vis.syrupShelf) for (const k of ['syr1', 'syr2', 'syr3']) zs[k] = z[k] as R;
    for (const [id, r] of Object.entries(items)) expect(gap(ITEM, r), `предмет «${id}»`).toBeGreaterThanOrEqual(12);
    for (const [id, r] of Object.entries(zs)) expect(gap(ZONE, r), `зона «${id}»`).toBeGreaterThanOrEqual(12);
    for (const [id, r] of Object.entries(zs)) expect(gap(ITEM, r), `предмет × зона «${id}»`).toBeGreaterThanOrEqual(12);
    if (vis.pitcher) expect(gap(pitcher(), z['steam'] as R)).toBeGreaterThanOrEqual(12);
  });
});
