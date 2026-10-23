import { describe, expect, test } from 'vitest';
import PAL from '../art-src/palette.json';
import { barObject, fillCounts, groupOf, jarFor, panelArt, sourceOf } from '../src/ui/panelArt';

/* 31-2, шаг 3: окна станций нового ядра рисуются теми же предметами, что стоят на баре. Тест падает, если окно потеряло главные цвета
   предмета бара, использует цвет вне палитры или толщину вне L/M/D. */
const TASKS = ['whisk', 'brew', 'juice', 'tonic', 'powder', 'boba', 'topping', 'blend', 'shake', 'foam', 'whip', 'layer'] as const;
const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
const TOKENS = [PAL.stroke.L, PAL.stroke.M, PAL.stroke.D];
/** Заливки предмета, которые окно заменяет цветом напитка (налив вместо встроенного чая, порошок банки). */
const REPLACED: Record<string, string[]> = { brew: ['TERRA', 'BAKE'], powder: ['CHOC'] };
const col = (task: string): string => (task === 'powder' ? PAL.colors.CHOC : PAL.colors.MUSTARD);
const art = (task: string, drink?: string): string => panelArt({ task, col: col(task), col2: PAL.colors.PAPER, drink });

/** Строка без вложенных групп с масштабом (data-k): толщины внутри них проверяются отдельно (значение × k). */
function split(svg: string): { flat: string; scaled: { k: number; body: string }[] } {
  const scaled: { k: number; body: string }[] = [];
  let flat = svg;
  for (;;) {
    const at = flat.indexOf('<g data-k="');
    if (at < 0) break;
    const el = groupOf(flat, '<g data-k="' + flat.slice(at + 11, flat.indexOf('"', at + 11)) + '"');
    const i = flat.indexOf(el, 0);
    scaled.push({ k: Number(/^<g data-k="([\d.]+)"/.exec(el)?.[1]), body: el });
    flat = flat.slice(0, i) + flat.slice(i + el.length);
  }
  return { flat, scaled };
}

describe('окна станций: предметы бара', () => {
  for (const task of TASKS) {
    test(`${task}: цвета только из палитры, толщины только L/M/D`, () => {
      const svg = art(task, 'cocoa');
      for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), `цвет ${m[1]}`).toBe(true);
      const { flat, scaled } = split(svg);
      for (const m of flat.matchAll(/stroke-width="([\d.]+)"/g)) expect(TOKENS, `толщина ${m[1]}`).toContain(Number(m[1]));
      for (const g of scaled) for (const m of g.body.matchAll(/stroke-width="([\d.]+)"/g)) {
        const v = Number(m[1]) * g.k;
        expect(TOKENS.some((t) => Math.abs(t - v) < 0.08), `толщина ${m[1]} × ${g.k} = ${v.toFixed(2)}`).toBe(true);
      }
    });
    test(`${task}: окно берёт три главных цвета предмета бара`, () => {
      const src = sourceOf(task, 'cocoa');
      if (!src.length) return; /* предмет бара — бутылка (форма как у бутылок холодильника и полки сиропов), см. bottleSvg */
      const svg = art(task, 'cocoa').toUpperCase();
      for (const s of src) {
        let obj = barObject(s.part, s.marker);
        for (const name of REPLACED[task] ?? []) obj = obj.replace(new RegExp(`fill="${(PAL.colors as Record<string, string>)[name]}"`, 'gi'), '');
        const top = fillCounts(obj).slice(0, 3).map((x) => x[0]);
        expect(top.length).toBeGreaterThan(0);
        for (const c of top) expect(svg.includes(c), `${task}: цвет ${c} предмета ${s.marker}`).toBe(true);
      }
    });
  }
  test('налив: у каждого окна есть #xpLiq с data-top и data-full; у окон «залить» есть #xpMark', () => {
    for (const t of TASKS) {
      const svg = art(t);
      if (t !== 'whip') expect(svg, t).toMatch(/id="xpLiq" data-top="[\d.]+" data-full="[\d.]+"/);
    }
    for (const t of ['juice', 'tonic', 'powder', 'boba', 'topping']) expect(art(t), t).toMatch(/id="xpMark" data-top=/);
  });
  test('банка порошков выбирается по напитку', () => {
    expect(jarFor('cocoa')).toBe('jarCocoa');
    expect(jarFor('chicory_latte')).toBe('jarChicory');
    expect(jarFor('protein_milk')).toBe('jarProtein');
    expect(sourceOf('powder', 'protein_water')[0]?.marker).toContain('jarProtein');
  });
});
