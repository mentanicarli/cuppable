import { describe, expect, test } from 'vitest';
import MACHINE from '../art-src/bar/machine.svg?raw';
import GRIND_F from '../art-src/bar/grinder-front.svg?raw';
import GRIND_B from '../art-src/bar/grinder-back.svg?raw';
import DIAL from '../art-src/bar/dial.svg?raw';
import PFA from '../art-src/bar/pf-a.svg?raw';
import PFB from '../art-src/bar/pf-b.svg?raw';
import INDEX from '../index.html?raw';
import { geomOf, type CeramicGeom } from '../src/render/world/drinkModel';

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
  const body = rectAt(MACHINE, 456, 201);
  const panel = rectAt(MACHINE, 476, 222);
  const niche = rectAt(MACHINE, 474, 300);
  const group = rectAt(MACHINE, 584, 300);
  const tray = rectAt(MACHINE, 466, 486);
  const warmer = rectAt(MACHINE, 446, 184);
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
  const num = (x: string | undefined): number => +(x ?? 'NaN');
  const game = geomOf({ material: 'ceramic', ml: 200, k: 1 }) as CeramicGeom;
  interface Cup { cx: number; Wr: number; Wt: number; Wf: number; ryR: number; ryT: number; yR: number; yT: number; hx: number[]; hy: number[]; blk: string }
  /* разбор кусков чашек (между <!--cups--> и <!--/cups-->): обод, донышко, светлый эллипс, ручка */
  const cups = (): Cup[] =>
    MACHINE.slice(MACHINE.indexOf('<!--cups-->'), MACHINE.indexOf('<!--/cups-->')).split('<g>').slice(1).map((blk) => {
      const body = /<path d="M([\d.]+) ([\d.]+)C[^"]*A([\d.]+) ([\d.]+) 0 0 1 [\d.]+ ([\d.]+)C[^"]*A([\d.]+) ([\d.]+) 0 0 1 [\d.]+ [\d.]+Z" fill="\{\{PAPER\}\}" stroke-width="\{\{M\}\}"\/>/.exec(blk);
      const foot = /<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" fill="\{\{HILITE\}\}" stroke="\{\{KRAFT_SH\}\}"/.exec(blk);
      const hand = /<path d="(M[\d. L]*)Z" fill="\{\{PAPER\}\}" stroke-width="\{\{M\}\}"\/>/.exec(blk);
      if (!body || !foot || !hand) throw new Error('нет обода, донышка или ручки');
      const pts = [...(hand[1] as string).matchAll(/[ML]([\d.]+) ([\d.]+)/g)];
      return { cx: num(foot[1]), Wr: num(body[6]), Wt: num(body[3]), Wf: num(foot[3]), ryR: num(body[7]), ryT: num(body[4]), yR: num(body[2]), yT: num(body[5]), hx: pts.map((m) => num(m[1])), hy: pts.map((m) => num(m[2])), blk };
    });
  test('высота: верх чашек ≥ 136 (под билетом y 130), низ поддона y 508, рост к прежним 338 px не больше ×1,10', () => {
    const cs = cups();
    expect(cs).toHaveLength(3);
    const top = Math.min(...cs.map((c) => c.yT - c.ryT));
    expect(top - 1.5).toBeGreaterThanOrEqual(136); /* с контуром */
    expect(tray.y + tray.h).toBe(508);
    expect((508 - top) / 338).toBeLessThanOrEqual(1.1);
    expect(warmer.x).toBeGreaterThanOrEqual(436);
    expect(warmer.x + warmer.w).toBeLessThanOrEqual(436 + vb(MACHINE).w);
  });
  test('перевёрнутая чашка: обод на подносе самый широкий, ширина у основания / у донышка ≥ 1,3 (сужение к донышку 70–75 %), у каждой из трёх', () => {
    for (const c of cups()) {
      expect(c.Wr / c.Wt).toBeGreaterThanOrEqual(1.3);
      expect(c.Wt / c.Wr).toBeGreaterThanOrEqual(0.7);
      expect(c.Wt / c.Wr).toBeLessThanOrEqual(0.75);
      expect(c.Wr).toBeGreaterThan(c.Wf);
      expect(c.yT).toBeLessThan(c.yR); /* донышко выше обода */
      expect(c.yR + c.ryR).toBeCloseTo(185, 0); /* линия обода лежит на подносе */
    }
  });
  test('донышко: плоский светлый эллипс 55–60 % ширины обода с тонким кольцом (контур D), нет цвета «внутренности» (тёмного тона), нет тёмной полости и цветных полосок; один цвет керамики у всех', () => {
    for (const c of cups()) {
      expect(c.Wf / c.Wr).toBeGreaterThanOrEqual(0.55);
      expect(c.Wf / c.Wr).toBeLessThanOrEqual(0.6);
      expect(c.Wf).toBeLessThan(c.Wt); /* эллипс уже донышка тела */
      for (const bad of ['CER_IN', 'DARK', 'TERRA', 'DUSTY', 'MUSTARD', 'CHOC']) expect(c.blk.includes(bad)).toBe(false);
      expect(c.blk.split('fill="{{PAPER}}"').length - 1).toBe(2); /* тело и ручка */
      expect(c.blk).toContain('fill="{{KRAFT_SH}}" stroke="none"'); /* тень справа */
    }
  });
  test('ручка справа: верхний крепёж у донышка (≈ 1/4 высоты стенки от верха), нижний на ≈ 2/3, петля наружу правее обода', () => {
    for (const c of cups()) {
      const B = c.yR - c.yT;
      const upper = (c.hy[0] as number) - c.yT;
      expect(upper / B).toBeGreaterThan(0.15);
      expect(upper / B).toBeLessThan(0.4); /* точка контура со смещением на полутолщину ручки */
      const ys = c.hy.filter((_, i) => i < c.hy.length / 2);
      expect(Math.max(...ys) - c.yT).toBeGreaterThan(0.55 * B);
      expect(Math.max(...c.hx)).toBeGreaterThan(c.cx + c.Wr);
      expect(Math.min(...c.hx)).toBeGreaterThan(c.cx);
    }
  });
  test('контуры не прежние (29-1в: зеркало игровой геометрии, донышко шириной Wb/W = 0,78): сужение 0,72 и узкий эллипс донышка', () => {
    for (const c of cups()) {
      expect(Math.abs(c.Wt / c.Wr - game.Wb / game.W)).toBeGreaterThan(0.04);
      expect(Math.abs(c.Wf / c.Wr - game.Wb / game.W)).toBeGreaterThan(0.15);
      expect(c.Wr / game.W).toBeGreaterThan(0.3); /* масштаб игровой керамики 0,2 л (0,50 / 0,425 / 0,36) */
    }
  });
  test('размеры чашек: высота 45 / 39 / 33 px = 9,7 / 8,4 / 7,1 см, ширина по ободу 55 / 47 / 40 px; не больше ×1,5 от реальных 9 см; зазор между ручкой и соседней чашкой ≥ 6 px видимых (с контурами 9)', () => {
    const cs = cups();
    const hs = cs.map((c) => c.yR + c.ryR - (c.yT - c.ryT));
    expect(hs.map(Math.round)).toEqual([45, 39, 33]);
    expect(cs.map((c) => Math.round(2 * c.Wr))).toEqual([55, 47, 40]);
    for (const h of hs) expect(h / 4.64).toBeLessThanOrEqual(9 * 1.5);
    for (let i = 1; i < cs.length; i++) {
      const prev = cs[i - 1] as Cup;
      const cur = cs[i] as Cup;
      expect(cur.cx - cur.Wr - Math.max(...prev.hx)).toBeGreaterThanOrEqual(9);
    }
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
    expect(PFA).toContain('M-6 17H6V22Q6 24 4 24H-4Q-6 24 -6 22Z');
    expect(630 - 6).toBeLessThanOrEqual(627);
    expect(630 + 6).toBeGreaterThanOrEqual(633);
    expect(24).toBeLessThanOrEqual(-20 + 46);
  });
  test('голова: широкая корзина 58 px (12,5 см), овал обода с внутренней кромкой, ушки байонета по бокам, юбка уже обода', () => {
    expect(PFA).toContain('<ellipse cx="0" cy="-12" rx="29" ry="5.5"');
    expect(PFA).toContain('<ellipse cx="0" cy="-11.6" rx="24.5" ry="4"');
    expect((PFA.match(/<rect x="-33" y="-14.5" width="4"/g) ?? []).length + (PFA.match(/<rect x="29" y="-14.5" width="4"/g) ?? []).length).toBe(2); /* маленькие выступы вровень с ободом */
    expect(PFA).toContain('M-29 -12V9Q-29 17 -21 17H21Q29 17 29 9V-12Z'); /* цилиндр со скруглённым низом */
    expect(PFA).toContain('<rect x="28" y="-2" width="8" height="14"'); /* стальной воротник у шейки */
    expect(58 / 4.64).toBeGreaterThan(11);
    expect(58 / 4.64).toBeLessThan(14);
  });
  test('голова: отношение высоты (верх обода … низ корзины) к ширине около 0,6', () => {
    const h = 17 - (-12 - 5.5);
    expect(h / 58).toBeGreaterThanOrEqual(0.55);
    expect(h / 58).toBeLessThanOrEqual(0.65);
  });
  test('ручка: тёмно-коричневая (CHOC), конусная, 86 px дерева = 18,5 см (18–20 см), с шейкой 102 px = 1,76 ширины головы, угол 12°, толще у головы (13 px) и тоньше к концу (8 px); целиком в рамке', () => {
    expect(PFB).toContain('fill="{{CHOC}}"');
    expect(PFB).toContain('M50 -2.5L128 0Q136 0 136 4Q136 8 128 8L50 10.5Z');
    const wood = 136 - 50;
    expect(wood / 4.64).toBeGreaterThanOrEqual(18);
    expect(wood / 4.64).toBeLessThanOrEqual(20);
    expect((136 - 34) / 58).toBeGreaterThanOrEqual(1.7 - 0.05);
    expect(PFB).toContain('rotate(12 34 4)');
    expect(13).toBeGreaterThan(8); /* у головы толще (50: −2,5…10,5), к концу тоньше (128: 0…8) */
    const a = (12 * Math.PI) / 180;
    const endX = 34 + (136 - 34) * Math.cos(a) + 4 * Math.sin(a);
    expect(endX).toBeLessThanOrEqual(138);
    const endY = 4 + (136 - 34) * Math.sin(a) + 4 * Math.cos(a);
    expect(endY).toBeLessThanOrEqual(36);
  });
  test('нет подписей, градиентов и url(#)', () => {
    for (const s of [PFA, PFB]) for (const bad of ['<text', 'linearGradient', 'url(#']) expect(s.includes(bad)).toBe(false);
  });
});
