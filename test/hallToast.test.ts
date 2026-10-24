import { describe, expect, test } from 'vitest';
import { HALL_GAP, HALL_TOAST, HALL_TOAST_LOW_BOTTOM, STAGE_W, hallToastPos, type LayoutBox } from '../src/game/barLayout';

/* 31-9: тост зала (#toast) и реплики гостей (.say) не налезают друг на друга; реплика всегда над пузырём гостя, поэтому двигается тост */
const hit = (a: LayoutBox, b: LayoutBox, gap = 0): boolean => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
const TOASTS = [{ w: 120, h: 38 }, { w: 330, h: 38 }, { w: 380, h: 62 }];

describe('тост зала и реплики гостей', () => {
  test('нет реплик: тост на обычном месте (слева сверху)', () => {
    for (const t of TOASTS) expect(hallToastPos(t, [])).toEqual({ x: HALL_TOAST.x, y: HALL_TOAST.y, low: false });
  });
  test('реплика гостя на пути: тост уходит вниз по центру, низ на y 652, середина сцены', () => {
    const say: LayoutBox = { x: 16, y: 92, w: 330, h: 32 }; /* худший случай из кадра 31-8: гость у левого края, реплика прямо под тостом */
    for (const t of TOASTS) {
      const p = hallToastPos(t, [say]);
      expect(p.low).toBe(true);
      expect(p.y + t.h).toBe(HALL_TOAST_LOW_BOTTOM);
      expect(p.x + t.w / 2).toBeCloseTo(STAGE_W / 2, 0);
      expect(hit({ x: p.x, y: p.y, w: t.w, h: t.h }, say, HALL_GAP)).toBe(false);
    }
  });
  test('перебор: реплика шириной 120–330 в любом x и на любой высоте над пузырём (верх 80…330) никогда не пересекается с тостом', () => {
    for (const t of TOASTS) for (let w = 120; w <= 330; w += 70) for (let x = 0; x <= STAGE_W - w; x += 40) for (let y = 80; y <= 330; y += 10) {
      const say: LayoutBox = { x, y, w, h: 32 };
      const p = hallToastPos(t, [say]);
      expect(hit({ x: p.x, y: p.y, w: t.w, h: t.h }, say, HALL_GAP), `реплика ${x},${y},${w}, тост ${t.w}×${t.h} → ${p.x},${p.y}`).toBe(false);
    }
  });
  test('несколько реплик и плашка помощника справа: тост не задевает ни одну', () => {
    const avoid: LayoutBox[] = [{ x: 200, y: 100, w: 300, h: 32 }, { x: 600, y: 110, w: 300, h: 32 }, { x: 1020, y: 84, w: 236, h: 34 }];
    const p = hallToastPos(TOASTS[1] as { w: number; h: number }, avoid);
    for (const b of avoid) expect(hit({ x: p.x, y: p.y, w: 330, h: 38 }, b, HALL_GAP)).toBe(false);
  });
  test('нижнее место свободно от шапки (HUD до y 68) и строки подсказки (y 664–700)', () => {
    for (const t of TOASTS) {
      const p = hallToastPos(t, [{ x: 0, y: 0, w: STAGE_W, h: 400 }]);
      expect(p.y).toBeGreaterThan(68);
      expect(p.y + t.h + HALL_GAP).toBeLessThanOrEqual(664);
    }
  });
  test('числа CSS (base.css: #toast left 24, top 70; #toast.low bottom 68) совпадают с константами; сами правила проверяет e2e/toast_say.js', () => {
    expect(HALL_TOAST).toEqual({ x: 24, y: 70 });
    expect(720 - HALL_TOAST_LOW_BOTTOM).toBe(68);
  });
});
