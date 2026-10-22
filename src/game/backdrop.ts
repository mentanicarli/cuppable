/**
 * Стена и столешница бара одной полосой на три секции (блок 29-4). Чистая геометрия: числа и функция, которая рисует SVG
 * (цвета и толщины подставляет вызывающий): центр рисует art-src (`scripts/make-backdrop.mjs` кладёт результат в
 * `art-src/bar/wall.svg` и `counter-top.svg`), боковые заглушки секций — `placeholderSvg` в `bar.ts` той же функцией.
 * Секции в мировых координатах: L −1280…0, C 0…1280, R 1280…2560; локальный x каждой секции 0…1280.
 */
export type SectionKey = 'L' | 'C' | 'R';

/** Шаг полос стены (px) и ширина полосы. */
export const STRIPE_STEP = 130;
export const STRIPE_W = 26;
/** Локальный x первой полосы: у центра 60 (полосы на x = 60 + 130k), у боковых — смещение, при котором ритм не рвётся на стыке: у L мировой x −70 + 130k (локально 40 + 130k), у R 1360 + 130k (локально 80 + 130k). */
export const STRIPE_OFFSET: Readonly<Record<SectionKey, number>> = { L: 40, C: 60, R: 80 };
/** Левый край секции в мировых координатах. */
export const SECTION_X: Readonly<Record<SectionKey, number>> = { L: -1280, C: 0, R: 1280 };
export const SECTION_WIDTH = 1280;

/** Высота стены (низ уходит под столешницу) и размеры столешницы: задний бортик, две доски, низ под носом плиты. */
export const WALL_H = 480;
export const COUNTER = { rimTop: 466, rimBottom: 480, seam: 543, bottom: 612 } as const;
/** Стыки досок: период 640 (делит 1280), поэтому одинаковы у всех трёх секций и на краях нет стыков (ближайший в 140 px). */
export const PLANK_PERIOD = 640;
export const PLANK_JOINTS = { row1: [180, 820], row2: [420, 1060] } as const;

/** Локальные x полос стены секции: от смещения с шагом 130 пока полоса целиком в секции. */
export function stripeXs(sec: SectionKey): number[] {
  const xs: number[] = [];
  for (let x = STRIPE_OFFSET[sec]; x + STRIPE_W <= SECTION_WIDTH; x += STRIPE_STEP) xs.push(x);
  return xs;
}

/** Мировые x тех же полос (для проверки непрерывности ритма на стыках). */
export function worldStripeXs(sec: SectionKey): number[] {
  return stripeXs(sec).map((x) => x + SECTION_X[sec]);
}

/** Как подставлять цвета и толщины: имя токена палитры → строка в SVG. */
export interface Fmt {
  col(name: string): string;
  w(name: 'L' | 'M' | 'D'): string;
}

/** Стена секции: плоский фон и вертикальные полосы второго тона; низ стены на y 480 уходит под столешницу. */
export function wallSvg(sec: SectionKey, f: Fmt): string {
  let s = `<rect x="0" y="0" width="${SECTION_WIDTH}" height="${WALL_H}" fill="${f.col('KRAFT')}" stroke="none"/>`;
  s += `<g stroke="none" fill="${f.col('KRAFT_SH')}" fill-opacity=".55">`;
  for (const x of stripeXs(sec)) s += `<rect x="${x}" y="0" width="${STRIPE_W}" height="${WALL_H}"/>`;
  s += '</g>';
  return s;
}

/** Столешница секции: задний бортик, две доски с контуром M между ними, короткие стыки (D), блик по верху каждой доски. Низ y 612 лежит под носом плиты (counterNose, y 607–628). */
export function counterTopSvg(f: Fmt): string {
  const { rimTop, rimBottom, seam, bottom } = COUNTER;
  const stroke = f.col('INK');
  let s = `<g stroke="${stroke}" stroke-linejoin="round" stroke-linecap="round">`;
  s += `<rect x="-6" y="${rimBottom}" width="${SECTION_WIDTH + 12}" height="${seam - rimBottom}" fill="${f.col('TOP')}" stroke="none"/>`;
  s += `<rect x="-6" y="${seam}" width="${SECTION_WIDTH + 12}" height="${bottom - seam}" fill="${f.col('WOOD_HI')}" stroke="none"/>`;
  s += `<rect x="-6" y="${rimTop}" width="${SECTION_WIDTH + 12}" height="${rimBottom - rimTop}" fill="${f.col('WOOD')}" stroke="none"/>`;
  s += `<path d="M-6 ${rimTop}H${SECTION_WIDTH + 6}" fill="none" stroke-width="${f.w('M')}"/>`;
  s += `<path d="M-6 ${rimBottom}H${SECTION_WIDTH + 6}" fill="none" stroke-width="${f.w('D')}"/>`;
  s += `<path d="M-6 ${seam}H${SECTION_WIDTH + 6}" fill="none" stroke-width="${f.w('M')}"/>`;
  s += `<path d="M-6 ${rimBottom + 4}H${SECTION_WIDTH + 6}M-6 ${seam + 4}H${SECTION_WIDTH + 6}" fill="none" stroke="${f.col('HILITE')}" stroke-opacity=".4" stroke-width="${f.w('D')}"/>`;
  s += `<g fill="none" stroke="${f.col('WOOD_SH')}" stroke-width="${f.w('D')}">`;
  for (const x of PLANK_JOINTS.row1) s += `<path d="M${x} ${rimBottom + 1}V${seam - 1}"/>`;
  for (const x of PLANK_JOINTS.row2) s += `<path d="M${x} ${seam + 1}V${bottom}"/>`;
  s += '</g></g>';
  return s;
}
