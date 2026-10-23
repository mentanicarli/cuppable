import { describe, expect, test } from 'vitest';
import { DRINKS } from '../src/game/menu';
import { buildTasks, stepLabels } from '../src/game/recipes';
import { sizesOf, specOf, variantsOf } from '../src/game/drinkModel';
import { layerLabel, layerSourceOf, layerTitle, layerView } from '../src/game/layers';

/** Напитки с шагом «layer»: все варианты, где buildTasks его даёт. */
const withLayer = DRINKS.flatMap((d) => variantsOf(d).map((cold) => ({ d, cold }))).filter(({ d, cold }) => buildTasks(d.id, { cold, syrup: false }).includes('layer'));

describe('шаг «Налить слоями» (31-2)', () => {
  test('такие напитки есть: бамблы и тоники (5 штук)', () => {
    expect(withLayer.map((x) => x.d.id).sort()).toEqual(['espresso_tonic', 'matcha_bumble', 'matcha_tonic', 'orange_bumble', 'pomegranate_bumble']);
  });
  test('layerView: цвета слоёв равны спецификации, активен ровно один (верхний), незавершённые не рисуются полностью', () => {
    for (const { d, cold } of withLayer) {
      for (const size of sizesOf(d.id, cold)) {
        const spec = specOf(d.id, size, cold);
        for (const p of [0, 0.25, 0.5, 0.99, 1]) {
          const v = layerView(d.id, p, size, cold);
          expect(v.map((l) => l.color), `${d.id} ${size}`).toEqual(spec.liquid.map((l) => l.color));
          expect(v.filter((l) => l.active), `${d.id} ${size} p=${p}`).toHaveLength(1);
          expect(v[v.length - 1]?.active).toBe(true);
          for (const l of v.slice(0, -1)) expect(l.fill, 'нижние слои налиты целиком и неподвижны').toBeCloseTo(l.share, 9);
          const top = v[v.length - 1] as (typeof v)[number];
          expect(top.fill).toBeCloseTo(top.share * p, 9);
          if (p < 1) expect(top.fill, `${d.id}: верхний слой при p=${p} не полный`).toBeLessThan(top.share);
          expect(v.reduce((s, l) => s + l.share, 0)).toBeCloseTo(1, 3);
        }
      }
    }
  });
  test('верхний слой матча-бамбла зелёный, а не коричневый; у эспрессо-напитков коричневый', () => {
    expect(layerView('matcha_bumble', 1)[1]?.color).toBe('#8DAA4B');
    expect(layerView('matcha_tonic', 1)[1]?.color).toBe('#8DAA4B');
    expect(layerView('orange_bumble', 1)[1]?.color).toBe('#4A2E20');
    expect(layerView('orange_bumble', 1)[0]?.color).toBe('#F2A33A');
  });
  test('заказ без такого варианта (горячий матча-бамбл 0,6 л) окно не роняет', () => {
    expect(() => layerView('matcha_bumble', 0.5, '0.6', false)).not.toThrow();
    expect(layerView('matcha_bumble', 0.5, '0.6', false)[1]?.color).toBe('#8DAA4B');
  });
  test('подпись и заголовок называют компонент', () => {
    expect(layerSourceOf('matcha_bumble')).toBe('matcha');
    expect(layerSourceOf('espresso_tonic')).toBe('espresso');
    expect(layerLabel('matcha_bumble')).toBe('Матча сверху');
    expect(layerTitle('matcha_tonic')).toBe('Налить матчу сверху');
    expect(layerTitle('orange_bumble')).toBe('Налить эспрессо сверху');
    expect(stepLabels(buildTasks('matcha_bumble', { cold: true, syrup: false }), 'matcha_bumble').pop()).toBe('Матча сверху');
    expect(stepLabels(['ice', 'layer'], 'orange_bumble').pop()).toBe('Эспрессо сверху');
  });
});
