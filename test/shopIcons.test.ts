import { describe, expect, test } from 'vitest';
import SCREENS from '../src/legacy/11-screens.js?raw';
import PAL from '../art-src/palette.json';
import { EQUIPMENT, EQ_IMPL } from '../src/game/menu';
import { SHOP_BASE } from '../src/game/playerModel';
import { BAR_ICON_IDS, ICON_PAD, iconView, shopBarIcon } from '../src/ui/shopIcons';
import BOXES from '../src/assets/art/shop-icon-boxes.json';

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
    expect([...handEq].sort()).toEqual(['eq_cream', 'eq_fridge_deli', 'eq_microwave']); /* 31-9: микроволновка на баре тёмная, холодильник для сэндвичей слишком похож на витрину: рисуем вручную */
    expect(shopBarIcon('eq_cream')).toBeNull();
  });

  /* 31-9: общее правило кадра: центр кадра = центр рамки предмета (или заданного окна), длинная сторона рамки занимает 1 − 2 · ICON_PAD кадра */
  test('кадр иконок бара: центрирование по рамке и одинаковые поля (80 % по длинной стороне)', () => {
    expect(ICON_PAD).toBe(0.1);
    const boxes = BOXES as unknown as Record<string, [number, number, number, number]>;
    for (const id of BAR_ICON_IDS) {
      expect(boxes[id], `рамка ${id}`).toBeDefined();
      const s = shopBarIcon(id) as string;
      const [x, y, w, h] = (/viewBox="([\d. -]+)"/.exec(s)?.[1] ?? '').split(' ').map(Number) as [number, number, number, number];
      expect(Math.abs(w - h), `${id}: кадр квадратный`).toBeLessThan(0.2);
      const v = iconView(boxes[id] as [number, number, number, number]);
      /* у иконок с окном (витрины, лёд, бабл ти) кадр считается по окну, у остальных по замеренной рамке */
      const crop = ['eq_boba', 'eq_ice', 'eq_case_snacks', 'eq_case_pastry', 'eq_case_dessert'].includes(id);
      if (!crop) {
        expect(Math.abs(x + w / 2 - v.cx), `${id}: центр по x`).toBeLessThan(0.2);
        expect(Math.abs(y + h / 2 - v.cy), `${id}: центр по y`).toBeLessThan(0.2);
        const [, , bw, bh] = boxes[id] as [number, number, number, number];
        expect(Math.max(bw, bh) / w, `${id}: доля длинной стороны`).toBeCloseTo(1 - 2 * ICON_PAD, 2);
      }
    }
  });
  test('рукописные иконки (сливки, микроволновка, холодильник): три толщины контура, цвета из палитры, кадр 64 × 64', () => {
    const H2 = hand();
    const pal = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()).concat(['#fbf1d0', '#e9d4a4', '#e8e2d6']));
    for (const id of ['eq_cream', 'eq_microwave', 'eq_fridge_deli']) {
      const svg = H2[id] as string;
      expect(svg, id).toContain('viewBox="0 0 64 64"');
      const widths = new Set([...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]));
      expect(widths.size, `${id}: толщины ${[...widths].join(', ')}`).toBeGreaterThanOrEqual(2);
      for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(pal.has((m[1] as string).toLowerCase()), `${id}: цвет ${m[1]}`).toBe(true);
    }
    /* силуэт: холодильник высокий (в кадре выше, чем шире), микроволновка и витрины широкие */
    const fr = H2['eq_fridge_deli'] as string, mw = H2['eq_microwave'] as string;
    expect(/<rect x="17" y="5" width="30" height="50"/.test(fr)).toBe(true);
    expect(/<rect x="5" y="13" width="54" height="35"/.test(mw)).toBe(true);
  });
});
