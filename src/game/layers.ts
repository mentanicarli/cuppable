/**
 * Шаг «Налить слоями» (31-2): что льёт шаг, подпись и вид слоёв в окне станции. Чистая логика без DOM.
 * Нижние слои (сок, тоник) налиты предыдущими шагами и в окне неподвижны; шаг выкладывает сверху ровно один слой: эспрессо или матчу.
 */
import { drinkById } from './menu';
import { sizesOf, specOf, variantsOf } from './drinkModel';
import type { Size } from './types';

export type LayerSource = 'espresso' | 'matcha';

/** Что выкладывает верхним слоем: матча, если напиток начинается со взбивания матчи, иначе эспрессо. */
export function layerSourceOf(drinkId: string): LayerSource {
  return drinkById[drinkId]?.steps.some((s) => s.st === 'whisk') ? 'matcha' : 'espresso';
}

const NAMES: Readonly<Record<LayerSource, { label: string; title: string }>> = {
  espresso: { label: 'Эспрессо сверху', title: 'Налить эспрессо сверху' },
  matcha: { label: 'Матча сверху', title: 'Налить матчу сверху' }
};
/** Подпись шага в билете и книге (называет компонент). */
export const layerLabel = (drinkId: string): string => NAMES[layerSourceOf(drinkId)].label;
/** Заголовок окна станции. */
export const layerTitle = (drinkId: string): string => NAMES[layerSourceOf(drinkId)].title;

export interface LayerView {
  /** цвет слоя из спецификации напитка */
  color: string;
  /** доля столбца жидкости, сумма по слоям равна 1 */
  share: number;
  /** сколько из доли налито сейчас (нижние слои налиты целиком, верхний растёт с прогрессом) */
  fill: number;
  /** льётся сейчас: ровно один слой, верхний */
  active: boolean;
}

/** Слои снизу вверх для окна. `progress` 0…1 — доля верхнего слоя, налитая сейчас. */
export function layerView(drinkId: string, progress: number, size: Size = '0.3', cold = true): LayerView[] {
  /* заказ, которого нет в меню (например холодный/горячий вариант, которого у напитка нет), не должен ронять окно: берём ближайший существующий */
  const d = drinkById[drinkId];
  const temp = d && !variantsOf(d).includes(cold) ? (variantsOf(d)[0] ?? cold) : cold;
  const sz = sizesOf(drinkId, temp).includes(size) ? size : ((sizesOf(drinkId, temp)[0] ?? size) as Size);
  const spec = specOf(drinkId, sz, temp);
  const p = Math.min(1, Math.max(0, progress));
  const last = spec.liquid.length - 1;
  return spec.liquid.map((l, i) => ({ color: l.color, share: l.frac, fill: i === last ? l.frac * p : l.frac, active: i === last }));
}
