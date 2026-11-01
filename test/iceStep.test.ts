import { describe, expect, test } from 'vitest';
import { DRINKS } from '../src/game/menu';
import { sizesOf, variantsOf } from '../src/game/drinkModel';
import { buildTasks, coldVariantOk, stepLabels } from '../src/game/recipes';
import { recipeCard } from '../src/game/recipeCard';
import { recipeNumbers } from '../src/game/volumes';

/** Шаг «лёд» в билете и цель льда в рецепте согласованы: нет шага без цели и цели без шага. */
const ICED_KEY: Readonly<Record<string, string>> = { americano: 'icedamericano', cappuccino: 'icedcappuccino', latte: 'icedlatte' };
describe('шаг «лёд» и цель льда', () => {
  test('в баре: шаг «лёд» есть ровно тогда, когда в recipeNumbers есть цель льда (все напитки, варианты и размеры)', () => {
    let checked = 0;
    for (const d of DRINKS) for (const cold of variantsOf(d)) {
      /* с 35-Б у каждого холодного варианта напитка «и горячий, и холодный» есть заказ в баре (ICED или COLD_ORDERABLE и чаи) */
      const orderableInBar = !(cold && d.temp === 'both') || !!ICED_KEY[d.id] || coldVariantOk(d);
      expect(orderableInBar, `${d.id}: холодный вариант без заказа в баре`).toBe(true);
      const key = cold && ICED_KEY[d.id] ? (ICED_KEY[d.id] as string) : d.id;
      for (const size of sizesOf(d.id, cold)) {
        const r = recipeNumbers(d, size, cold);
        for (const syrup of [false, true]) {
          const tasks = buildTasks(key, { cold, syrup, shots: r.shots });
          expect(tasks.includes('ice'), `${d.id} ${cold ? 'холодный' : 'горячий'} ${size}: шаг лёд / цель ${r.ice ?? 0}`).toBe((r.ice ?? 0) > 0);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
  test('протеин готовится без льда: три шага (порошок, молоко или вода, шейкер) в билете и в книге, с сиропом на один больше', () => {
    for (const [id, mid] of [['protein_milk', 'milk'], ['protein_water', 'water']] as const) {
      const d = DRINKS.find((x) => x.id === id);
      expect(d).toBeTruthy();
      if (!d) continue;
      expect(buildTasks(id, { cold: true, syrup: false })).toEqual(['powder', mid, 'shake']);
      const card = recipeCard(d.id, '0.4', true);
      expect(card, id).not.toBeNull();
      if (!card) continue;
      expect(card.tasks, id).toEqual(['powder', mid, 'shake']);
      expect(stepLabels(card.tasks, id), id).toHaveLength(3);
    }
  });
  test('холодный вариант есть ровно у тех «и горячий, и холодный», что заказываются; убранные в 35-Б (раф, раф сливочная халва, какао, цикорий латте) только горячие', () => {
    for (const d of DRINKS) {
      if (d.temp === 'both') expect(!!ICED_KEY[d.id] || coldVariantOk(d), d.id).toBe(true);
    }
    for (const id of ['raf', 'raf_halva', 'cocoa', 'chicory_latte']) {
      const d = DRINKS.find((x) => x.id === id);
      expect(d?.temp, id).toBe('hot');
      expect(d?.coldSizes, id).toEqual([]);
    }
  });
  test('холодные заказы 35-Б: лёд перед молоком, нет пара и заливки, у каждого есть цель льда', () => {
    for (const id of ['cappuccino_pumpkin', 'matcha_latte', 'matcha_coconut', 'latte_sakura', 'latte_banana', 'latte_lemon', 'latte_coconut']) {
      const d = DRINKS.find((x) => x.id === id) as (typeof DRINKS)[number];
      for (const size of sizesOf(id, true)) {
        const r = recipeNumbers(d, size, true);
        const t = buildTasks(id, { cold: true, syrup: !!r.pumps, shots: r.shots });
        expect(t, `${id} ${size}`).not.toContain('steam');
        expect(t, `${id} ${size}`).not.toContain('pour');
        expect(t.indexOf('ice'), `${id} ${size}`).toBeGreaterThan(-1);
        expect(t.indexOf('ice'), `${id} ${size}`).toBe(t.indexOf('milk') - 1);
        expect(r.ice ?? 0, `${id} ${size}`).toBeGreaterThan(0);
      }
    }
  });
  test('остальные напитки не изменились: шаги холодных напитков с механикой по-прежнему кончаются льдом там, где цель есть', () => {
    expect(buildTasks('icedlatte', { cold: true, syrup: false })).toContain('ice');
    expect(buildTasks('orange_bumble', { cold: true, syrup: false })).toContain('ice');
    expect(buildTasks('boba_guava', { cold: true, syrup: true })).toContain('ice');
    expect(buildTasks('milkshake_vanilla', { cold: true, syrup: false })).toContain('ice');
  });
});
