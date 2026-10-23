import { describe, expect, test } from 'vitest';
import { BATCHES, BATCH_SIZES, CARAFE_ML, CUP_COFFEE_G, CUP_WATER_ML, brewCheck, brewProgress, levelMl, newCarafe, pour, pourCheck, startBrew, tickBrew, unpour } from '../src/game/stations/drip';
import { buildTasks } from '../src/game/recipes';
import { recipeNumbers } from '../src/game/volumes';
import { recipeCard } from '../src/game/recipeCard';
import { recipeCost } from '../src/game/economy';
import { serializeSave } from '../src/game/save';
import { DRINKS, DRINK_NEEDS, EQUIPMENT, ENGINE, drinkById, priceOf } from '../src/game/menu';
import { rollOrder } from '../src/game/orders';
import { isShopItemAvailable } from '../src/game/shop';
import DOC from '../docs/design/filter-coffee.md?raw';
import type { Drink, Size } from '../src/game/types';

const d = drinkById['filter_coffee'] as Drink;
const num = (s: string): number => Number(((/[\d\s]+(,\d+)?/.exec(s) ?? ['NaN'])[0]).replace(/\s/g, '').replace(',', '.'));
const cells = (l: string): string[] => l.split('|').map((c) => c.trim().replace(/\*/g, '')).slice(1, -1);

describe('фильтр-кофе: данные меню', () => {
  test('напиток: ранг 3, только горячий, размеры 0,2 / 0,3 / 0,4, цены 110 / 150 / 190, шаг drip', () => {
    expect(d).toBeDefined();
    expect(d.rank).toBe(3);
    expect(d.temp).toBe('hot');
    expect(d.family).toBe('filter');
    expect(Object.keys(d.sizes).sort()).toEqual(['0.2', '0.3', '0.4']);
    expect((['0.2', '0.3', '0.4'] as Size[]).map((s) => priceOf('filter_coffee', s))).toEqual([110, 150, 190]);
    expect(d.steps.map((s) => s.st)).toEqual(['drip']);
    expect(DRINKS).toHaveLength(35);
    expect(ENGINE['filter_coffee']).toBe('filter_coffee');
  });
  test('оборудование drip: ранг 3, 600 ₽ (на ранге 3 цена не удваивается), нужно напитку', () => {
    const e = EQUIPMENT.find((x) => x.id === 'drip');
    expect(e).toMatchObject({ rank: 3, cost: 600, name: 'Капельная кофеварка' });
    expect(DRINK_NEEDS['filter_coffee']).toEqual(['drip']);
  });
  test('шаг drip: без помола, темпера и льда, один шаг налива', () => {
    const t = buildTasks('filter_coffee', { cold: false, syrup: false });
    expect(t).toEqual(['drip']);
    expect(t).not.toContain('grind');
    expect(t).not.toContain('tamp');
    expect(t).not.toContain('ice');
  });
});

describe('фильтр-кофе: цифры из документа (разбор таблиц docs/design/filter-coffee.md)', () => {
  /* таблица 2.2: размер | цена | кофе г | вода мл | выход мл | кофе ₽ | вода ₽ | стакан ₽ | себестоимость | прибыль | доля */
  const rows22 = DOC.split('\n').filter((l) => /^\| 0,[234] л \| \*\*\d+ ₽\*\*/.test(l)).map(cells);
  test('в документе три строки рецепта на чашку', () => expect(rows22).toHaveLength(3));
  test('кофе, вода, цена и себестоимость по размерам совпадают с таблицей 2.2', () => {
    for (const r of rows22) {
      const size = (r[0] as string).replace(',', '.').replace(' л', '') as Size;
      const rec = recipeNumbers(d, size);
      expect(priceOf('filter_coffee', size), size).toBe(num(r[1] as string));
      expect(CUP_COFFEE_G[size], size).toBe(num(r[2] as string));
      expect(CUP_WATER_ML[size], size).toBe(num(r[3] as string));
      expect(rec.filter, size).toEqual({ g: num(r[2] as string), waterMl: num(r[3] as string) });
      expect(rec.drinkMl, size).toBe(Number(size) * 1000);
      expect(recipeCost(rec), size).toBe(num(r[8] as string));
      /* выход колбы: вода минус 2 мл на грамм кофе даёт объём чашки (допуск 5 мл) */
      expect(Math.abs(num(r[3] as string) - 2 * num(r[2] as string) - num(r[4] as string)), size).toBeLessThanOrEqual(1);
      expect(Math.abs(num(r[4] as string) - rec.drinkMl), size).toBeLessThanOrEqual(5);
    }
  });
  /* таблица 2.3: порция | кофе г | вода мл | выход мл | время | чашек */
  const rows23 = DOC.split('\n').filter((l) => /^\| (малая|средняя|полная) [\d,]+ л \|/.test(l)).map(cells);
  test('порции колбы совпадают с таблицей 2.3, время 20–40 с, соотношение 1 : 16–17, вместимость 1,2 л', () => {
    expect(rows23).toHaveLength(3);
    rows23.forEach((r, i) => {
      const size = BATCH_SIZES[i] as (typeof BATCH_SIZES)[number];
      const b = BATCHES[size];
      expect([b.coffeeG, b.waterMl, b.outMl, b.seconds], size).toEqual([num(r[1] as string), num(r[2] as string), num(r[3] as string), num((r[4] as string).replace(' с', ''))]);
      expect(b.waterMl / b.coffeeG, size).toBeGreaterThan(16);
      expect(b.waterMl / b.coffeeG, size).toBeLessThan(17);
      expect(Math.abs(b.waterMl - 2 * b.coffeeG - b.outMl), size).toBeLessThanOrEqual(2);
      expect(b.seconds).toBeGreaterThanOrEqual(20);
      expect(b.seconds).toBeLessThanOrEqual(40);
    });
    expect(CARAFE_ML).toBe(1200);
  });
  test('карточка рецепта: один шаг «Налить из колбы» с объёмом', () => {
    const c = recipeCard('filter_coffee', '0.3');
    expect(c?.tasks).toEqual(['drip']);
    expect(c?.steps[0]?.label).toBe('Налить из колбы');
    expect(c?.steps[0]?.detail).toContain('300 мл');
  });
});

