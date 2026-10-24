import { describe, expect, test } from 'vitest';
import FRIDGE from '../art-src/bar/showcase.svg?raw';
import ICE from '../art-src/bar/ice.svg?raw';
import MICRO from '../art-src/bar/sc-micro.svg?raw';
import INDEX from '../index.html?raw';
import FRONT from '../art-src/bar/counter-front.svg?raw';
import NOSE from '../art-src/bar/counter-nose.svg?raw';
import { specOf } from '../src/game/drinkModel';
import { BAR_UNIT, geomOf } from '../src/render/world/drinkModel';
import { CUP_TOP_PX, cupUnit } from '../src/render/world/cupPlan';
import { cupScale } from '../src/game/volumes';
import PARTS_L from '../src/assets/art/bar-parts-left.json';
import PARTS_R from '../src/assets/art/bar-parts-right.json';
import PARTS_C from '../src/assets/art/bar-parts.json';
const CENTER_PARTS = PARTS_C as unknown as Record<string, { svg: string }>;
import { parseItems, union } from './helpers/sideArt';

/* Этап 12.3(2): соотношения размеров по шкале docs/art/scale.md. Бар: 4,64 px/см (кофемашина 75 см = 348 px). Допуск у фона 0,75–1,25. */
const S_BAR = 4.64;
const MACHINE_PX = 348;
const MACHINE_CM = 75;
const rect = (s: string, fill: string): { x: number; y: number; w: number; h: number } => {
  const m = new RegExp(`<rect x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"[^>]*fill="\\{\\{${fill}\\}\\}"`).exec(s);
  if (!m) throw new Error('нет rect ' + fill);
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const zone = (name: string): { x: number; y: number; w: number; h: number } => {
  const m = new RegExp(`<rect data-z="${name}" x="(\\d+)" y="(\\d+)" width="(\\d+)" height="(\\d+)"`).exec(INDEX);
  if (!m) throw new Error('нет зоны ' + name);
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const units = [
  { name: 'холодильная витрина', src: FRIDGE, cm: 60, z: 'food' },
  { name: 'ледогенератор', src: ICE, cm: 40, z: 'ice' },
  { name: 'микроволновка', src: MICRO, cm: 45, z: 'micro' }
] as const;

describe('шкала: подстоечные блоки против кофемашины', () => {
  for (const u of units) {
    test(`${u.name}: ширина фасада в допуске 0,75–1,25 от реальных ${u.cm} см`, () => {
      const front = rect(u.src, 'STEEL');
      const ratio = front.w / (u.cm * S_BAR);
      expect(ratio, u.name).toBeGreaterThanOrEqual(0.75);
      expect(ratio, u.name).toBeLessThanOrEqual(1.25);
    });
    test(`${u.name}: отношение к ширине кофемашины близко к реальному (допуск ±25 %)`, () => {
      const front = rect(u.src, 'STEEL');
      const real = u.cm / MACHINE_CM;
      const game = front.w / MACHINE_PX;
      expect(game / real).toBeGreaterThanOrEqual(0.75);
      expect(game / real).toBeLessThanOrEqual(1.25);
    });
  }
  test('соотношение блоков между собой как в жизни: микроволновка уже холодильника (45 : 60), ледогенератор уже микроволновки (40 : 45)', () => {
    const [f, i, m] = units.map((u) => rect(u.src, 'STEEL').w) as [number, number, number];
    expect(m / f).toBeGreaterThan(0.6);
    expect(m / f).toBeLessThan(0.9);
    expect(i / m).toBeGreaterThan(0.75);
    expect(i / m).toBeLessThanOrEqual(1.0);
  });
});

describe('подстоечные блоки: опора и стыковка', () => {
  const bays = units.map((u) => ({ ...u, bay: rect(u.src, 'DARK') }));
  test('все ниши начинаются на одной линии (верх торца столешницы, y 620) и уходят за нижний край кадра', () => {
    for (const b of bays) {
      expect(b.bay.y).toBe(620);
      expect(b.bay.y + b.bay.h).toBeGreaterThanOrEqual(720);
    }
  });
  test('ниши не пересекаются и внутри кадра 1280 px', () => {
    const sorted = [...bays].sort((a, b) => a.bay.x - b.bay.x);
    for (let k = 1; k < sorted.length; k++) expect((sorted[k] as (typeof bays)[number]).bay.x).toBeGreaterThan((sorted[k - 1] as (typeof bays)[number]).bay.x + (sorted[k - 1] as (typeof bays)[number]).bay.w);
    for (const b of bays) expect(b.bay.x + b.bay.w).toBeLessThanOrEqual(1280);
  });
  test('зона клика совпадает с нишей по ширине и лежит ниже зон плиток (y ≥ 626: плитки кончаются на 624)', () => {
    for (const b of bays) {
      const z = zone(b.z);
      expect(z.x).toBe(b.bay.x);
      expect(z.w).toBe(b.bay.w);
      expect(z.y).toBeGreaterThanOrEqual(626);
      expect(z.y + z.h).toBe(720);
    }
  });
  test('фасад тумбы: дверцы counter-front стоят точно в нишах блоков (x и ширина), кромка столешницы во всю ширину кадра', () => {
    const front = FRONT;
    const nose = NOSE;
    for (const b of bays) expect(front).toContain(`<rect x="${b.bay.x}" y="630" width="${b.bay.w}"`);
    expect(nose).toMatch(/<rect x="-6" y="607" width="1292"/);
  });
});

/* Н1-2: чашка в баре ×2,5 (решение владельца 16.10.2026; было ×3). Реальные ширины по ободу: 0,2 л 8 см, 0,6 л 12 см (docs/art/scale.md). */
describe('шкала: чашка-модель в баре ×2,5', () => {
  const CM = 4.64;
  const widthPx = (id: string, size: '0.2' | '0.3' | '0.4' | '0.6', cold: boolean): number => {
    const g = geomOf(specOf(id, size, cold).vessel);
    if (g.kind === 'demitas') return 2 * g.W * BAR_UNIT.demitas;
    return (g.kind === 'glass' ? 2 * g.Wt : 2 * g.W) * BAR_UNIT[g.kind];
  };
  test('стакан и керамика 0,2 л: отношение к реальному размеру около ×2,3–2,5 (исключение чашки, было ×3)', () => {
    for (const [id, cold] of [['latte', false], ['cappuccino', false]] as const) {
      const ratio = widthPx(id, '0.2', cold) / (8 * CM);
      expect(ratio, id).toBeGreaterThanOrEqual(2.2);
      expect(ratio, id).toBeLessThanOrEqual(2.6);
    }
  });
  test('0,6 л: отношение к реальным 12 см не больше ×2,6', () => {
    for (const [id, cold] of [['latte', false], ['cappuccino', false], ['cappuccino', true]] as const) {
      const ratio = widthPx(id, '0.6', cold) / (12 * CM);
      expect(ratio, id).toBeLessThanOrEqual(2.6);
      expect(ratio, id).toBeGreaterThanOrEqual(1.8);
    }
  });
  test('эспрессо в демитасе заметно меньше кружки 0,2 л (одинарный не больше 55 %, двойной не больше 60 % ширины)', () => {
    const mug = widthPx('cappuccino', '0.2', false);
    expect(widthPx('espresso', '0.2', false) / mug).toBeLessThanOrEqual(0.55);
    expect(widthPx('espresso_double', '0.2', false) / mug).toBeLessThanOrEqual(0.6);
  });
  test('чашка 0,6 л не шире ниши группы кофемашины (около 280 px) и не закрывает группу', () => {
    expect(widthPx('cappuccino', '0.6', true)).toBeLessThan(280);
  });
});

/* Н2-4: чашка в зале (docs/art/scale.md): масштаб задаётся константами CUP_TOP_PX, логика выбора уровня от них не зависит. Зал 1,91 px/см, обод 0,2 л 8 см = 15 px. */
describe('шкала: чашка в зале', () => {
  const HALL_CM = 1.91;
  test('ширина обода 0,2 л в руке баристы, у гостя и в полёте относительно реальных 8 см', () => {
    const real = 8 * HALL_CM;
    expect(CUP_TOP_PX.barista / real).toBeGreaterThanOrEqual(2.0);
    expect(CUP_TOP_PX.barista / real).toBeLessThanOrEqual(2.4);
    expect(CUP_TOP_PX.guest / real).toBeGreaterThanOrEqual(1.8);
    expect(CUP_TOP_PX.guest / real).toBeLessThanOrEqual(2.0);
    expect(CUP_TOP_PX.fly / real).toBeGreaterThanOrEqual(1.3);
    expect(CUP_TOP_PX.fly / real).toBeLessThanOrEqual(1.6);
  });
  test('ширина чашки на экране = ширина обода × k (стакан 0,2 л в руке баристы 33 px, 0,6 л ×1,44)', () => {
    const w = (place: 'barista' | 'guest' | 'fly', id: string, size: '0.2' | '0.4' | '0.6', cold: boolean): number => {
      const sp = specOf(id, size, cold);
      const g = geomOf(sp.vessel);
      return (g.kind === 'glass' ? 2 * g.Wt : 2 * g.W) * cupUnit(place, sp.vessel.material);
    };
    expect(w('barista', 'latte', '0.2', false)).toBeCloseTo(33, 5);
    expect(w('barista', 'cappuccino', '0.2', false)).toBeCloseTo(33, 5);
    expect(w('barista', 'latte', '0.6', false)).toBeCloseTo(33 * cupScale(600), 5);
    expect(w('guest', 'latte', '0.4', false)).toBeCloseTo(28.8 * cupScale(400), 5);
  });
  test('чашка в руке не крупнее, чем в баре: 0,6 л в руке баристы уже обода на баре', () => {
    const g = geomOf(specOf('latte', '0.6', false).vessel);
    expect(g.kind).toBe('glass');
    const top = g.kind === 'glass' ? 2 * g.Wt : 0;
    expect(top * cupUnit('barista', 'glass')).toBeLessThan(top * BAR_UNIT.glass);
  });
});

/* Блок 29-1: кофемашина и кофемолка после перерисовки (docs/art/scale.md, строки «Кофемашина», «Кофемолка»). */
describe('шкала: кофемашина и кофемолка бара после 29-1', () => {
  test('кофемашина: ширина корпуса 348 px = 75 см (1,00), высота 138…508 = 370 px против ожидаемых 255 (55 см): 1,45 — вне допуска фона 1,25, но не выше ×1,5; рост ограничен билетом (y 130)', () => {
    const w = 348;
    const h = 508 - 138;
    expect(w / (75 * S_BAR)).toBeCloseTo(1, 2);
    const r = h / (55 * S_BAR);
    expect(r).toBeGreaterThan(1.4);
    expect(r).toBeLessThanOrEqual(1.5);
    expect(h / 338).toBeCloseTo(1.095, 2); /* прежняя высота 338 px */
  });
  test('кофемолка: ширина корпуса 128 px против 116 (1,10), полная высота с крышкой 140…470 = 330 px против 278 (1,19) — в допуске фона', () => {
    expect(128 / (25 * S_BAR)).toBeGreaterThanOrEqual(0.75);
    expect(128 / (25 * S_BAR)).toBeLessThanOrEqual(1.25);
    expect(330 / (60 * S_BAR)).toBeLessThanOrEqual(1.25);
  });
});

/* Блок 29-1б: портафильтр и чашки на подогреве (docs/art/scale.md). */
describe('шкала: портафильтр и чашки подогрева после 29-1б', () => {
  test('ручка портафильтра: дерево 86 px = 18,5 см (18–20), с шейкой 100 px; голова 58 px = 12,5 см, корзина ≤ ×2,2 реальной (58 мм): читаемость в нише', () => {
    expect(86 / S_BAR).toBeGreaterThanOrEqual(18);
    expect(86 / S_BAR).toBeLessThanOrEqual(20);
    expect(58 / (6 * S_BAR)).toBeLessThanOrEqual(2.2);
  });
  test('чашки подогрева: высота 25 / 31 / 37 px = 5,4 / 6,7 / 8 см против реальных 5,5–8 см, ширина по ободу ≤ ×1,5', () => {
    for (const [h, real] of [[25, 5.5], [31, 6.7], [37, 8]] as const) {
      expect(h / S_BAR / real).toBeGreaterThanOrEqual(0.9);
      expect(h / S_BAR / real).toBeLessThanOrEqual(1.5);
    }
  });
});

/* Блок 29-2: темпер, питчер, звонок после перерисовки (docs/art/scale.md). Допуск ручных предметов ×1,5. */
describe('шкала: темпер, питчер и звонок после 29-2', () => {
  test('темпер 40 × 50 px против 28 × 51 (6 × 11 см): ×1,43 / ×0,98', () => {
    expect(40 / (6 * S_BAR)).toBeLessThanOrEqual(1.5);
    expect(50 / (11 * S_BAR)).toBeLessThanOrEqual(1.5);
  });
  test('питчер: корпус 68 × 82 против 46 × 65: ×1,48 / ×1,26', () => {
    expect(68 / (10 * S_BAR)).toBeLessThanOrEqual(1.5);
    expect(82 / (14 * S_BAR)).toBeLessThanOrEqual(1.5);
  });
  test('звонок 54 × 46 против 37 × 32 (8 × 7 см): ×1,46 / ×1,44, не больше 56 × 48', () => {
    expect(54 / (8 * S_BAR)).toBeLessThanOrEqual(1.5);
    expect(46 / (7 * S_BAR)).toBeLessThanOrEqual(1.5);
    expect(54).toBeLessThanOrEqual(56);
    expect(46).toBeLessThanOrEqual(48);
  });
});

/* Блоки 30-1/30-2: станции боковых секций. Размер группы предметов (объединение итоговых рамок: проектный размер плана ×1,10, решение владельца) против реальных см группы, шкала бара 4,64 px/см. Допуск расширен до ×1,5 (ручные детали). */
describe('шкала: станции боковых секций (×1,10)', () => {
  const groups = [
    { src: 'L', part: 'tea', cm: [49, 26], px: [243.1, 127.6] },
    { src: 'L', part: 'matcha', cm: [55, 14], px: [292.6, 81.4] },
    { src: 'L', part: 'powders', cm: [66, 22], px: [334.4, 129.8] },
    { src: 'L', part: 'boba', cm: [61, 26], px: [310.2, 134.2] },
    { src: 'R', part: 'juice', cm: [33, 46], px: [167.2, 235.4] },
    { src: 'R', part: 'whipper', cm: [29, 38], px: [148.5, 195.8] },
    { src: 'R', part: 'blender', cm: [27, 46], px: [146.3, 239.8] },
    { src: 'R', part: 'shaker', cm: [32, 21], px: [162.8, 112.8] }
  ] as const;
  const partsOf = (src: string): Record<string, { svg: string }> => (src === 'L' ? PARTS_L : PARTS_R) as unknown as Record<string, { svg: string }>;
  for (const g of groups) {
    test(`${g.part}: размер группы = план ×1,10 (±4 px) и в допуске 0,75–1,5 от реальных ${g.cm[0]} × ${g.cm[1]} см`, () => {
      const u = union(parseItems(partsOf(g.src)[g.part]?.svg ?? '').map((i) => i.final));
      expect(Math.abs(u.w - g.px[0])).toBeLessThanOrEqual(4);
      expect(Math.abs(u.h - g.px[1])).toBeLessThanOrEqual(4);
      for (const [v, cm] of [[u.w, g.cm[0]], [u.h, g.cm[1]]] as const) {
        expect(v / (cm * S_BAR)).toBeGreaterThanOrEqual(0.75);
        expect(v / (cm * S_BAR)).toBeLessThanOrEqual(1.5);
      }
    });
  }
  test('раковина (31-2): мойка 32–43 см по ширине, кран 22–28 см по высоте (бар 4,64 px/см)', () => {
    const svg = (partsOf('R').decor?.svg ?? '').split('data-wrap="sink"')[1] ?? '';
    const rim = /<rect x="\d+" y="\d+" width="(\d+)" height="\d+" rx="11"/.exec(svg);
    const neck = /<path d="M1079 500V422Q1079 (\d+) /.exec(svg);
    expect(rim && neck).toBeTruthy();
    const rimW = 1.1 * Number(rim?.[1]), tapH = 1.1 * (506 - Number(neck?.[1]));
    expect(rimW / S_BAR).toBeGreaterThanOrEqual(32);
    expect(rimW / S_BAR).toBeLessThanOrEqual(43);
    expect(tapH / S_BAR).toBeGreaterThanOrEqual(22);
    expect(tapH / S_BAR).toBeLessThanOrEqual(28);
  });
  test('ведёрко со льдом (30-4): 86,9 × 89,1 px (проект 79 × 81 ×1,10) в допуске от реальных 19 × 19 см', () => {
    const f = (parseItems(partsOf('R').decor?.svg ?? '').find((i) => i.id === 'iceBucket') as { final: { w: number; h: number } }).final;
    expect(Math.abs(f.w - 86.9)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(f.h - 89.1)).toBeLessThanOrEqual(0.5);
    for (const v of [f.w, f.h]) { expect(v / (19 * S_BAR)).toBeGreaterThanOrEqual(0.75); expect(v / (19 * S_BAR)).toBeLessThanOrEqual(1.5); }
  });
});

/* Блок 31-8Б, 31-8В: капельная кофеварка на столешнице в центре бара (×1,0), реальные 28 × 20 × 34 см (с ручкой колбы) */
describe('шкала: капельная кофеварка (31-8Б)', () => {
  test('130 × 160 px против 130 × 158 px (28 × 34 см): отношение 1,00 / 1,01, в допуске 0,75–1,5', () => {
    const m = /data-item="drip" data-box="([\d. ]+)"/.exec((CENTER_PARTS['drip'] as { svg: string }).svg);
    const [, , w, h] = (m?.[1] ?? '').split(' ').map(Number) as [number, number, number, number];
    expect([w, h]).toEqual([130, 160]);
    expect(w / (28 * S_BAR)).toBeGreaterThanOrEqual(0.75);
    expect(w / (28 * S_BAR)).toBeLessThanOrEqual(1.5);
    expect(h / (34 * S_BAR)).toBeGreaterThanOrEqual(0.75);
    expect(h / (34 * S_BAR)).toBeLessThanOrEqual(1.5);
  });
});
