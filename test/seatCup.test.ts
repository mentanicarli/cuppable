import { describe, expect, test } from 'vitest';
import SAUCER from '../art-src/hall/saucer.svg?raw';
import { allSpecs } from '../src/game/drinkModel';
import { GUEST_K } from '../src/render/world/art';
import { SAUCER_RECESS, TABLE_CUP, cupPlan, tableCupDy, tableCupRecess } from '../src/render/world/cupPlan';
import { geomOf, seatOf } from '../src/render/world/drinkModel';

const specs = allSpecs();

describe('чашка на блюдце гостя (31-1)', () => {
  test('центр углубления блюдца в cupPlan совпадает с art-src/hall/saucer.svg', () => {
    const m = SAUCER.match(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="12" ry="2\.8"/);
    expect(m, 'эллипс углубления в saucer.svg').not.toBeNull();
    expect(Number(m?.[1])).toBe(SAUCER_RECESS.x);
    expect(Number(m?.[2])).toBe(SAUCER_RECESS.y);
  });

  test('центр донышка чашки попадает в углубление с допуском ±2 px для всех сосудов и размеров', () => {
    const mats = new Set<string>();
    for (const s of specs) {
      const ref = { id: s.id, size: s.size, cold: s.cold };
      const plan = cupPlan(ref, 'guest', 1);
      const seat = seatOf(geomOf(plan.spec.vessel), plan.lod);
      const dy = tableCupDy(ref);
      /* центр эллипса донышка: yLow (середина между кромкой и нижней дугой) */
      const base = TABLE_CUP.y + TABLE_CUP.baseDrop + dy + (seat.yLow * plan.unit) / GUEST_K;
      const x = tableCupRecess(ref, dy).x;
      expect(Math.abs(x - SAUCER_RECESS.x), `${s.id} ${s.size}: x`).toBeLessThanOrEqual(2);
      expect(Math.abs(base - SAUCER_RECESS.y), `${s.id} ${s.size} ${s.vessel.material}: y ${base.toFixed(2)}`).toBeLessThanOrEqual(2);
      mats.add(s.vessel.material);
    }
    expect([...mats].sort()).toEqual(['ceramic', 'demitas', 'glass']);
  });

  test('сдвиг небольшой: чашка не уезжает с места больше чем на 3 px', () => {
    for (const s of specs) expect(Math.abs(tableCupDy({ id: s.id, size: s.size, cold: s.cold })), `${s.id} ${s.size}`).toBeLessThanOrEqual(3);
  });
});
