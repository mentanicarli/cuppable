import { SYRUPS, SYRUP_META } from './menu';

/* ---------- Что стоит на баре (31-7) ----------
   Предметы центральной части бара появляются только по покупке или рангу, чтобы на первом дне стол был пустым.
   Боковые станции — по eq_* (см. sections.ts), холодильник, лёд и витрины — как раньше (BarUpgrades в bar.ts).
   Чистая логика: ни DOM, ни Pixi. */

/** С какого ранга у игрока есть хотя бы один сироп (бутылки на полке): минимальный ранг среди сиропов, которые можно положить. */
export const SYRUP_FIRST_RANK: number = Math.min(...SYRUPS.filter((s) => SYRUP_META[s.name]).map((s) => s.rank));

export interface BarItemsIn {
  rank: number;
  milk: boolean;
  /** G.eq_cream */
  cream: boolean;
}
export interface BarItems {
  /** стальной питчер на столешнице: нужен паре и сливкам рафа, то есть при купленном молоке или сливочном кувшине */
  pitcher: boolean;
  /** полка с бутылками сиропа: пока нет ни одного сиропа (ранг ниже первого), полки нет */
  syrupShelf: boolean;
}

export function barItems(i: BarItemsIn): BarItems {
  return { pitcher: i.milk || i.cream, syrupShelf: i.rank >= SYRUP_FIRST_RANK };
}
