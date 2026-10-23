import { describe, expect, test } from 'vitest';
import BAR from '../src/legacy/06-bar.js?raw';
import STATE from '../src/legacy/02-state.js?raw';
import { SYRUP_FIRST_RANK, barItems } from '../src/game/barItems';
import { SYRUPS, SYRUP_META } from '../src/game/menu';

describe('предметы бара по покупкам и рангу (31-7)', () => {
  test('первый день: ни питчера, ни полки сиропов', () => {
    expect(barItems({ rank: 1, milk: false, cream: false })).toEqual({ pitcher: false, syrupShelf: false });
  });
  test('питчер виден, только если куплено молоко или сливочный кувшин', () => {
    expect(barItems({ rank: 2, milk: true, cream: false }).pitcher).toBe(true);
    expect(barItems({ rank: 3, milk: false, cream: true }).pitcher).toBe(true);
    expect(barItems({ rank: 9, milk: false, cream: false }).pitcher).toBe(false);
  });
  test('полка сиропов появляется с первого ранга, на котором есть сироп', () => {
    const first = Math.min(...SYRUPS.filter((s) => SYRUP_META[s.name]).map((s) => s.rank));
    expect(SYRUP_FIRST_RANK).toBe(first);
    expect(SYRUP_FIRST_RANK).toBe(2);
    expect(barItems({ rank: first - 1, milk: false, cream: false }).syrupShelf).toBe(false);
    expect(barItems({ rank: first, milk: false, cream: false }).syrupShelf).toBe(true);
  });
  test('#dev не открывает секции и предметы сам: показ повторяет покупки', () => {
    const f = /function secOpenNow\(\)[^\n]*/.exec(BAR)?.[0] ?? '';
    expect(f).toContain('sectionsOpen(G');
    expect(f.replace(/\/\*.*\*\//, '')).not.toMatch(/DEV/);
    expect(STATE).toContain('MENUAPI.barItems(');
  });
});
