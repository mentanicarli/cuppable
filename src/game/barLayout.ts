/** Раскладка интерфейса бара (31-3): чистые числа без DOM. */

/** Верх полосы тостов по умолчанию (под одной строкой билета). */
export const TOAST_TOP_MIN = 136;
/** Зазор между низом билета и тостом. */
export const TOAST_GAP = 8;

/** Где начинаются тосты бара (`#bFloat`, `#toast`): не выше обычной полосы и всегда ниже низа билета (с раскрытой частью). */
export function toastTop(ticketBottom: number): number {
  return Math.max(TOAST_TOP_MIN, Math.ceil(ticketBottom) + TOAST_GAP);
}
