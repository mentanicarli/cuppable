import { describe, expect, test } from 'vitest';
import { TOAST_GAP, TOAST_TOP_MIN, toastTop } from '../src/game/barLayout';

describe('тосты бара ниже билета (31-3)', () => {
  test('toastTop = max(136, низ билета + 8)', () => {
    expect(toastTop(0)).toBe(136);
    expect(toastTop(54)).toBe(136);
    expect(toastTop(128)).toBe(136);
    expect(toastTop(129)).toBe(137);
    expect(toastTop(189)).toBe(197);
    expect(toastTop(189.2)).toBe(198);
    expect(TOAST_TOP_MIN).toBe(136);
    expect(TOAST_GAP).toBe(8);
  });
  test('тост никогда не выше билета', () => {
    for (let b = 0; b < 400; b += 7) expect(toastTop(b)).toBeGreaterThanOrEqual(b + TOAST_GAP);
  });
});
