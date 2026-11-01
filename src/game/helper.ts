import { BREW_SPEED } from './stations/brew';
import type { Quality, Rng } from './types';

/** Помощник справляется только с простыми напитками без сиропов и блюд. */
export const HELPER_KEYS: ReadonlySet<string> = new Set(['espresso', 'espresso2', 'americano', 'icedamericano', 'filter_coffee', 'tea_sencha', 'tea_assam', 'tea_hibiscus', 'tea_buckwheat']);
/** Чаи помощника (33-В): только заварка без сока, сиропа и пены; смородиновый (шаг «сок») остаётся игроку. Значение — минуты заварки по рецепту. */
export const HELPER_TEA_MINUTES: Readonly<Record<string, number>> = { tea_sencha: 2, tea_assam: 4, tea_hibiscus: 5, tea_buckwheat: 5 };
/** Оборудование, без которого помощник напиток не берёт (чай — только при чайной станции). */
const HELPER_NEEDS: Readonly<Record<string, string>> = { tea_sencha: 'tea', tea_assam: 'tea', tea_hibiscus: 'tea', tea_buckwheat: 'tea', filter_coffee: 'drip' };
export const HELPER_MIN_RANK = 5;

export interface HelperGuest { id: number; drink: string; arrived: boolean; leaving: boolean; pat: number; syrup: string | null; food: boolean; /** объём чашки, мл (для фильтр-кофе из колбы) */ ml?: number }
/** Колба капельной кофеварки для помощника: сколько в ней готового кофе и идёт ли заварка (31-8Б). */
export interface HelperCarafe { ml: number; brewing: boolean }
/** Помощник наливает фильтр-кофе только из готовой колбы, где хватает на чашку гостя; заварку колбы всегда делает игрок. */
export const helperCanPour = (g: HelperGuest, c: HelperCarafe | null): boolean => g.drink !== 'filter_coffee' || (!!c && !c.brewing && c.ml >= (g.ml ?? Infinity));

/** Сколько секунд помощник готовит напиток: каждый шот сверх первого (двойной эспрессо, 0.4 и 0.6 л) добавляет ещё один полный цикл. */
export const helperPrepTime = (key: string, shots = 1): number => (key === 'filter_coffee' ? 10 : key in HELPER_TEA_MINUTES ? teaTime(key) : key === 'espresso' || key === 'espresso2' ? 16 : key === 'americano' ? 20 : 26) + (key in HELPER_TEA_MINUTES ? 0 : 16 * (Math.max(1, shots) - 1));
/** Время чая: 10 с на воду, засыпку и подачу плюс заварка в баре до целевого времени рецепта (минуты / BREW_SPEED: сенча 2,5 с, ассам 5 с, каркадэ и гречишный 6,3 с, замер ботом 33-Г: 6,3 с у ассама вместе с кликами), но не меньше американо (20 с). Итог для всех четырёх чаёв 20 с. */
function teaTime(key: string): number {
  const minutes = HELPER_TEA_MINUTES[key] ?? 4;
  return Math.max(20, Math.round(10 + minutes / BREW_SPEED));
}

/** Берёт самого нетерпеливого из тех, кого можно отдать помощнику. */
export function helperPick(guests: readonly HelperGuest[], busyId: number | null, carafe: HelperCarafe | null = null, eq?: Readonly<Record<string, boolean | undefined>>): HelperGuest | null {
  let best: HelperGuest | null = null;
  for (const g of guests) {
    if (!g.arrived || g.leaving || g.id === busyId || g.syrup || g.food || !HELPER_KEYS.has(g.drink) || !helperCanPour(g, carafe)) continue;
    const need = HELPER_NEEDS[g.drink];
    if (eq && need && need !== 'drip' && !eq[need]) continue;
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
