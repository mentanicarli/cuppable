import { describe, expect, test } from 'vitest';
import { HELPER_KEYS, HELPER_TEA_MINUTES, helperPick, helperPrepTime } from '../src/game/helper';
import { DRINKS } from '../src/game/menu';

const g = (id: number, drink: string, pat: number, extra = {}) => ({ id, drink, arrived: true, leaving: false, pat, syrup: null, food: false, ...extra });
const TEAS = ['tea_sencha', 'tea_assam', 'tea_hibiscus', 'tea_buckwheat'];

describe('чаи у помощника (33-В)', () => {
  test('в списке ровно чаи без сока: сенча, ассам, каркадэ, гречишный; смородиновый остаётся игроку', () => {
    for (const k of TEAS) expect(HELPER_KEYS.has(k)).toBe(true);
    expect(HELPER_KEYS.has('tea_currant')).toBe(false);
    /* чай меню, у которого весь рецепт — один шаг заварки */
    const pure = DRINKS.filter((d) => d.family === 'tea' && d.steps.length === 1 && d.steps[0]?.st === 'brew').map((d) => d.id).sort();
    expect(pure).toEqual([...TEAS].sort());
    expect(Object.keys(HELPER_TEA_MINUTES).sort()).toEqual([...TEAS].sort());
  });
  test('чай без сиропа и еды берёт, с сиропом или едой нет', () => {
    const eq = { tea: true };
    expect(helperPick([g(1, 'tea_assam', 10)], null, null, eq)?.id).toBe(1);
    expect(helperPick([g(1, 'tea_assam', 10, { syrup: 'vanilla' })], null, null, eq)).toBeNull();
    expect(helperPick([g(1, 'tea_assam', 10, { food: true })], null, null, eq)).toBeNull();
    expect(helperPick([g(1, 'tea_currant', 10)], null, null, eq)).toBeNull();
  });
  test('без купленной чайной станции чай не берёт; без проверки станции (старый вызов) поведение прежнее', () => {
    expect(helperPick([g(1, 'tea_sencha', 10)], null, null, {})).toBeNull();
    expect(helperPick([g(1, 'tea_sencha', 10)], null, null, { tea: false })).toBeNull();
    expect(helperPick([g(1, 'tea_sencha', 10), g(2, 'americano', 50)], null, null, {})?.id).toBe(2);
    expect(helperPick([g(1, 'americano', 5)], null)?.id).toBe(1);
  });
  test('самого нетерпеливого берёт и среди чаёв', () => {
    expect(helperPick([g(1, 'tea_assam', 40), g(2, 'americano', 20), g(3, 'tea_sencha', 5)], null, null, { tea: true })?.id).toBe(3);
  });
  test('время чая: не меньше американо; заварка до цели рецепта 2,5–6,3 с, поэтому у всех четырёх 20 с; шоты не прибавляют', () => {
    expect(TEAS.map((k) => helperPrepTime(k))).toEqual([20, 20, 20, 20]);
    for (const k of TEAS) {
      expect(helperPrepTime(k)).toBeGreaterThanOrEqual(helperPrepTime('americano'));
      expect(helperPrepTime(k, 3)).toBe(helperPrepTime(k));
    }
    expect(helperPrepTime('americano')).toBe(20);
  });
});
