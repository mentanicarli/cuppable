/**
 * План чашки в зале (Н2-4): масштаб (px экрана на единицу модели), уровень детализации и ключ текстуры для чашки в руке баристы, в руке и на столе гостя, в полёте.
 * Чистая логика без Pixi: тесты перебирают все 56 видов × размеры × места. Масштаб зала меняется одной константой (`CUP_TOP_PX`), логика не трогается (блок 30).
 */
import { lodFor, specOf, type DrinkSpec, type Lod, type Material, type ModelRef } from '../../game/drinkModel';
import { GUEST_K } from './art';
import { geomOf, seatOf } from './drinkModel';
import { modelTexKey } from './texCache';

export type CupPlace = 'barista' | 'guest' | 'fly';
/** Ширина обода чашки 0,2 л (k = 1) на экране, px: рука баристы 33 (было 22 × 1,5), рука и стол гостя 18 × GUEST_K, полёт 22. Размеры крупнее растут вместе с моделью (k = cupScale). */
export const CUP_TOP_PX: Readonly<Record<CupPlace, number>> = { barista: 33, guest: 18 * GUEST_K, fly: 22 };
/** Ширина обода в единицах модели при k = 1 (стакан 92, керамика 110, демитас 80). */
const MODEL_TOP: Readonly<Record<Material, number>> = { glass: 92, ceramic: 110, demitas: 80 };
/** px экрана на единицу модели для места и посуды. */
export const cupUnit = (place: CupPlace, material: Material): number => CUP_TOP_PX[place] / MODEL_TOP[material];

export interface CupPlan {
  spec: DrinkSpec;
  unit: number;
  /** высота корпуса на экране, px */
  heightPx: number;
  lod: Lod;
  key: string;
}
/** Что и как рисовать для чашки напитка в месте `place` при плотности `res`. Чашка в руке и на столе рисуется без блюдца (блюдце на столе есть в сцене). */
export function cupPlan(ref: ModelRef, place: CupPlace, res: number): CupPlan {
  const spec = specOf(ref.id, ref.size, ref.cold);
  const unit = cupUnit(place, spec.vessel.material);
  const heightPx = geomOf(spec.vessel).H * unit;
  const lod = lodFor(heightPx);
  return { spec, unit, heightPx, lod, key: `${modelTexKey(spec, lod, res)}|${place}|cup` };
}

/** Чашка на блюдце гостя (31-1). Якорь чашки в координатах гостя (x от оси гостя 230) и опускание основания модели относительно якоря (`syncCupModel`: спрайт сдвинут на 11). */
export const TABLE_CUP = { x: 52, y: 538, baseDrop: 11 } as const;
/** Центр светлого углубления блюдца на столе в координатах столика (art-src/hall/saucer.svg: эллипс cx 282, cy 549,5). */
export const SAUCER_RECESS = { x: 282, y: 549.5 } as const;
/** Ось гостя по x в координатах столика (якорь чашки отсчитывается от неё). */
export const GUEST_AXIS_X = 230;

/** Центр углубления под донышком модели в координатах столика при смещении спрайта на `dy` (по умолчанию 0). */
export function tableCupRecess(ref: ModelRef, dy = 0): { x: number; y: number } {
  const plan = cupPlan(ref, 'guest', 1);
  const seat = seatOf(geomOf(plan.spec.vessel), plan.lod);
  return { x: GUEST_AXIS_X + TABLE_CUP.x, y: TABLE_CUP.y + TABLE_CUP.baseDrop + dy + (seat.recess.cy * plan.unit) / GUEST_K };
}

/** Вертикальный сдвиг чашки на столе, при котором центр донышка совпадает с центром углубления блюдца (стакан, керамика, демитас, любой размер). */
export function tableCupDy(ref: ModelRef): number {
  return SAUCER_RECESS.y - tableCupRecess(ref).y;
}
