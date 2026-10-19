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
  const cupBlocks = (): string[] => {
    const inner = MACHINE.slice(MACHINE.indexOf('<!--cups-->'), MACHINE.indexOf('<!--/cups-->'));
    return inner.split('<g>').slice(1);
  };
  const game = geomOf({ material: 'ceramic', ml: 200, k: 1 }) as CeramicGeom;
  const num = (x: string | undefined): number => +(x ?? 'NaN');
  /* на каждую чашку: s (масштаб от игровой керамики 0,2 л в px), центр, обод */
  const cups = (): { s: number; cx: number; rimY: number; baseY: number; baseRy: number; baseRx: number; blk: string }[] =>
    cupBlocks().map((blk) => {
      const arc = /A([\d.]+) ([\d.]+) 0 0 1 ([\d.]+) ([\d.]+)Z/.exec(blk);
      const base = /<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)" fill="\{\{PAPER\}\}" stroke="none"\/>/.exec(blk);
      if (!arc || !base) throw new Error('нет обода или донца');
      return { s: num(arc[1]) / game.W, cx: num(base[1]), rimY: num(arc[4]), baseY: num(base[2]), baseRy: num(base[4]), baseRx: num(base[3]), blk };
    });
  test('высота: верх чашек ≥ 136 (под билетом y 130), низ поддона y 508, рост к прежним 338 px не больше ×1,10', () => {
    const cs = cups();
    expect(cs).toHaveLength(3);
    const top = Math.min(...cs.map((c) => c.baseY - c.baseRy));
    expect(top - 1.5).toBeGreaterThanOrEqual(136); /* с контуром */
    expect(tray.y + tray.h).toBe(508);
    expect((508 - top) / 338).toBeLessThanOrEqual(1.1);
    expect(warmer.x).toBeGreaterThanOrEqual(436);
    expect(warmer.x + warmer.w).toBeLessThanOrEqual(436 + vb(MACHINE).w);
  });
  test('чашки подогрева = игровая керамика (geomOf, k = 1), перевёрнутая: пропорции, состав деталей, ручка справа, один цвет; допуск 1 %', () => {
    const cs = cups();
    expect(cs.map((c) => c.s)).toEqual([...cs.map((c) => c.s)].sort((p, q) => q - p)); /* большая, средняя, маленькая */
    for (const c of cs) {
      const W = game.W * c.s;
      /* обод: полуоси как у игровой (отношение ryR / W) */
      const arc = /A([\d.]+) ([\d.]+) 0 0 1/.exec(c.blk) as RegExpExecArray;
      expect(num(arc[2]) / num(arc[1])).toBeCloseTo(game.ryR / game.W, 2);
      /* донце: ширина Wb игровой, высота корпуса (обод → донце) в тех же отношениях */
      const baseRx = c.baseRx;
      expect(Math.abs(baseRx / W - game.Wb / game.W)).toBeLessThan(0.01);
      expect(Math.abs((c.rimY - c.baseY) / (2 * W) - (game.H + game.yb) / (2 * game.W))).toBeLessThan(0.01);
      /* перевёрнутость: донце выше обода, обод внизу сидит на подносе (низ дуги на 1 px ниже верха подноса) */
      expect(c.baseY).toBeLessThan(c.rimY);
      expect(c.rimY + num(arc[2])).toBeCloseTo(185, 0);
      /* ручка справа: самая правая точка многоугольника правее обода, левее обода ничего лишнего */
      const poly = /<path d="(M[^"]*L[^"]*)Z" fill="\{\{PAPER\}\}" stroke-width="\{\{M\}\}"\/>/.exec(c.blk) as RegExpExecArray;
      const xs = [...(poly[1] as string).matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => num(m[1]));
      expect(Math.max(...xs)).toBeGreaterThan(c.cx + W);
      expect(Math.min(...xs)).toBeGreaterThan(c.cx);
      /* состав: ручка, корпус, тень (KRAFT_SH), донце, блик; цвета керамики одинаковые у всех, без полосок и жидкости */
      expect(c.blk.split('fill="{{PAPER}}"').length - 1).toBe(3);
      expect(c.blk).toContain('fill="{{KRAFT_SH}}"');
      for (const bad of ['DUSTY', 'MUSTARD', 'TERRA', 'CER_IN']) expect(c.blk.includes(bad)).toBe(false);
    }
  });
  test('перевёрнутая чашка: ширина у подноса (обод) строго больше ширины у донышка; донце уже тела; внутри донца узкий светлый эллипс с кольцом; входа (тёмной полости) нет; ручка у нижнего края выше всего ниже донца', () => {
    for (const c of cups()) {
      const rimW = (/A([\d.]+) ([\d.]+) 0 0 1 [\d.]+ [\d.]+Z/.exec(c.blk) as RegExpExecArray)[1];
      expect(num(rimW)).toBeGreaterThan(c.baseRx); /* основание шире донышка */
      const foot = /<ellipse cx="[\d.]+" cy="[\d.]+" rx="([\d.]+)" ry="([\d.]+)" fill="\{\{HILITE\}\}" stroke="\{\{KRAFT_SH\}\}"/.exec(c.blk);
      expect(foot).not.toBeNull();
      expect(num((foot as RegExpExecArray)[1])).toBeLessThan(c.baseRx); /* светлый эллипс уже донца, донце уже тела */
      expect(c.baseRx).toBeLessThan(num(rimW));
      expect(c.blk).not.toContain('CER_IN');
      expect(c.blk).not.toContain('{{DARK}}');
    }
  });
  test('размеры чашек: высота 45 / 39 / 33 px = 9,8 / 8,3 / 7,1 см, ширина 55 / 47 / 40 px; не больше ×1,5 от реальных 9 см, зазор между ручкой и соседней чашкой ≥ 6 px', () => {
    const cs = cups();
    const hs = cs.map((c) => c.rimY + game.ryR * c.s - (c.baseY - c.baseRy));
    expect(hs.map(Math.round)).toEqual([45, 39, 33]);
    for (const h of hs) expect(h / 4.64).toBeLessThanOrEqual(9 * 1.5);
    expect(Math.round(cs.map((c) => 2 * game.W * c.s)[0] as number)).toBe(55);
    const edges = cs.map((c) => {
      const poly = /<path d="(M[^"]*L[^"]*)Z" fill="\{\{PAPER\}\}" stroke-width="\{\{M\}\}"\/>/.exec(c.blk) as RegExpExecArray;
      const xs = [...(poly[1] as string).matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => num(m[1]));
      return { l: c.cx - game.W * c.s, r: Math.max(...xs) };
    });
    for (let i = 1; i < edges.length; i++) expect((edges[i] as { l: number }).l - (edges[i - 1] as { r: number }).r).toBeGreaterThanOrEqual(9); /* 6 px видимого зазора + контуры 3 px */
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
    expect(PFA).toContain('<ellipse cx="0" cy="-12" rx="29" ry="5.5"');
    expect(PFA).toContain('<ellipse cx="0" cy="-11.6" rx="24.5" ry="4"');
    expect((PFA.match(/<rect x="-38" y="-15" width="9"/g) ?? []).length + (PFA.match(/<rect x="29" y="-15" width="9"/g) ?? []).length).toBe(2);
    expect(58 / 4.64).toBeGreaterThan(11);
    expect(58 / 4.64).toBeLessThan(14);
  });
  test('голова: отношение высоты (верх обода … низ пояска) к ширине около 0,6', () => {
    const h = 16 - (-12 - 5.5);
    expect(h / 58).toBeGreaterThanOrEqual(0.55);
    expect(h / 58).toBeLessThanOrEqual(0.65);
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
