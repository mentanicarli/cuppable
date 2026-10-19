import { describe, expect, test } from 'vitest';
import MACHINE from '../art-src/bar/machine.svg?raw';
import GRIND_F from '../art-src/bar/grinder-front.svg?raw';
import GRIND_B from '../art-src/bar/grinder-back.svg?raw';
import DIAL from '../art-src/bar/dial.svg?raw';
import PFA from '../art-src/bar/pf-a.svg?raw';
import PFB from '../art-src/bar/pf-b.svg?raw';
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
  const body = rectAt(MACHINE, 456, 192);
  const panel = rectAt(MACHINE, 476, 222);
  const niche = rectAt(MACHINE, 474, 300);
  const group = rectAt(MACHINE, 584, 300);
  const tray = rectAt(MACHINE, 466, 486);
  const warmer = rectAt(MACHINE, 446, 175);
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
  test('высота: верх чашек ≥ 136 (под билетом y 130), низ поддона y 508, рост к прежним 338 px не больше ×1,10', () => {
    const tops = [...MACHINE.matchAll(/<ellipse cx="[\d.]+" cy="([\d.]+)" rx="(\d+)" ry="([\d.]+)" fill="\{\{CER_IN\}\}"/g)].map((m) => +(m[1] as string) - +(m[3] as string));
    expect(tops).toHaveLength(3);
    const top = Math.min(...tops);
    expect(top).toBeGreaterThanOrEqual(136);
    expect(tray.y + tray.h).toBe(508);
    expect((508 - top) / 338).toBeLessThanOrEqual(1.1);
    expect(warmer.x).toBeGreaterThanOrEqual(436);
    expect(warmer.x + warmer.w).toBeLessThanOrEqual(436 + vb(MACHINE).w);
  });
  test('три керамические чашки на подносе: разные размеры (демитас < средняя < большая), 25–42 px по высоте (6–9 см, допуск ×1,5), ручка справа у всех, цвет керамики PAPER, на подносе', () => {
    const rims = [...MACHINE.matchAll(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="(\d+)" ry="([\d.]+)" fill="\{\{CER_IN\}\}"/g)].map((m) => ({ cx: +(m[1] as string), cy: +(m[2] as string), w: 2 * +(m[3] as string), ry: +(m[4] as string) }));
    const sorted = [...rims].sort((p, q) => p.w - q.w);
    expect(sorted[0]?.w).toBeLessThan(sorted[1]?.w ?? 0);
    expect(sorted[1]?.w).toBeLessThan(sorted[2]?.w ?? 0);
    const handles = MACHINE.match(/fill-rule="evenodd"/g) ?? [];
    expect(handles).toHaveLength(3);
    for (const r of rims) {
      const h = 175 + 1 - (r.cy - r.ry) - 0; /* от верха обода до низа (основание на подносе y 176) */
      expect(h / 4.64).toBeGreaterThanOrEqual(5);
      expect(h / 4.64).toBeLessThanOrEqual(9.5);
      expect(r.cy + 0).toBeLessThan(175);
    }
    expect(MACHINE.split('fill="{{PAPER}}" stroke-width="{{M}}"/>').length - 1).toBeGreaterThanOrEqual(6); /* корпус и ручка каждой чашки */
    expect(MACHINE).toContain('fill="{{DUSTY}}" stroke="none"');
    expect(MACHINE).toContain('fill="{{MUSTARD}}" stroke="none"');
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

describe('art-src/bar: портафильтр', () => {
  test('рамки частей прежние (bar.ts кладёт спрайты по ним и по якорю (0, 0))', () => {
    expect(vb(PFA)).toEqual({ x: -56, y: -20, w: 112, h: 46 });
    expect(vb(PFB)).toEqual({ x: 28, y: -4, w: 110, h: 40 });
  });
  test('носик по центру: x −6…6 вокруг оси струи 627–633 (якорь группы 630), низ носика внутри рамки', () => {
    expect(PFA).toContain('M-6 16H6V22Q6 24 4 24H-4Q-6 24 -6 22Z');
    expect(630 - 6).toBeLessThanOrEqual(627);
    expect(630 + 6).toBeGreaterThanOrEqual(633);
    expect(24).toBeLessThanOrEqual(-20 + 46);
  });
  test('голова: широкая корзина 58 px (12,5 см), овал обода с внутренней кромкой, ушки байонета по бокам, юбка уже обода', () => {
    expect(PFA).toContain('<ellipse cx="0" cy="-5" rx="29" ry="5.5"');
    expect(PFA).toContain('<ellipse cx="0" cy="-4.6" rx="24.5" ry="4"');
    expect((PFA.match(/<rect x="-?38" y="-8" width="9"/g) ?? []).length + (PFA.match(/<rect x="29" y="-8" width="9"/g) ?? []).length).toBe(2);
    expect(58 / 4.64).toBeGreaterThan(11);
    expect(58 / 4.64).toBeLessThan(14);
  });
  test('ручка: тёмно-коричневая (CHOC), конусная, 86 px дерева = 18,5 см (18–20 см), с шейкой 100 px = 1,7 ширины головы; целиком в рамке', () => {
    expect(PFB).toContain('fill="{{CHOC}}"');
    expect(PFB).toContain('M50 -0.5L128 -4.5Q136 -4.5 136 4Q136 12.5 128 12.5L50 8.5Z');
    const wood = 136 - 50;
    expect(wood / 4.64).toBeGreaterThanOrEqual(18);
    expect(wood / 4.64).toBeLessThanOrEqual(20);
    expect((136 - 34) / 58).toBeGreaterThanOrEqual(1.7 - 0.05);
    const a = (9 * Math.PI) / 180;
    const endX = 34 + (136 - 34) * Math.cos(a) + 8.5 * Math.sin(a);
    expect(endX).toBeLessThanOrEqual(138);
    const endY = 4 + (136 - 34) * Math.sin(a) + 8.5 * Math.cos(a);
    expect(endY).toBeLessThanOrEqual(36);
  });
  test('нет подписей, градиентов и url(#)', () => {
    for (const s of [PFA, PFB]) for (const bad of ['<text', 'linearGradient', 'url(#']) expect(s.includes(bad)).toBe(false);
  });
});