describe('колба: заварка, налив, долив', () => {
  test('в начале колба пуста; заварка 20 с: колба занята, потом в ней 598 мл', () => {
    const c = newCarafe();
    expect(c.ml).toBe(0);
    expect(pourCheck(c, 200)).toBe('empty');
    expect(startBrew(c, '0.6')).toBe(true);
    expect(pourCheck(c, 200)).toBe('brewing');
    expect(tickBrew(c, 10)).toBe(false);
    expect(brewProgress(c)).toBeCloseTo(0.5);
    expect(levelMl(c)).toBeCloseTo(299);
    expect(tickBrew(c, 10)).toBe(true);
    expect(c.brew).toBeNull();
    expect(c.ml).toBe(598);
    expect(pourCheck(c, 300)).toBe('ok');
  });
  test('налив вычитает объём; из малой порции две чашки 0,3 л не выйдет, третьей «мало»', () => {
    const c = newCarafe();
    startBrew(c, '0.6');
    tickBrew(c, 20);
    expect(pour(c, 300)).toBe(true);
    expect(pour(c, 300)).toBe(false);
    expect(pourCheck(c, 300)).toBe('low');
    expect(c.ml).toBe(298);
    unpour(c, 300);
    expect(c.ml).toBe(598);
  });
  test('долив только пока есть место; вторая заварка при идущей невозможна', () => {
    const c = newCarafe();
    startBrew(c, '0.6');
    tickBrew(c, 20);
    expect(brewCheck(c, '0.9')).toBe('full');
    expect(startBrew(c, '0.9')).toBe(false);
    expect(startBrew(c, '0.6')).toBe(true);
    expect(brewCheck(c, '0.6')).toBe('brewing');
    expect(startBrew(c, '0.6')).toBe(false);
    tickBrew(c, 20);
    expect(c.ml).toBe(1196);
    expect(c.ml).toBeLessThanOrEqual(CARAFE_ML);
    expect(brewCheck(c, '0.6')).toBe('full');
  });
  test('полная порция 1,2 л за 40 с; пока tickBrew не зовут (пауза), время стоит', () => {
    const c = newCarafe();
    expect(startBrew(c, '1.2')).toBe(true);
    expect(tickBrew(c, 39.9)).toBe(false);
    expect(c.ml).toBe(0);
    expect(tickBrew(c, 0.2)).toBe(true);
    expect(c.ml).toBe(1199);
  });
  test('колба — состояние смены: в формате сохранения её нет, покупка eq_drip сохраняется', () => {
    const json = serializeSave({ day: 3, money: 700, rating: 4, rank: 3, served: 9, up: ['eq_drip'] });
    expect(json).not.toMatch(/carafe|колб/i);
    expect(JSON.parse(json).up).toContain('eq_drip');
  });
});

describe('фильтр-кофе: заказы и магазин', () => {
  const eqs = (e: string[]): Record<string, boolean> => Object.fromEntries(e.map((k) => [k, true]));
  const seeded = (s: number) => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  test('без кофеварки напиток не заказывают; с ней на ранге 3 заказывают, без сиропа, размер из трёх', () => {
    const none = new Set<string>(), some = new Set<string>(), sizes = new Set<string>();
    const r = seeded(11);
    for (let i = 0; i < 900; i++) {
      none.add(rollOrder({ rank: 3, day: 6, milk: true, eq: { cream: true } }, 'regular', r).id);
      const o = rollOrder({ rank: 3, day: 6, milk: true, eq: eqs(['cream', 'drip']) }, 'regular', r);
      some.add(o.id);
      if (o.id === 'filter_coffee') {
        sizes.add(o.size);
        expect(o.syrup).toBeNull();
        expect(o.cold).toBe(false);
        expect(o.shots).toBe(0);
      }
    }
    expect(none.has('filter_coffee')).toBe(false);
    expect(some.has('filter_coffee')).toBe(true);
    expect([...sizes].sort()).toEqual(['0.2', '0.3', '0.4']);
  });
  test('гарантия отдачи: с focus = eq_drip заказ использует кофеварку', () => {
    const r = seeded(5);
    for (let i = 0; i < 40; i++) expect(rollOrder({ rank: 3, day: 6, milk: true, eq: eqs(['drip']), focus: 'eq_drip' }, 'regular', r).id).toBe('filter_coffee');
  });
  test('магазин: кофеварка с ранга 3, раньше её карточки нет; куплена — остаётся', () => {
    const it = { id: 'eq_drip' };
    expect(isShopItemAvailable(it, { rank: 2, owned: {} })).toBe(false);
    expect(isShopItemAvailable(it, { rank: 3, owned: {} })).toBe(true);
    expect(isShopItemAvailable(it, { rank: 1, owned: { eq_drip: true } })).toBe(true);
  });
});
