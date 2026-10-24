import { describe, expect, test } from 'vitest';
import PARTS from '../src/assets/art/bar-parts.json';
import PAL from '../art-src/palette.json';
import TAMPER from '../art-src/bar/tamper.svg?raw';
import MAT from '../art-src/bar/tamper-mat.svg?raw';
import BELL from '../art-src/bar/bell.svg?raw';
import MILK from '../art-src/bar/milk.svg?raw';
import STEAM from '../art-src/bar/steam.svg?raw';
import BAR from '../src/render/world/bar.ts?raw';
import INDEX from '../index.html?raw';
import { specOf } from '../src/game/drinkModel';

/* Блок 29-2 (столешница): темпер и мат, питчер, звонок, холодильник молока, пар. Тесты разбирают числа формы по исходникам и по собранной части в bar-parts.json (число групп, остатки старых версий). */
type Box = { x: number; y: number; w: number; h: number };
const parts = PARTS as unknown as Record<string, { svg: string; box: Box; texts: { t: string }[] }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const vb = (s: string): Box => {
  const m = /viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/.exec(s);
  if (!m) throw new Error('нет viewBox');
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const zone = (name: string): Box => {
  const m = new RegExp(`<rect data-z="${name}" x="(\\d+)" y="(\\d+)" width="(\\d+)" height="(\\d+)"`).exec(INDEX);
  if (!m) throw new Error('нет зоны ' + name);
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const inside = (a: Box, b: Box): boolean => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const S = 4.64;

describe('29-2: собранные части без остатков старых версий', () => {
  test('число групп и маркеров в bar-parts.json точное (каждый предмет нарисован один раз)', () => {
    expect(count(svgOf('pitBack'), '<g transform=')).toBe(1);
    expect(count(svgOf('pitFront'), '<g transform=')).toBe(1);
    expect(count(svgOf('bell'), '<g transform=')).toBe(1);
    expect(count(svgOf('milk'), '<g transform=')).toBe(1); /* холодильник; край полки сиропов — вторая группа без transform (29-3) */
    expect(count(svgOf('milk'), '<g>')).toBe(1);
    expect(count(svgOf('tamper'), '<rect x="310" y="494"')).toBe(1);
    expect(count(svgOf('tamperMat'), '<ellipse cx="330" cy="510" rx="64"')).toBe(1);
    expect(count(svgOf('steam'), '<path d="M')).toBe(3);
    for (const id of ['pitBack', 'pitFront', 'bell', 'milk', 'tamper', 'tamperMat', 'steam']) expect(count(svgOf(id), '<g stroke=')).toBe(1);
  });
  test('в static нет мата (и его эллипсов), в bar.ts нет старой Graphics-версии питчера раф', () => {
    const st = svgOf('static');
    expect(st.includes('translate(330 506)')).toBe(false);
    expect(st.includes('fill="#6B4C3D"')).toBe(false);
    expect(BAR.includes('pb.poly(')).toBe(false);
    expect(BAR).toContain("rel('pitBack')");
    expect(BAR).toContain("rel('pitFront')");
  });
  test('части без цветов вне палитры (исключение: заливка края полки url(#gWoodFront) до блока 29-3)', () => {
    const allowed = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
    for (const id of ['pitBack', 'pitFront', 'bell', 'milk', 'tamper', 'tamperMat', 'steam']) {
      const svg = svgOf(id);
      for (const m of svg.matchAll(/#[0-9a-fA-F]{6}/g)) expect(allowed.has(m[0].toLowerCase()), `${id} ${m[0]}`).toBe(true);
      expect(svg.includes('linearGradient')).toBe(false);
      const grads = [...svg.matchAll(/url\(#(\w+)\)/g)].map((m) => m[1]);
      expect(grads.filter((g) => g !== 'gWoodFront')).toEqual([]);
    }
  });
});

describe('29-2: темпер и мат', () => {
  test('темпер: высота ≤ 77, ширина ≤ 42 по плану; ручка-груша 33 × 28 px на шейке 12 px, основание 40 px; рамка части, тёмная ручка', () => {
    expect(vb(TAMPER)).toEqual({ x: 306, y: 440, w: 48, h: 72 });
    const top = 458;
    expect(top).toBeGreaterThan(470 - 17.5); /* груша ниже верха обода портафильтра на мате (452,5): не торчит над головой */
    expect(508 - top).toBeLessThanOrEqual(77);
    expect(TAMPER).toContain('<rect x="310" y="494" width="40" height="14"');
    expect(40).toBeLessThanOrEqual(42);
    expect(TAMPER).toContain('<rect x="324" y="484" width="12" height="12"');
    expect(TAMPER).toContain('M323 486C314 484.6 311 475.2 314 468C317 461.4 323 458 330 458C337 458 343 461.4 346 468C349 475.2 346 484.6 337 486Z');
    expect(346 - 314).toBeGreaterThan(12);
    expect(346 - 314).toBeLessThan(40); /* груша уже основания: у настоящего темпера диск 58 мм шире ручки */
    expect(TAMPER).toContain('fill="{{DARK}}"');
  });
  test('мат: рамка 266–394 (эллипс rx 64), центр (330, 510), толщина 4 px; верх мата под основанием темпера (508), мат в зоне tamp по x', () => {
    expect(vb(MAT)).toEqual({ x: 262, y: 492, w: 136, h: 44 });
    expect(MAT).toContain('<ellipse cx="330" cy="510" rx="64" ry="11"');
    expect(MAT).toContain('M266 510V514A64 11 0 0 0 394 514V510Z');
    const tamp = zone('tamp');
    expect(tamp.x).toBeLessThanOrEqual(266);
    expect(tamp.x + tamp.w).toBeGreaterThanOrEqual(394);
  });
});

describe('29-2: звонок', () => {
  test('купол шире кнопки, подставка 54 ≤ 56, высота 46 ≤ 48, якорь масштаба (1032, 526), рамка внутри зоны bell', () => {
    expect(BELL).toContain('translate(1032 526)');
    expect(BELL).toContain('<ellipse cx="0" cy="1" rx="27" ry="6"');
    expect(BELL).toContain('M-22 -4Q-22 -32 0 -32Q22 -32 22 -4Z');
    expect(BELL).toContain('<circle cx="0" cy="-41" r="4.5"');
    expect(44).toBeGreaterThan(9 * 3);
    expect(54).toBeLessThanOrEqual(56);
    expect(-41 - 4.5 - -32 + 41 + 4.5).toBeGreaterThan(0);
    expect(32 + 9 + 5).toBeLessThanOrEqual(48); /* купол 32 над осью, кнопка с шейкой +9, подставка +5 снизу */
    expect(vb(BELL)).toEqual({ x: 1002, y: 474, w: 60, h: 60 });
    expect(inside(vb(BELL), zone('bell'))).toBe(true);
  });
});

describe('29-2: холодильник молока', () => {
  test('корпус 190 × 262 = 41 × 56 см, зона milk совпадает, дверца с рамкой, два пакета, ручка справа, ножки; подпись «молоко» Pixi-текстом', () => {
    expect(MILK).toContain('translate(1066 244)');
    expect(MILK).toContain('<rect width="190" height="262" rx="16"');
    expect(190 / S).toBeCloseTo(41, 0);
    expect(262 / S).toBeCloseTo(56.5, 0);
    expect(vb(MILK)).toEqual({ x: 1058, y: 236, w: 206, h: 278 });
    expect(inside({ x: 1066, y: 244, w: 190, h: 262 }, vb(MILK))).toBe(true);
    const z = zone('milk');
    /* 31-8В: левый край зоны отступает от корпуса на 8 px (1074 вместо 1066), чтобы между зоной звонка (до 1062) и зоной молока было 12 px; правый край и верх прежние */
    expect(z.x).toBe(1074);
    expect(z.x + z.w).toBe(1256);
    expect(z.y).toBe(244);
    expect(1074 - (1002 + 60)).toBeGreaterThanOrEqual(12);
    expect(count(MILK, "V74L40 58H74L90 74V140Z") + count(MILK, "V74L112 58H138L152 74V140Z")).toBe(2);
    expect(MILK).toContain('<rect x="166" y="96" width="9" height="64"');
    expect(166).toBeGreaterThan(95);
    expect(MILK).toContain('<rect x="10" y="10" width="170" height="242" rx="10"');
    expect(count(MILK, 'height="6" rx="2" fill="{{DARK}}"')).toBe(2);
    const tx = (parts.milk as unknown as { texts: { t: string; x: number; y: number; size: number; tl?: number | null }[] }).texts;
    expect(tx.map((t) => t.t)).toEqual(['молоко']);
    const label = /<rect x="(\d+)" y="90" width="(\d+)" height="30" rx="5" fill="\{\{PINK\}\}"/.exec(MILK);
    expect(label).not.toBeNull();
    const lw = +((label as RegExpExecArray)[2] as string);
    const word = tx[0] as { t: string; x: number; size: number; tl?: number | null };
    expect(word.size).toBeGreaterThanOrEqual(12); /* было 9,5 */
    expect(word.tl ?? null).toBeNull(); /* без сжатия по ширине */
    const wordW = word.t.length * word.size * 0.62; /* оценка ширины Nunito 800: 0,62 кегля на букву */
    expect(wordW).toBeLessThanOrEqual(lw - 8); /* поля слева и справа ≥ 4 px */
    expect(word.x).toBe(1066 + +((label as RegExpExecArray)[1] as string) + lw / 2); /* центр слова в центре таблички */
    expect(MILK).toContain('V74L112 58H138L152 74V140Z');
  });
});

describe('29-2: пар', () => {
  test('спрайт пара виден (нет opacity 0), три завитка PAPER у кончика трубки (832, 450), рамка 820–880 × 390–460 прежняя', () => {
    expect(vb(STEAM)).toEqual({ x: 820, y: 390, w: 60, h: 70 });
    const svg = svgOf('steam');
    expect(svg.includes('opacity="0"')).toBe(false);
    expect(count(svg, 'fill="#FFF8EC"')).toBe(3);
    const starts = [...svg.matchAll(/<path d="M(\d+) (\d+)/g)].map((m) => ({ x: +(m[1] as string), y: +(m[2] as string) }));
    expect(starts).toHaveLength(3);
    for (const s of starts) {
      expect(s.y).toBeGreaterThanOrEqual(428);
      expect(s.y).toBeLessThanOrEqual(450);
      expect(s.x).toBeGreaterThanOrEqual(826);
    }
    expect(BAR).toContain('this.steam.alpha += ((f.steam ? 0.9 : 0) - this.steam.alpha) * 0.4');
  });
  test('31-9: пар не заходит на кофеварку: все точки контуров завитков левее x 848 (до кофеварки 859 зазор ≥ 11), рамка части не шире прежней', () => {
    const nums = [...svgOf('steam').matchAll(/<path d="([^"]+)"/g)].flatMap((m) => [...(m[1] as string).matchAll(/[MQLZ]|(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].filter((q) => q[1] !== undefined).map((q) => +(q[1] as string)));
    expect(nums.length).toBeGreaterThan(20);
    expect(Math.max(...nums)).toBeLessThanOrEqual(848);
    expect(859 - (Math.max(...nums) + 1)).toBeGreaterThanOrEqual(10); /* +1: половина контура D */
  });
});

describe('29-2: чашка эспрессо — демитас, а не сбой масштаба', () => {
  test('эспрессо рисуется демитасом (k 0,62 / 0,70), меньше керамической чашки капучино', () => {
    const es = specOf('espresso', '0.2', false);
    const cap = specOf('cappuccino', '0.2', false);
    expect(es.vessel.material).toBe('demitas');
    expect(cap.vessel.material).toBe('ceramic');
    expect(es.vessel.k).toBeLessThan(cap.vessel.k);
    expect(es.vessel.k).toBeGreaterThanOrEqual(0.6);
    expect(es.vessel.k).toBeLessThanOrEqual(0.71);
  });
});
