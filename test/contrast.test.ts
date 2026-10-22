import { describe, expect, test } from 'vitest';
import { MIN_CONTRAST, TAG_BG, contrastRatio, readableOn } from '../src/game/contrast';
import { SYRUP_META } from '../src/game/menu';

describe('readableOn: текст на плашках', () => {
  const bgs: [string, string][] = [
    ...Object.entries(TAG_BG).map(([k, v]): [string, string] => ['плашка ' + k, v]),
    ...Object.entries(SYRUP_META).map(([k, m]): [string, string] => ['сироп ' + k, m.col])
  ];
  test('все 4 плашки и 19 сиропов читаемы (контраст ≥ 4,5)', () => {
    expect(bgs.length).toBe(4 + Object.keys(SYRUP_META).length);
    for (const [name, bg] of bgs) expect(contrastRatio(bg, readableOn(bg)), name).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
  test('кокос (светлый фон) получает тёмный текст, тёмный шоколад — светлый', () => {
    expect(readableOn('#EFE6D2')).toBe('#4A2F25');
    expect(readableOn('#6B4331')).toBe('#FFF8EC');
  });
  test('любой серый фон от чёрного до белого читаем', () => {
    for (let v = 0; v <= 255; v += 5) {
      const h = v.toString(16).padStart(2, '0');
      const bg = '#' + h + h + h;
      expect(contrastRatio(bg, readableOn(bg)), bg).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });
});
