import { describe, expect, test } from 'vitest';
import { foodAvailable, foodChance, foodChoices, foodStation, heatScore, rollFood, rollOrder, say, settle } from '../src/game/api';

const seeded = (s: number) => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const names = { a: 'Круассан', b: 'Чизкейк' };
const st = (heat = false) => foodStation.init({ targetId: 'a', names, heat });

describe('еда с витрины', () => {
  test('без витрин еды нет и случайные числа не тратятся', () => {
    let calls = 0;
    const rng = () => { calls++; return 0.1; };
    expect(rollFood({ rank: 9, day: 9, eq: {} }, rng)).toBeNull();
    expect(calls).toBe(0);
    expect(foodAvailable({ rank: 9, eq: {} }).length).toBe(0);
  });
  test('доступны блюда по рангу и купленной витрине', () => {
    const l = foodAvailable({ rank: 2, eq: { case_snacks: true } });
    expect(l.length).toBeGreaterThan(0);
    expect(l.every((f) => f.case === 'snacks' && f.rank <= 2)).toBe(true);
  });
  test('разогрев только для греющихся блюд и при микроволновке', () => {
    const r = seeded(3); let heat = 0; let any = 0;
    for (let i = 0; i < 600; i++) {
      const f = rollFood({ rank: 8, day: 6, eq: { fridge_deli: true, microwave: true } }, r);
      if (f) { any++; if (f.heat) heat++; }
    }
    expect(any).toBeGreaterThan(100);
    expect(heat).toBeGreaterThan(5);
    const r2 = seeded(3);
    for (let i = 0; i < 300; i++) expect(rollFood({ rank: 8, day: 6, eq: { fridge_deli: true } }, r2)?.heat ?? false).toBe(false);
  });
  test('на выбор — нужное блюдо и до 8 вариантов', () => {
    const s = { rank: 8, eq: { case_snacks: true, case_pastry: true, case_dessert: true, fridge_deli: true } };
    const f = foodAvailable(s)[3];
    const c = foodChoices(s, f?.id ?? '', seeded(5));
    expect(c.length).toBe(8);
    expect(c.some((x) => x.id === f?.id)).toBe(true);
    expect(new Set(c.map((x) => x.id)).size).toBe(8);
  });
  test('заказ с едой: реплика называет блюдо, цена блюда отдельно', () => {
    const r = seeded(9); let found = 0;
    for (let i = 0; i < 400; i++) {
      const o = rollOrder({ rank: 5, day: 6, milk: true, eq: { case_pastry: true, case_snacks: true, case_dessert: true } }, 'regular', r);
      if (o.food) { found++; expect(o.line).toContain(o.food.name); }
    }
    expect(found).toBeGreaterThan(40);
  });
  test('реплика просит разогреть', () => {
    const s = say({ id: 'latte', name: 'Латте', food: { name: 'Рамен', heat: true } }, 'regular', () => 0);
    expect(s).toMatch(/«Рамен»/);
    expect(s).toMatch(/Разогрейте/);
  });
});

describe('станция еды', () => {
  test('верный выбор без разогрева сразу даёт оценку', () => {
    const s = st();
    expect(foodStation.pick(s, 'a').result?.score).toBe(1);
  });
  test('ошибки снижают оценку на 0,35', () => {
    const s = st();
    expect(foodStation.pick(s, 'b').message?.bad).toBe(true);
    expect(foodStation.pick(s, 'b').result).toBeUndefined();
    expect(foodStation.pick(s, 'a').result?.score).toBeCloseTo(0.3);
  });
  test('разогрев: окно 3,5–5,5 с', () => {
    expect(heatScore(4.5)).toBe(1);
    expect(heatScore(3.5)).toBe(1);
    expect(heatScore(2)).toBeCloseTo(0.5);
    expect(heatScore(9)).toBe(0);
    const s = st(true);
    expect(foodStation.finish(s).message?.text).toMatch(/достаньте/);
    expect(foodStation.pick(s, 'a').result).toBeUndefined();
    expect(foodStation.finish(s).message?.text).toMatch(/Зажмите/);
    for (let i = 0; i < 450; i++) foodStation.update(s, 0.01, true);
    const r = foodStation.finish(s).result;
    expect(r?.score).toBe(1);
    expect(r?.message?.text).toMatch(/в самый раз/);
  });
  test('нагрев идёт только при зажатой кнопке и после выбора', () => {
    const s = st(true);
    foodStation.update(s, 1, true); expect(s.heatT).toBe(0);
    foodStation.pick(s, 'a'); foodStation.update(s, 1, false); expect(s.heatT).toBe(0);
    foodStation.update(s, 1, true); expect(s.heatT).toBe(1);
  });
});

test('цена блюда добавляется к цене напитка и не умножается на зерно', () => {
  const r = settle({ basePrice: 100, beans: true, paidSyrup: false, extra: 200, quality: 1, type: 'regular', flawless: false, cards: false, rating: 3 });
  expect(r.price).toBe(Math.round(100 * 1.15) + 200);
});

describe('шанс взять еду растёт с числом витрин (33-Б)', () => {
  const sets: Array<[string, Record<string, boolean>, number]> = [
    ['одна витрина', { case_snacks: true }, 0.4],
    ['две', { case_snacks: true, case_pastry: true }, 0.5],
    ['три', { case_snacks: true, case_pastry: true, case_dessert: true }, 0.6],
    ['четыре', { case_snacks: true, case_pastry: true, case_dessert: true, fridge_deli: true }, 0.7]
  ];
  for (const [name, eq, p] of sets) {
    test(`${name}: порог ${p}`, () => {
      expect(foodChance(foodAvailable({ rank: 9, eq }))).toBeCloseTo(p, 10);
      /* порог проверяем границей броска: чуть ниже — берёт, чуть выше — нет; второй бросок выбирает блюдо */
      const below = [p - 1e-9, 0.5];
      const above = [p + 1e-9, 0.5];
      let i = 0; const rb = () => below[i++ % 2] as number;
      let j = 0; const ra = () => above[j++ % 2] as number;
      expect(rollFood({ rank: 9, day: 9, eq }, rb)).not.toBeNull();
      expect(rollFood({ rank: 9, day: 9, eq }, ra)).toBeNull();
    });
  }
  test('при одной витрине поток бросков прежний: порог 0,4, число бросков то же', () => {
    const eq = { case_snacks: true };
    const a = seeded(11), b = seeded(11);
    let ca = 0, cb = 0;
    const ra = () => { ca++; return a(); };
    const rb = () => { cb++; return b(); };
    for (let k = 0; k < 400; k++) {
      const x = rollFood({ rank: 9, day: 9, eq }, ra);
      /* эталон: прежнее правило, шанс 0,4 */
      const pool = foodAvailable({ rank: 9, day: 9, eq });
      let y = null;
      if (rb() < 0.4) { const f = pool[Math.floor(rb() * pool.length) % pool.length]; const h = f && f.heatable && !!eq['microwave'] && rb() < 0.5; y = f ? { id: f.id, heat: !!h } : null; }
      expect(x?.id ?? null).toBe(y?.id ?? null);
    }
    expect(ca).toBe(cb);
  });
});
