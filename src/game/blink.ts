/**
 * Моргание гостей (32-Г): чистые правила без часов и Math.random.
 * У каждого актёра своё зерно от его номера, поэтому поток Math.random игры (заказы, терпение, внешность) моргание не трогает.
 */
import type { Rng } from './types';

/** Пауза между морганиями, с. */
export const BLINK_GAP: readonly [number, number] = [2.5, 6];
/** Длительность одного моргания, с. */
export const BLINK_DUR: readonly [number, number] = [0.12, 0.18];
/** Доли длительности: полузакрыто → закрыто → полузакрыто (потом открыто). */
export const BLINK_SHARES: readonly [number, number, number] = [0.3, 0.4, 0.3];
/** 0 открыто, 1 полузакрыто, 2 закрыто. */
export type BlinkPhase = 0 | 1 | 2;

/** Фаза через elapsed секунд после начала моргания длительностью dur. */
export function blinkPhase(elapsed: number, dur: number): BlinkPhase {
  if (elapsed < 0 || elapsed >= dur) return 0;
  const t = elapsed / dur;
  if (t < BLINK_SHARES[0]) return 1;
  if (t < BLINK_SHARES[0] + BLINK_SHARES[1]) return 2;
  return 1;
}

/** Генератор от номера актёра (mulberry32 от хеша номера): одинаковый номер даёт одинаковую последовательность. */
export function actorRng(id: number): Rng {
  let a = (Math.imul(id | 0, 0x9e3779b1) ^ 0x85ebca6b) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Следующее моргание: пауза до него и его длительность (два числа из генератора). */
export function nextBlink(r: Rng): { gap: number; dur: number } {
  return { gap: BLINK_GAP[0] + r() * (BLINK_GAP[1] - BLINK_GAP[0]), dur: BLINK_DUR[0] + r() * (BLINK_DUR[1] - BLINK_DUR[0]) };
}

/** Первые n морганий актёра с таким номером (для тестов и отладки). */
export function blinkPlan(id: number, n: number): { gap: number; dur: number }[] {
  const r = actorRng(id);
  return Array.from({ length: n }, () => nextBlink(r));
}
