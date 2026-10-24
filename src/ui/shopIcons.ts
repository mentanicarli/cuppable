/**
 * Иконки позиций магазина оборудования (31-7, правило кадра — 31-9): у каждой станции иконка — её предмет с бара (те же группы из bar-parts-*.json),
 * поэтому игрок узнаёт покупку на баре. Предмет берётся по метке `data-item` / `data-glass` (или целой частью).
 * Общее правило кадра для всех иконок с предметом бара: рамка предмета (замер getBBox объединения слоёв, `shop-icon-boxes.json`, их пишет
 * `node scripts/shop-icon-boxes.mjs`) лежит в квадратном кадре по центру, длинная сторона занимает 80 % кадра (поля `ICON_PAD` = 10 % с каждой стороны),
 * толщина контура пересчитывается так, чтобы на экране (иконка 46 px) остались линии около 2 px.
 * Иконки без подходящего предмета бара нарисованы вручную в 11-screens.js (SHOP_ICON): кувшин сливок, микроволновка (на баре тёмная), холодильник для сэндвичей.
 */
import LEFT from '../assets/art/bar-parts-left.json';
import RIGHT from '../assets/art/bar-parts-right.json';
import CENTER from '../assets/art/bar-parts.json';
import BOXES from '../assets/art/shop-icon-boxes.json';
import { groupOf } from './panelArt';

type Part = { svg: string; box: { x: number; y: number; w: number; h: number } };
const L = LEFT as unknown as Record<string, Part>;
const R = RIGHT as unknown as Record<string, Part>;
const C = CENTER as unknown as Record<string, Part>;

interface Layer { part: Record<string, Part>; id: string; marker?: string }
interface Spec { layers: Layer[]; /** множитель толщины контура (мелкие предметы тоньше) */ line?: number; /** окно кадра [x, y, w, h] вместо рамки предмета: для длинных предметов (витрина 310 px, ледогенератор, станция бабл ти), у которых целиком в 46 px не читается содержимое */ crop?: readonly [number, number, number, number] }

const side = (part: Record<string, Part>, id: string, marker: string): Layer => ({ part, id, marker });
const whole = (part: Record<string, Part>, id: string): Layer => ({ part, id });

/** Иконки по id позиции магазина (`eq_<оборудование>`). Кувшина сливок, микроволновки и холодильника для сэндвичей здесь нет (рисуются вручную). */
const SPECS: Readonly<Record<string, Spec>> = {
  eq_tea: { layers: [side(L, 'tea', 'data-item="glassTeapot"')] },
  eq_matcha: { layers: [side(L, 'matcha', 'data-item="bowl"'), side(L, 'matcha', 'data-item="whisk"')] },
  eq_powders: { layers: [side(L, 'powders', 'data-item="jarCocoa"')] },
  eq_juice: { layers: [side(R, 'juice', 'data-item="juice"')] },
  eq_whipper: { layers: [side(R, 'whipper', 'data-item="whipper"')] },
  eq_blender: { layers: [side(R, 'blender', 'data-item="blender"')] },
  eq_boba: { layers: [side(L, 'boba', 'data-item="boba"')], crop: [730, 390, 120, 120] },
  eq_shaker: { layers: [side(R, 'shaker', 'data-item="shaker"')] },
  eq_drip: { layers: [whole(C, 'drip'), whole(C, 'dripFront')], line: 0.8 },
  eq_ice: { layers: [whole(C, 'ice')], line: 0.8, crop: [630, 606, 112, 112] },
  eq_case_snacks: { layers: [whole(C, 'showcase'), whole(C, 'scSnacks'), whole(C, 'showcaseGlass')], line: 0.7, crop: [282, 620, 90, 90] },
  eq_case_pastry: { layers: [whole(C, 'showcase'), whole(C, 'scPastry'), whole(C, 'showcaseGlass')], line: 0.7, crop: [413, 620, 90, 90] },
  eq_case_dessert: { layers: [whole(C, 'showcase'), whole(C, 'scDessert'), whole(C, 'showcaseGlass')], line: 0.7, crop: [282, 655, 90, 90] }
};

/** Все id позиций, у которых иконка берётся с бара (для теста). */
export const BAR_ICON_IDS: readonly string[] = Object.keys(SPECS);

/** Целевая толщина контура на экране, px, при размере иконки 46 px: L / M / D из палитры, уменьшенные под мелкий значок. */
const ICON_PX = 46;
const LINE = 0.62;
/** Поля кадра: с каждой стороны по 10 % от стороны кадра (предмет занимает 80 % по длинной стороне). */
export const ICON_PAD = 0.1;

type Box = readonly [number, number, number, number];
const boxes = BOXES as unknown as Record<string, Box>;

/** Квадратный кадр иконки по рамке предмета [x, y, w, h]: центр совпадает с центром рамки, длинная сторона занимает 1 − 2 · ICON_PAD кадра. */
export function iconView(box: Box): { cx: number; cy: number; s: number } {
  const [x, y, w, h] = box;
  return { cx: x + w / 2, cy: y + h / 2, s: Math.max(w, h) / (1 - 2 * ICON_PAD) };
}

function restroke(body: string, srcScale: number, s: number, line: number): string {
  return body.replace(/stroke-width="([\d.]+)"/g, (_m, v: string) => `stroke-width="${((Number(v) * srcScale * LINE * line * s) / ICON_PX).toFixed(2)}"`);
}

function layersOf(spec: Spec, s: number): string {
  return spec.layers
    .map((l) => {
      const src = l.part[l.id];
      if (!src) throw new Error('нет части ' + l.id);
      const g = l.marker ? groupOf(src.svg, l.marker) : src.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      const wrapped = l.part !== C; /* предметы боковых секций нарисованы в проектных единицах и растянуты ×1,10 обёрткой */
      return restroke(g, wrapped ? 1.1 : 1, s, spec.line ?? 1);
    })
    .join('');
}

/** Разметка без кадра (для замера рамки скриптом scripts/shop-icon-boxes.mjs): слои в проектных координатах, толщины как в итоговой иконке при кадре 100. */
export function shopBarIconRaw(id: string): string {
  const spec = SPECS[id];
  if (!spec) throw new Error('нет иконки ' + id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2000" viewBox="0 0 2000 2000"><g>${layersOf(spec, 100)}</g></svg>`;
}

/** Разметка `<svg>` иконки позиции магазина `eq_*` по предмету бара; null — для позиций без предмета на баре. */
export function shopBarIcon(id: string): string | null {
  const spec = SPECS[id];
  if (!spec) return null;
  const box = spec.crop ?? boxes[id];
  if (!box) throw new Error('нет рамки иконки ' + id + ': запустите node scripts/shop-icon-boxes.mjs');
  const { cx, cy, s } = iconView(box);
  return `<svg viewBox="${(cx - s / 2).toFixed(1)} ${(cy - s / 2).toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}" aria-hidden="true" data-shopicon="${id}"><g stroke="#4A2F25" stroke-linejoin="round" stroke-linecap="round">${layersOf(spec, s)}</g></svg>`;
}
