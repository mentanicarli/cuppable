/** Раскладка интерфейса бара (31-3): чистые числа без DOM. */

/** Верх полосы тостов по умолчанию (под одной строкой билета). */
export const TOAST_TOP_MIN = 136;
/** Зазор между низом билета и тостом. */
export const TOAST_GAP = 8;

/** Где начинаются тосты бара (`#bFloat`, `#toast`): не выше обычной полосы и всегда ниже низа билета (с раскрытой частью). */
export function toastTop(ticketBottom: number): number {
  return Math.max(TOAST_TOP_MIN, Math.ceil(ticketBottom) + TOAST_GAP);
}

/* ---------- тост зала и реплики гостей (31-9) ---------- */
export interface LayoutBox { x: number; y: number; w: number; h: number }
/** Сцена 1280 × 720 (логические пиксели; при 1024 × 600 весь интерфейс масштабируется целиком, раскладка та же). */
export const STAGE_W = 1280;
/** Обычное место тоста в зале: слева под шапкой (`#toast`: left 24, top 70). */
export const HALL_TOAST = { x: 24, y: 70 };
/** Нижнее место тоста в зале: по центру, низ на y 652, выше строки подсказки «Нажмите на клиента…» (она занимает y 664–700). */
export const HALL_TOAST_LOW_BOTTOM = 652;
/** Зазор между тостом и репликой гостя. */
export const HALL_GAP = 8;

const overlaps = (a: LayoutBox, b: LayoutBox, gap: number): boolean => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Где стоит тост в зале: наверху слева, а если там он задевает реплику гостя (или другую плашку из avoid), то внизу по центру, где реплик не бывает.
    Реплика всегда стоит над пузырём заказа гостя, поэтому двигаем тост, а не реплику. */
export function hallToastPos(toast: { w: number; h: number }, avoid: readonly LayoutBox[], gap: number = HALL_GAP): { x: number; y: number; low: boolean } {
  const top: LayoutBox = { x: HALL_TOAST.x, y: HALL_TOAST.y, w: toast.w, h: toast.h };
  if (!avoid.some((b) => overlaps(top, b, gap))) return { x: top.x, y: top.y, low: false };
  return { x: Math.round((STAGE_W - toast.w) / 2), y: HALL_TOAST_LOW_BOTTOM - toast.h, low: true };
}
