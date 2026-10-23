import { describe, expect, test } from 'vitest';
import { EQ_IMPL, SECTION_NAMES, WHY_SECTIONS, TUTORIALS, coachSteps,migrateSeen, sectionsIntroDue, exampleDrink, purchaseToast, readSave, restore, tutorialEqs, tutorialEqsOfDrink } from '../src/game/api';

describe('подсказки новых станций', () => {
  test('у каждого работающего оборудования есть 1–2 шага', () => {
    for (const e of EQ_IMPL) {
      const t = TUTORIALS[e];
      expect(t, e).toBeDefined();
      expect(t?.steps.length).toBeGreaterThanOrEqual(1);
      expect(t?.steps.length).toBeLessThanOrEqual(2);
    }
  });
  test('шаги бара ведут к своему оборудованию', () => {
    expect(tutorialEqs('whisk')).toEqual(['matcha']);
    expect(tutorialEqs('whip')).toEqual(['whipper']);
    expect(tutorialEqs('tonic')).toEqual(['juice']);
    expect(tutorialEqs('grind')).toEqual([]);
    expect(tutorialEqs('food', { case: 'pastry', heat: true })).toEqual(['case_pastry', 'microwave']);
    expect(tutorialEqs('food', null)).toEqual([]);
  });
  test('тост при покупке называет станцию и напиток', () => {
    expect(purchaseToast('matcha')).toMatch(/^Новое: .+\. Попробуйте на заказе: .+/);
    expect(purchaseToast('case_snacks')).toContain('с едой');
    expect(purchaseToast('нет такого')).toBeNull();
    expect(exampleDrink('shaker')).not.toBeNull();
  });
  test('30-3: покупка каждой из девяти боковых (31-2: бабл ти в «Чайном баре») станций называет свою секцию, центральные — нет', () => {
    const sides: Record<string, 'L' | 'R'> = { tea: 'L', matcha: 'L', powders: 'L', boba: 'L', juice: 'R', whipper: 'R', foamer: 'R', blender: 'R', shaker: 'R' };
    for (const [eq, sec] of Object.entries(sides)) {
      const t = purchaseToast(eq) ?? '';
      expect(t, eq).toContain(`секции «${SECTION_NAMES[sec]}»: нажмите стрелку с этим названием.`);
      expect(t, eq).not.toMatch(/слева|справа|сверху|снизу|!|\d/);
      expect(t.includes(SECTION_NAMES[sec === 'L' ? 'R' : 'L']), eq).toBe(false);
    }
    for (const eq of ['ice', 'cream', 'case_snacks', 'microwave']) expect(purchaseToast(eq) ?? '', eq).not.toContain('секции');
    expect(purchaseToast('milk')).not.toContain('секции');
  });
  test('30-3: «Как листать бар» один раз, старому сохранению тоже', () => {
    const open = { L: true, R: false };
    const old = migrateSeen([], { rank: 5, day: 12, served: 100, milk: true, up: ['eq_tea'] });
    expect(old).not.toContain(WHY_SECTIONS);
    expect(sectionsIntroDue(old, open, false)).toBe(true);
    expect(sectionsIntroDue([...old, WHY_SECTIONS], open, false)).toBe(false); /* второй заказ */
    expect(sectionsIntroDue(old, { L: false, R: false }, false)).toBe(false); /* боковой секции нет */
    expect(sectionsIntroDue(old, open, true)).toBe(false); /* подсказки выключены */
    expect(sectionsIntroDue([], { L: false, R: true }, false)).toBe(true);
  });
  test('коуч по шагам нумерует их, у напитка без станций подсказки нет', () => {
    expect(coachSteps('matcha')).toMatch(/^1\. .+<br>2\. /);
    expect(tutorialEqsOfDrink('espresso_double')).toEqual([]);
  });
  test('tutorialSeen читается из сохранения, в старом его нет', () => {
    const r = readSave('{"day":3,"money":1,"tutorialSeen":["matcha",7,"tea"]}');
    if (r.kind !== 'ok') throw new Error('ожидалось ok');
    expect(r.data.tutorialSeen).toEqual(['matcha', 'tea']);
    expect(restore(r.data).tutorialSeen).toEqual(['matcha', 'tea']);
    const old = readSave('{"day":3,"money":1}');
    if (old.kind === 'ok') expect(restore(old.data).tutorialSeen).toEqual([]);
  });
});
