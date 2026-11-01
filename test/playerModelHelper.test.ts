import { describe, expect, test } from 'vitest';
import { HELPER_MIN_RANK } from '../src/game/helper';
import { PROFILES, simulate } from '../src/game/playerModel';

const days = 30;
const runs = PROFILES.flatMap((p) => Array.from({ length: 6 }, (_, i) => simulate(i + 1, p, days)));

describe('помощник в модели игрока (33-Б)', () => {
  test('по одной записи на сыгранный день', () => {
    for (const r of runs) expect(r.helper.length).toBe(r.income.length);
  });
  test('до покупки и до ранга 5 помощник никого не обслуживает', () => {
    for (const r of runs) {
      const bought = r.bought.get('helper');
      expect(bought).toBeDefined();
      for (let d = 1; d <= r.helper.length; d++) {
        const h = r.helper[d - 1];
        const snap = r.snaps[d - 1];
        if (!h || !snap) continue;
        if (!snap.owned.includes('helper') || snap.rank < HELPER_MIN_RANK) expect(h).toEqual({ served: 0, revenue: 0, costs: 0 });
      }
    }
  });
  test('после покупки помощник готовит: в среднем хотя бы полгостя в день, выручка и расходы положительны', () => {
    for (const p of PROFILES) {
      const rs = Array.from({ length: 20 }, (_, i) => simulate(i + 1, p, 40));
      const ds = rs.flatMap((r) => r.helper.filter((h, i) => (r.snaps[i]?.owned.includes('helper') ?? false) && (r.snaps[i]?.rank ?? 0) >= HELPER_MIN_RANK));
      expect(ds.length).toBeGreaterThan(100);
      const served = ds.reduce((a, h) => a + h.served, 0) / ds.length;
      expect(served).toBeGreaterThan(0.4);
      expect(served).toBeLessThan(3);
      expect(ds.every((h) => h.revenue >= 0 && h.costs >= 0 && (h.served === 0 || h.revenue > h.costs))).toBe(true);
    }
  });
  test('детерминизм: один семя — один результат', () => {
    expect(JSON.stringify(simulate(5, PROFILES[0]!, 25))).toBe(JSON.stringify(simulate(5, PROFILES[0]!, 25)));
  });
});
