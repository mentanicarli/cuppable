import { describe, expect, test } from 'vitest';
import SCREENS from '../src/legacy/11-screens.js?raw';
import { EQUIPMENT, EQ_IMPL } from '../src/game/menu';
import { SHOP_BASE } from '../src/game/playerModel';
import { BAR_ICON_IDS, shopBarIcon } from '../src/ui/shopIcons';

/* 31-7: у каждой позиции магазина своя иконка. Рукописные лежат в SHOP_ICON (11-screens.js), у оборудования с предметом на баре — shopBarIcon. */
const hand = (): Record<string, string> => {
  const block = /const SHOP_ICON = \{([\s\S]*?)\n\};/.exec(SCREENS)?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/^\s*([\w]+):\s*`(<svg[\s\S]*?<\/svg>)`/gm)) out[m[1] as string] = m[2] as string;
  return out;
};
const ids = [...SHOP_BASE.map((i) => i.id), ...EQUIPMENT.filter((e) => EQ_IMPL.includes(e.id)).map((e) => 'eq_' + e.id)];

describe('иконки магазина (31-7)', () => {
  const H = hand();
  const icon = (id: string): string => H[id] ?? shopBarIcon(id) ?? '';
  test('у каждой позиции есть своя иконка, запасной «machine» никому не достаётся', () => {
    for (const id of ids) {
      expect(icon(id).length, id).toBeGreaterThan(50);
      if (id !== 'machine') expect(icon(id), id).not.toBe(H['machine']);
    }
  });
  test('все иконки различаются по разметке', () => {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const s = icon(id);
      expect(seen.get(s), `${id} повторяет ${seen.get(s)}`).toBeUndefined();
      seen.set(s, id);
    }
    expect(seen.size).toBe(ids.length);
  });
  test('иконки предметов бара: квадратный кадр, палитра контура, у оборудования без предмета на баре только кувшин сливок', () => {
    for (const id of BAR_ICON_IDS) {
      const s = shopBarIcon(id) as string;
      expect(s, id).toMatch(/^<svg viewBox="[\d. -]+" aria-hidden="true"/);
      expect(s, id).toContain('stroke="#4A2F25"');
      expect(s, id).not.toMatch(/stroke-width="0(\.0\d?)?"/);
    }
    const handEq = ids.filter((id) => id.startsWith('eq_') && !BAR_ICON_IDS.includes(id));
    expect(handEq).toEqual(['eq_cream']);
    expect(shopBarIcon('eq_cream')).toBeNull();
  });
});
