/**
 * Зал вне игровых бросков (32-Д): декоративный гость за столиком и его тайминги берут отдельный генератор,
 * поэтому Math.random игры (заказы, терпение, внешность гостей смены) от зала не зависит.
 */
import type { Rng } from './types';

/** Первый сидящий после старта дня или меню приходит через столько секунд. */
export const SIT_FIRST_DELAY: readonly [number, number] = [6, 15];
/** Сколько сидит, с. */
export const SIT_STAY: readonly [number, number] = [28, 60];
/** Пауза между сидящими, с. */
export const SIT_PAUSE: readonly [number, number] = [4, 12];

export function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Зерно зала: номер сброса и часы запуска; каждый сброс даёт новый поток. */
export const hallSeed = (counter: number, clock: number): number => (Math.imul(counter + 1, 0x9e3779b1) ^ Math.floor(clock)) >>> 0;

/** Число из диапазона [a, b] по генератору. */
export const between = (r: Rng, range: readonly [number, number]): number => range[0] + r() * (range[1] - range[0]);
