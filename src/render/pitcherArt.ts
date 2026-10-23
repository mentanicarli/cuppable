/**
 * Питчер окна «Пар» (31-3): та же группа, что стоит на баре (`pitFront` в bar-parts.json), в масштабе окна. Вместо отдельного
 * рисунка окно кладёт эту картинку и вырезает в корпусе окно с молоком (разрез стального питчера), поэтому цвета и контуры
 * (STEEL, STEEL_HI, STEEL_SH, L/M/D) те же, что на баре.
 */
import CENTER from '../assets/art/bar-parts.json';

type Part = { svg: string };
const PIT = (CENTER as unknown as Record<string, Part>).pitFront as Part;

/** Масштаб окна к бару (обод питчера 56 → 150 px). */
export const PITCHER_K = 150 / 56;
/** Якорь питчера в окне: центр обода по x и донышко по y. */
export const PITCHER_ANCHOR = { x: 137, y: 332 } as const;
/** Рамка группы в единицах бара относительно якоря (носик слева, ручка справа). */
export const PITCHER_BOX = { x: -40, y: -84, w: 89, h: 86 } as const;
/** Полость корпуса (разрез) в единицах бара относительно якоря: по верху у обода, по низу у донышка, с отступом на стенку. */
export const PITCHER_INNER: readonly (readonly [number, number])[] = [[-24, -76], [24, -76], [27, -50], [30, -30], [29, -12], [24, -6], [-24, -6], [-29, -12], [-30, -30], [-27, -50]];

/** SVG-документ картинки питчера (без тени): толщины пересчитаны, чтобы после масштаба остались L/M/D. */
export function pitcherSvg(k = PITCHER_K, res = 2): { svg: string; w: number; h: number } {
  const body = PIT.svg.replace(/stroke-width="([\d.]+)"/g, (_m, v: string) => `stroke-width="${(Number(v) / k).toFixed(2)}"`);
  const w = Math.ceil(PITCHER_BOX.w * k), h = Math.ceil(PITCHER_BOX.h * k);
  const ox = -PITCHER_BOX.x * k, oy = -PITCHER_BOX.y * k;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w * res}" height="${h * res}" viewBox="0 0 ${w} ${h}"><g data-k="${k}" transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k}) translate(-940 -514)">${body}</g></svg>`, w, h };
}

/** Верх-левый угол картинки в окне. */
export const pitcherOrigin = (): { x: number; y: number } => ({ x: PITCHER_ANCHOR.x + PITCHER_BOX.x * PITCHER_K, y: PITCHER_ANCHOR.y + PITCHER_BOX.y * PITCHER_K });
/** Точка полости в координатах окна. */
export const pitcherPt = (p: readonly [number, number]): [number, number] => [PITCHER_ANCHOR.x + p[0] * PITCHER_K, PITCHER_ANCHOR.y + p[1] * PITCHER_K];

let img: HTMLImageElement | null = null;
let ready = false;
/** Загруженная картинка питчера или null (первый вызов запускает загрузку; пока null, окно рисует прежний питчер). */
export function pitcherImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!img) {
    img = new Image();
    img.onload = () => { ready = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pitcherSvg().svg);
  }
  return ready ? img : null;
}
