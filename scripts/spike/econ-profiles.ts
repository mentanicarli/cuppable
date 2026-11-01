/* 33-Г: набор профилей для анализа баланса без живых смен и сводка прогонов. PROFILES из playerModel.ts и shop-sim не меняются.
   Скорость — множитель к estimatedPrepSeconds. Реальные смены владельца (data/real-shifts.json): скорость 0,94–0,99 при отличном качестве (0,83 и 1,00),
   то есть опытный игрок медленнее «Среднего» (0,88). Доли качества [плохо, нормально, идеально] у медленных хуже: правдоподобное допущение, не измерение
   (медленный игрок чаще передерживает пар и проваливает помол); крайние профили 0,70 и 0,88 совпадают с PROFILES. */
import { simFull } from './econ-sim';
import type { Policy, Sim } from './econ-sim';
import type { Profile } from '../../src/game/playerModel';

export const PROFILE_SET: ReadonlyArray<{ key: string; name: string; prof: Profile }> = [
  { key: '0.70', name: 'быстрый (0,70)', prof: { id: 'confident', name: 'быстрый 0,70', speed: 0.7, q: [0.04, 0.36, 0.6] } },
  { key: '0.88', name: 'средний (0,88)', prof: { id: 'medium', name: 'средний 0,88', speed: 0.88, q: [0.1, 0.5, 0.4] } },
  { key: '1.00', name: 'неторопливый (1,00)', prof: { id: 'medium', name: 'неторопливый 1,00', speed: 1.0, q: [0.16, 0.54, 0.3] } },
  { key: '1.20', name: 'медленный (1,20)', prof: { id: 'medium', name: 'медленный 1,20', speed: 1.2, q: [0.24, 0.54, 0.22] } },
  { key: '1.40', name: 'слабый (1,40)', prof: { id: 'medium', name: 'слабый 1,40', speed: 1.4, q: [0.32, 0.5, 0.18] } }
];

/** Запас прочности: профиль хуже «слабого», не входит в набор критериев; проверяет, что правка не держится на самом краю. */
export const STRESS: { key: string; name: string; prof: Profile } = { key: '1.70', name: 'запас (1,70)', prof: { id: 'medium', name: 'запас 1,70', speed: 1.7, q: [0.4, 0.45, 0.15] } };

export const median = (a: number[]): number => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number : NaN);
export const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

export interface Summary {
  runs: number;
  /** доля прогонов, закончившихся концом игры к дню N */
  over: Record<number, number>;
  /** медиана денег на конец дня N (мёртвые прогоны считаются по последнему дню) */
  money: Record<number, number>;
  rank9Day: number;
  rank9Share: number;
  /** доля потерянных гостей за дни 1–40 */
  lostShare: number;
  /** средний чистый доход в день на днях 25–40 (живые дни) */
  net2540: number;
  /** дней ожидания покупки после появления: максимум по позициям из медиан */
  waitMax: number;
  waitP90: number;
}

export function summarize(sims: Sim[], marks = [10, 20, 30, 40]): Summary {
  const over: Record<number, number> = {};
  const money: Record<number, number> = {};
  for (const d of marks) {
    over[d] = sims.filter((s) => s.run.over && s.overDay <= d).length / sims.length;
    money[d] = median(sims.map((s) => { const r = s.days[Math.min(d, s.days.length) - 1]; return r ? r.moneyEnd : NaN; }));
  }
  const r9 = sims.map((s) => s.run.rank.get(9)).filter((x): x is number => x !== undefined).map((x) => x + 1);
  const guests = sims.reduce((a, s) => a + s.run.guests, 0);
  const lost = sims.reduce((a, s) => a + s.run.lost, 0);
  const ids = new Set<string>();
  for (const s of sims) for (const k of s.run.avail.keys()) ids.add(k);
  const waits: number[] = [];
  for (const id of ids) {
    const w = sims.map((s) => (s.run.bought.has(id) && s.run.avail.has(id) ? (s.run.bought.get(id) as number) - (s.run.avail.get(id) as number) : NaN)).filter((x) => !Number.isNaN(x));
    if (w.length) waits.push(median(w));
  }
  waits.sort((a, b) => a - b);
  return {
    runs: sims.length,
    over,
    money,
    rank9Day: median(r9),
    rank9Share: r9.length / sims.length,
    lostShare: guests ? lost / guests : NaN,
    net2540: mean(sims.flatMap((s) => s.days.filter((d) => d.day >= 25 && d.day <= 40).map((d) => d.net))),
    waitMax: waits.length ? (waits[waits.length - 1] as number) : NaN,
    waitP90: waits.length ? (waits[Math.floor(0.9 * (waits.length - 1))] as number) : NaN
  };
}

export const RUNS_PER_PROFILE = 60;
export function runProfile(prof: Profile, days: number, pol: Policy = {}, runs = RUNS_PER_PROFILE): Sim[] {
  return Array.from({ length: runs }, (_, i) => simFull(i + 1, prof, days, pol));
}
