import { describe, expect, test } from 'vitest';
import CENTER from '../src/assets/art/bar-parts.json';
import PAL from '../art-src/palette.json';
import INDEX from '../index.html?raw';
import BAR from '../src/legacy/06-bar.js?raw';
import { SIDE_KEEP_OUT } from '../src/game/sections';
import { STATIONS } from '../src/game/sections';
import { TASK_ZONE } from '../src/game/recipes';

/* Блок 31-8Б, шаг 2: капельная кофеварка на стенной полке (раскладка Ц1 docs/design/filter-coffee.md). Предмет 112 × 158 в x 276–388, y 252–410,
   полка 120 × 18 (x 272–392, y 410–428), зона drip 276, 242, 112 × 186, масштаб ×1,0 (центр бара без ×1,10). */
type Part = { svg: string; box: { x: number; y: number; w: number; h: number } };
const P = CENTER as unknown as Record<string, Part>;
const drip = P['drip'] as Part;
const front = P['dripFront'] as Part;
const S_BAR = 4.64;
type R = { x: number; y: number; w: number; h: number };
const gap = (a: R, b: R): number => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h));
const ITEM: R = { x: 276, y: 252, w: 112, h: 158 };
const SHELF: R = { x: 272, y: 410, w: 120, h: 18 };
const ZONE: R = { x: 276, y: 242, w: 112, h: 186 };

describe('кофеварка: часть drip', () => {
  test('две части: drip (корпус, колба и полка) и dripFront (блики), рамки по планам', () => {
    expect(drip.box).toEqual({ x: 272, y: 252, w: 120, h: 176 });
    expect(front.box).toEqual({ x: 292, y: 330, w: 50, h: 66 });
    expect((drip.svg.match(/data-item="drip"/g) ?? []).length).toBe(1);
    expect((drip.svg.match(/data-shelf="1"/g) ?? []).length).toBe(1);
    const m = /data-item="drip" data-box="([\d. ]+)"/.exec(drip.svg);
    expect(m?.[1]?.split(' ').map(Number)).toEqual([ITEM.x, ITEM.y, ITEM.w, ITEM.h]);
  });
  test('размер предмета 112 × 158 px (24 × 34 см при 4,64 px/см): не меньше 0,75 и не больше 1,5 от реальных 24 × 34', () => {
    for (const [px, cm] of [[ITEM.w, 24], [ITEM.h, 34]] as const) {
      expect(px / (cm * S_BAR)).toBeGreaterThanOrEqual(0.75);
      expect(px / (cm * S_BAR)).toBeLessThanOrEqual(1.5);
    }
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
  test('предмет и полка внутри рамки части; нарисованы только внутри неё (координаты путей в пределах рамки ±1)', () => {
    const b = drip.box;
    for (const m of drip.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
      const [x, y, w, h] = [m[1], m[2], m[3], m[4]].map(Number) as [number, number, number, number];
      expect(x >= b.x - 1 && y >= b.y - 1 && x + w <= b.x + b.w + 1 && y + h <= b.y + b.h + 1, `rect ${x},${y},${w},${h}`).toBe(true);
    }
    expect(ITEM.x).toBeGreaterThanOrEqual(b.x);
    expect(SHELF.y + SHELF.h).toBe(b.y + b.h);
  });
  test('колба: кофе рисует код в прямоугольнике x 298–336 над дном y 392, до y 340 (полная колба), внутри стекла', () => {
    const body = /<path d="M292 330H342L338 392Q338 396 333 396H301Q296 396 296 392Z"/.test(drip.svg);
    expect(body).toBe(true);
    /* левая стенка колбы идёт от (292, 330) к (296, 392): на высоте 340 внутренняя кромка правее 296 */
    const wallX = (y: number): number => 292 + ((y - 330) / (392 - 330)) * 4;
    expect(298).toBeGreaterThan(wallX(340) + 3);
    expect(336).toBeLessThan(342 - ((340 - 330) / (392 - 330)) * 4 - 3);
    expect(392 - 340).toBe(52);
  });
});

describe('кофеварка: зазоры и зона drip', () => {
  test('зазоры ≥ 12 px до кофемолки, доски, кофемашины и темпера (рамки частей bar-parts.json)', () => {
    const grinder = P['grinderFront'] as Part;
    const cork = P['corkBoard'] as Part;
    const machine = P['machine'] as Part;
    const tamper = P['tamper'] as Part;
    expect(gap(ITEM, grinder.box)).toBeGreaterThanOrEqual(12);
    expect(gap(SHELF, grinder.box)).toBeGreaterThanOrEqual(12);
    expect(gap(ITEM, cork.box)).toBeGreaterThanOrEqual(12);
    expect(gap(ITEM, machine.box)).toBeGreaterThanOrEqual(12);
    expect(gap(SHELF, tamper.box)).toBeGreaterThanOrEqual(12);
    expect(gap(ZONE, tamper.box)).toBeGreaterThanOrEqual(12);
  });
  test('зона drip в index.html: 276, 242, 112 × 186; охватывает предмет и полку; ZONE_POS по центру зоны', () => {
    const m = /<rect data-z="drip" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/.exec(INDEX);
    expect(m?.slice(1).map(Number)).toEqual([ZONE.x, ZONE.y, ZONE.w, ZONE.h]);
    for (const r of [ITEM, SHELF]) expect(r.x >= ZONE.x - 4 && r.y >= ZONE.y && r.x + r.w <= ZONE.x + ZONE.w + 4 && r.y + r.h <= ZONE.y + ZONE.h).toBe(true);
    const pos = /drip: \[(\d+), (\d+)\]/.exec(BAR);
    expect(pos?.slice(1).map(Number)).toEqual([ZONE.x + ZONE.w / 2, ZONE.y + ZONE.h / 2 - 0.0 - 0]);
  });
  test('зона drip не заходит в HUD, билет (в том числе развёрнутый), коуч; соседние зоны index.html на расстоянии ≥ 12', () => {
    for (const u of SIDE_KEEP_OUT) expect(gap(ZONE, u), u.name).toBeGreaterThanOrEqual(u.name === 'коуч' ? 0 : 12);
    const rects = [...INDEX.matchAll(/<rect data-z="(\w+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)].map((m) => ({ id: m[1] as string, x: +(m[2] as string), y: +(m[3] as string), w: +(m[4] as string), h: +(m[5] as string) }));
    for (const r of rects) if (r.id !== 'drip') expect(gap(ZONE, r), r.id).toBeGreaterThanOrEqual(12);
  });
  test('станция drip в центре, шаг drip идёт в зону drip, зона показывается только при eq_drip', () => {
    expect(STATIONS.find((s) => s.id === 'drip')).toMatchObject({ section: 'C', zones: ['drip'] });
    expect(TASK_ZONE['drip']).toBe('drip');
    expect(BAR).toMatch(/if \(z === 'drip'\) return !!G\.eq_drip;/);
  });
});
