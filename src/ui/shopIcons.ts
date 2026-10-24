/**
 * Иконки позиций магазина оборудования (31-7): у каждой станции иконка — её предмет с бара (те же группы из bar-parts-*.json),
 * поэтому игрок узнаёт покупку на баре. Предмет берётся по метке `data-item` / `data-glass` (или целой частью), кадрируется квадратом
 * `view` в проектных координатах, а толщина контура пересчитывается так, чтобы на экране (иконка 46 px) остались линии около 2 px.
 * Кувшин сливок на баре отдельного предмета не имеет, его иконка нарисована вручную в 11-screens.js.
 */
import LEFT from '../assets/art/bar-parts-left.json';
import RIGHT from '../assets/art/bar-parts-right.json';
import CENTER from '../assets/art/bar-parts.json';
import { groupOf } from './panelArt';

type Part = { svg: string; box: { x: number; y: number; w: number; h: number } };
const L = LEFT as unknown as Record<string, Part>;
const R = RIGHT as unknown as Record<string, Part>;
const C = CENTER as unknown as Record<string, Part>;

/** Квадрат кадра: центр и сторона в проектных координатах части. */
interface View { cx: number; cy: number; s: number }
interface Layer { part: Record<string, Part>; id: string; marker?: string }
interface Spec { layers: Layer[]; view: View; /** множитель толщины контура (мелкие предметы тоньше) */ line?: number }

const side = (part: Record<string, Part>, id: string, marker: string): Layer => ({ part, id, marker });
const whole = (part: Record<string, Part>, id: string): Layer => ({ part, id });

/** Иконки по id позиции магазина (`eq_<оборудование>`). Кувшина сливок здесь нет (рисуется вручную). */
const SPECS: Readonly<Record<string, Spec>> = {
  eq_tea: { layers: [side(L, 'tea', 'data-item="glassTeapot"')], view: { cx: 236, cy: 474, s: 84 } },
  eq_matcha: { layers: [side(L, 'matcha', 'data-item="bowl"'), side(L, 'matcha', 'data-item="whisk"')], view: { cx: 569, cy: 472, s: 124 } },
  eq_powders: { layers: [side(L, 'powders', 'data-item="jarCocoa"')], view: { cx: 776, cy: 438, s: 100 } },
  eq_juice: { layers: [side(R, 'juice', 'data-item="juice"')], view: { cx: 142, cy: 399, s: 228 } },
  eq_whipper: { layers: [side(R, 'whipper', 'data-item="whipper"')], view: { cx: 330, cy: 417, s: 196 } },
  eq_blender: { layers: [side(R, 'blender', 'data-item="blender"')], view: { cx: 618, cy: 397, s: 232 } },
  eq_boba: { layers: [side(L, 'boba', 'data-item="boba"')], view: { cx: 790, cy: 450, s: 150 } },
  eq_shaker: { layers: [side(R, 'shaker', 'data-item="shaker"')], view: { cx: 1088, cy: 455, s: 150 } },
  eq_drip: { layers: [whole(C, 'drip'), whole(C, 'dripFront')], view: { cx: 924, cy: 426, s: 176 }, line: 0.8 },
  eq_ice: { layers: [whole(C, 'ice')], view: { cx: 686, cy: 662, s: 140 }, line: 0.8 },
  eq_case_snacks: { layers: [whole(C, 'showcase'), whole(C, 'scSnacks'), whole(C, 'showcaseGlass')], view: { cx: 327, cy: 665, s: 112 }, line: 0.7 },
  eq_case_pastry: { layers: [whole(C, 'showcase'), whole(C, 'scPastry'), whole(C, 'showcaseGlass')], view: { cx: 458, cy: 665, s: 112 }, line: 0.7 },
  eq_case_dessert: { layers: [whole(C, 'showcase'), whole(C, 'scDessert'), whole(C, 'showcaseGlass')], view: { cx: 327, cy: 700, s: 112 }, line: 0.7 },
  eq_fridge_deli: { layers: [whole(C, 'showcase'), whole(C, 'scDeli'), whole(C, 'showcaseGlass')], view: { cx: 458, cy: 700, s: 112 }, line: 0.7 },
  eq_microwave: { layers: [whole(C, 'scMicro')], view: { cx: 932, cy: 662, s: 124 }, line: 0.8 }
};

/** Все id позиций, у которых иконка берётся с бара (для теста). */
export const BAR_ICON_IDS: readonly string[] = Object.keys(SPECS);

/** Целевая толщина контура на экране, px, при размере иконки 46 px: L / M / D из палитры, уменьшенные под мелкий значок. */
const ICON_PX = 46;
const LINE = 0.62;

function restroke(body: string, srcScale: number, s: number, line: number): string {
  return body.replace(/stroke-width="([\d.]+)"/g, (_m, v: string) => `stroke-width="${((Number(v) * srcScale * LINE * line * s) / ICON_PX).toFixed(2)}"`);
}

/** Разметка `<svg>` иконки позиции магазина `eq_*` по предмету бара; null — для позиций без предмета на баре. */
export function shopBarIcon(id: string): string | null {
  const spec = SPECS[id];
  if (!spec) return null;
  const { cx, cy, s } = spec.view;
  const inner = spec.layers
    .map((l) => {
      const src = l.part[l.id];
      if (!src) throw new Error('нет части ' + l.id);
      const g = l.marker ? groupOf(src.svg, l.marker) : src.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      const wrapped = l.part !== C; /* предметы боковых секций нарисованы в проектных единицах и растянуты ×1,10 обёрткой */
      return restroke(g, wrapped ? 1.1 : 1, s, spec.line ?? 1);
    })
    .join('');
  return `<svg viewBox="${cx - s / 2} ${cy - s / 2} ${s} ${s}" aria-hidden="true" data-shopicon="${id}"><g stroke="#4A2F25" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
}
