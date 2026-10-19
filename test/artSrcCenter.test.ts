import { describe, expect, test } from 'vitest';
import MACHINE from '../art-src/bar/machine.svg?raw';
import GRIND_F from '../art-src/bar/grinder-front.svg?raw';
import GRIND_B from '../art-src/bar/grinder-back.svg?raw';
import DIAL from '../art-src/bar/dial.svg?raw';
import INDEX from '../index.html?raw';

/* Блок 29-1 (центр бара): кофемашина и кофемолка в языке эталона. Проверяется, что новая геометрия не уехала от зон и подвижных деталей (якоря в bar.ts и legacy: pf (630,350), чашка (630,478), стрелка (630,257), стоп (740,257), ручка помола (160,332), пф у кофемолки (160,440)). */
type R = { x: number; y: number; w: number; h: number };
const vb = (s: string): R => {
  const m = /viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/.exec(s);
  if (!m) throw new Error('нет viewBox');
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const rectAt = (s: string, x: number, y: number): R => {
  const m = new RegExp(`<rect x="${x}" y="${y}" width="([\\d.]+)" height="([\\d.]+)"`).exec(s);
  if (!m) throw new Error(`нет rect ${x},${y}`);
  return { x, y, w: +(m[1] as string), h: +(m[2] as string) };
};
const circleAt = (s: string, cx: number, cy: number): number => {
  const m = new RegExp(`<circle cx="${cx}" cy="${cy}" r="([\\d.]+)"`).exec(s);
  if (!m) throw new Error(`нет circle ${cx},${cy}`);
  return +(m[1] as string);
};
const zone = (name: string): R => {
  const m = new RegExp(`<rect data-z="${name}" x="(\\d+)" y="(\\d+)" width="(\\d+)" height="(\\d+)"`).exec(INDEX);
  if (!m) throw new Error('нет зоны ' + name);
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const inside = (a: R, b: R): boolean => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const pt = (x: number, y: number, r: R): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

describe('art-src/bar: кофемашина', () => {
  const body = rectAt(MACHINE, 456, 186);
  const panel = rectAt(MACHINE, 476, 222);
  const niche = rectAt(MACHINE, 474, 300);
  const group = rectAt(MACHINE, 584, 300);
  const tray = rectAt(MACHINE, 466, 486);
  const warmer = rectAt(MACHINE, 446, 158);
  test('корпус 348 px = 75 см (шкала 4,64), панель и ниша внутри корпуса, группа внутри ниши', () => {
    expect(body.w).toBe(348);
    expect(inside(panel, body)).toBe(true);
    expect(inside(niche, body)).toBe(true);
    expect(inside(group, niche)).toBe(true);
  });
  test('органы управления на своих местах: манометр = ось стрелки, стоп внутри зоны stop, ручка пара в панели', () => {
    expect(circleAt(MACHINE, 630, 257)).toBe(27);
    const stop = zone('stop');
    const r = circleAt(MACHINE, 740, 257);
    expect(pt(740 - r, 257 - r, stop) && pt(740 + r, 257 + r, stop)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(10);
    expect(inside({ x: 520 - 21, y: 257 - 21, w: 42, h: 42 }, panel)).toBe(true);
  });
  test('группа над точкой портафильтра (630, 350) и чашкой (630, 478): ниша достаточно высока для чашки 0,6 л (верх обода y ≈ 385)', () => {
    expect(group.x + group.w / 2).toBe(630);
    expect(pt(630, 350, { x: group.x, y: group.y, w: group.w, h: 70 })).toBe(true);
    expect(niche.y + niche.h).toBeGreaterThanOrEqual(478);
    expect(niche.y).toBeLessThan(385);
    expect(tray.y).toBeGreaterThanOrEqual(486);
  });
  test('высота: верх не выше нижнего края билета с зазором (y ≥ 136), низ поддона y 508, рост к прежним 338 px не больше ×1,10', () => {
    const top = 138; /* верх чашек подогрева */
    expect(MACHINE).toContain('M482 160L484 140Q484 138');
    expect(top).toBeGreaterThanOrEqual(136);
    expect(tray.y + tray.h).toBe(508);
    expect((508 - top) / 338).toBeLessThanOrEqual(1.1);
    expect(warmer.x).toBeGreaterThanOrEqual(436);
    expect(warmer.x + warmer.w).toBeLessThanOrEqual(436 + vb(MACHINE).w);
  });
  test('паровая трубка кончается в (832, 450), кран воды внутри зоны water', () => {
    expect(MACHINE).toContain('V450H827');
    expect(MACHINE).toContain('H837V450');
    expect(MACHINE).toContain('M489 300H499');
    const w = zone('water');
    expect(pt(489, 300, w) && pt(526, 345, w)).toBe(true);
    const s = zone('steam');
    expect(pt(791, 300, s) && pt(837, 450, s)).toBe(true);
  });
  test('в исходнике нет подписей, градиентов и url(#): плоские заливки палитры', () => {
    expect(MACHINE).not.toMatch(/<text\b|linearGradient|url\(#/);
  });
});

describe('art-src/bar: кофемолка', () => {
  const body = { x: 96, y: 262, w: 128, h: 194 }; /* translate(160 470): x −64…64, y −208…−14 */
  test('части на прежних рамках (box не менялся): bar.ts кладёт спрайты по ним', () => {
    expect(vb(GRIND_B)).toEqual({ x: 60, y: 140, w: 200, h: 350 });
    expect(vb(GRIND_F)).toEqual({ x: 60, y: 120, w: 200, h: 370 });
    expect(vb(DIAL)).toEqual({ x: 136, y: 308, w: 48, h: 48 });
  });
  test('воронка — прежняя трапеция, по которой bar.ts маскирует зерно', () => {
    expect(GRIND_B).toContain('M-52 -208L-72 -312H72L52 -208Z');
    expect(GRIND_F).toContain('M-52 -208L-72 -312H72L52 -208Z');
  });
  test('зона grind накрывает корпус, ручку помола (160, 332) и нишу портафильтра (160, 440)', () => {
    const z = zone('grind');
    expect(inside(body, z)).toBe(true);
    expect(pt(160, 332, z) && pt(160, 440, z)).toBe(true);
    expect(DIAL).toContain('translate(0 -138)');
  });
  test('ниша под портафильтр у кофемолки: портафильтр (160, 440, корзина y 430…458) стоит внутри ниши y 396…456, выдача над ним', () => {
    const niche = { x: 160 - 40, y: 470 - 74, w: 80, h: 60 };
    expect(GRIND_F).toContain('<rect x="-40" y="-74" width="80" height="60"');
    expect(pt(160, 430, niche)).toBe(true);
    expect(GRIND_F).toContain('<rect x="-14" y="-110" width="28" height="36"');
    expect(470 - 110 + 36).toBeGreaterThan(niche.y - 1); /* выдача входит в нишу сверху */
  });
  test('нет подписей, градиентов и url(#)', () => {
    for (const s of [GRIND_B, GRIND_F, DIAL]) expect(s).not.toMatch(/<text\b|linearGradient|url\(#/);
  });
});
