import { describe, expect, test } from 'vitest';
import CENTER from '../src/assets/art/bar-parts.json';
import PAL from '../art-src/palette.json';
import { fillCounts } from '../src/ui/panelArt';
import { PITCHER_INNER, PITCHER_K, pitcherSvg } from '../src/render/pitcherArt';

/* 31-3, шаг 4: окно «Пар» кладёт питчер бара (pitFront), а не свой рисунок. */
const bar = (CENTER as unknown as Record<string, { svg: string }>).pitFront?.svg ?? '';

describe('окно «Пар»: питчер бара', () => {
  const doc = pitcherSvg().svg;
  test('главные заливки питчера бара есть в картинке окна', () => {
    const top = fillCounts(bar).slice(0, 3).map((x) => x[0]);
    expect(top.length).toBe(3);
    for (const c of top) expect(doc.toUpperCase().includes(c), c).toBe(true);
    expect(doc.toUpperCase()).toContain(PAL.colors.STEEL.toUpperCase());
  });
  test('цвета из палитры, толщины после масштаба — L/M/D', () => {
    const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
    for (const m of doc.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()), m[1]).toBe(true);
    const tokens = [PAL.stroke.L, PAL.stroke.M, PAL.stroke.D];
    for (const m of doc.matchAll(/stroke-width="([\d.]+)"/g)) expect(tokens.some((t) => Math.abs(t - Number(m[1]) * PITCHER_K) < 0.08), `${m[1]} × ${PITCHER_K}`).toBe(true);
  });
  test('полость лежит внутри корпуса питчера (вершины внутри рамки обода и донышка)', () => {
    for (const [x, y] of PITCHER_INNER) {
      expect(Math.abs(x)).toBeLessThanOrEqual(31);
      expect(y).toBeGreaterThanOrEqual(-78);
      expect(y).toBeLessThanOrEqual(-4);
    }
  });
});
