import type { Quality, Rng } from './types';

/** Помощник справляется только с простыми напитками без сиропов и блюд. */
export const HELPER_KEYS: ReadonlySet<string> = new Set(['espresso', 'espresso2', 'americano', 'icedamericano', 'filter_coffee']);
export const HELPER_MIN_RANK = 5;

export interface HelperGuest { id: number; drink: string; arrived: boolean; leaving: boolean; pat: number; syrup: string | null; food: boolean; /** объём чашки, мл (для фильтр-кофе из колбы) */ ml?: number }
/** Колба капельной кофеварки для помощника: сколько в ней готового кофе и идёт ли заварка (31-8Б). */
export interface HelperCarafe { ml: number; brewing: boolean }
/** Помощник наливает фильтр-кофе только из готовой колбы, где хватает на чашку гостя; заварку колбы всегда делает игрок. */
export const helperCanPour = (g: HelperGuest, c: HelperCarafe | null): boolean => g.drink !== 'filter_coffee' || (!!c && !c.brewing && c.ml >= (g.ml ?? Infinity));

/** Сколько секунд помощник готовит напиток: каждый шот сверх первого (двойной эспрессо, 0.4 и 0.6 л) добавляет ещё один полный цикл. */
export const helperPrepTime = (key: string, shots = 1): number => (key === 'filter_coffee' ? 10 : key === 'espresso' || key === 'espresso2' ? 16 : key === 'americano' ? 20 : 26) + 16 * (Math.max(1, shots) - 1);

/** Берёт самого нетерпеливого из тех, кого можно отдать помощнику. */
export function helperPick(guests: readonly HelperGuest[], busyId: number | null, carafe: HelperCarafe | null = null): HelperGuest | null {
  let best: HelperGuest | null = null;
  for (const g of guests) {
    if (!g.arrived || g.leaving || g.id === busyId || g.syrup || g.food || !HELPER_KEYS.has(g.drink) || !helperCanPour(g, carafe)) continue;
    if (!best || g.pat < best.pat) best = g;
  }
  return best;
}

/** Качество напитка помощника: чаще «нормально», с ростом ранга реже брак. */
export function helperQuality(rank: number, rng: Rng = Math.random): Quality {
  const bad = Math.max(0.04, 0.12 - 0.02 * Math.max(0, rank - 5));
  const good = 0.15 + 0.03 * Math.max(0, rank - 5);
  const r = rng();
  return r < bad ? 0 : r < bad + good ? 2 : 1;
}
