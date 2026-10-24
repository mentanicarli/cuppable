import { describe, expect, test } from 'vitest';
import { deltaE, labOf } from '../src/game/drinkModel';
import { GREY, HAIR, SKIN, type Facial, type FaceSpec, type HairStyle, type Look } from '../src/game/look';
import {
  BEARD_DE, BEARD_SHORT_D, FACE_DIM, FACE_SQUARE_D, FOLD_KEEP_OUT, MOUTH_PATHS, SEAM_D, SEAM_W, STUBBLE_ALPHA_MAX, STUBBLE_ALPHA_MIN, STUBBLE_CLEAR, TURN_SHIFT,
  beardColor, beardLayer, personParts, samplePath, stubbleDots, stubbleSeed, type MoodId
} from '../src/render/world/art';
import { fillShapes, inPoly, marksRaster, raster } from './helpers/hairAudit';
import { pathPoints, type Pt } from './helpers/geom';

const look = (o: Partial<Look>): Look => ({ skin: SKIN[2] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'coat', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 }, ...o });
const MOODS: MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const SHAPES = ['round', 'oval', 'square'] as const;
const toPt = (p: [number, number][]): Pt[] => p.map(([x, y]) => ({ x, y }));
const distTo = (poly: Pt[], p: Pt): number => {
  let m = 1e9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Pt;
    const b = poly[(i + 1) % poly.length] as Pt;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return m;
};
const facePoly = (shape: (typeof SHAPES)[number]): Pt[] => {
  if (shape === 'square') return toPt(samplePath(FACE_SQUARE_D));
  const d = shape === 'round' ? FACE_DIM.round : FACE_DIM.oval;
  return Array.from({ length: 200 }, (_, k) => ({ x: d.rx * Math.cos((k / 200) * 6.2832), y: 432 + d.ry * Math.sin((k / 200) * 6.2832) }));
};

/** Пороги щетины (32-З), подобраны по 40 раскладкам: покрытие 0,28–0,316, макс. расстояние до ближайшего зерна 1,79, мин. между зёрнами 1,14, доля покрытия круга R 2 от 0,17 до 0,66. */
const COVER_MIN = 0.18;
const COVER_MAX = 0.32;
const NEAR_MAX = 2;
const SPACING_MIN = 1;
const HOLE_R = 2;
const HOLE_FILL_MAX = 0.75;
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);

describe('З1 (32-З): щетина — равномерная сетка со сдвигом, плотность падает только у края зоны', () => {
  const zone = toPt(samplePath(BEARD_SHORT_D));
  const zoneR = raster([zone]);
  const keep: Pt[] = [...pathPoints(MOUTH_PATHS.neutral), ...pathPoints('M-2.6 441.9q2.6 2.2 5.2 0')];
  const clearOf = (x: number, y: number, extra: number): boolean => keep.every((q) => Math.hypot(q.x - x, q.y - y) >= STUBBLE_CLEAR + extra);
  const interior = (x: number, y: number): boolean => inPoly({ x, y }, zone) && distTo(zone, { x, y }) >= 3.5 && clearOf(x, y, 1.5) && !(Math.abs(x) < 6.4 && y < 446.6);
  const coverOf = (seed: number): Uint8Array => {
    const svg = beardLayer('stubble', '#3A2A22', 'adult', 0, 'round', seed);
    const g = raster(fillShapes(svg).map((s) => s.poly));
    const m = marksRaster(svg);
    for (let i = 0; i < g.length; i++) if (m[i]) g[i] = 1;
    return g;
  };
  test.each(SEEDS)('seed %i: покрытие зоны 0,18–0,32, ближайшее зерно от любой точки внутри зоны ≤ 2, зёрна не слипаются (≥ 1)', (seed) => {
    const dots = stubbleDots(seed);
    const cover = coverOf(seed);
    let z = 0;
    let c = 0;
    for (let i = 0; i < zoneR.length; i++) if (zoneR[i]) { z++; if (cover[i]) c++; }
    expect(c / z).toBeGreaterThanOrEqual(COVER_MIN);
    expect(c / z).toBeLessThanOrEqual(COVER_MAX);
    let worst = 0;
    for (let y = 436; y <= 461; y += 0.5) for (let x = -25; x <= 25; x += 0.5) {
      if (!interior(x, y)) continue;
      worst = Math.max(worst, Math.min(...dots.map((d) => Math.hypot(d.x - x, d.y - y))));
    }
    expect(worst).toBeLessThanOrEqual(NEAR_MAX);
    for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
      expect(Math.hypot((dots[i]?.x ?? 0) - (dots[j]?.x ?? 0), (dots[i]?.y ?? 0) - (dots[j]?.y ?? 0))).toBeGreaterThanOrEqual(SPACING_MIN);
    }
  });
  test.each(SEEDS.slice(0, 12))('seed %i: ни один круг радиуса 2 внутри зоны (кроме рта, складок и края) не пуст и не закрашен более чем на 75 % (точная площадь зерна, не растр)', (seed) => {
    const dots = stubbleDots(seed);
    let n = 0;
    for (let cy = 438; cy <= 460; cy++) for (let cx = -23; cx <= 23; cx++) {
      let tot = 0;
      let inside = 0;
      let cov = 0;
      for (let y = cy - HOLE_R; y <= cy + HOLE_R; y += 0.2) for (let x = cx - HOLE_R; x <= cx + HOLE_R; x += 0.2) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > HOLE_R * HOLE_R) continue;
        tot++;
        if (inPoly({ x, y }, zone) && distTo(zone, { x, y }) >= 1.5 && clearOf(x, y, 0.3)) inside++;
        if (dots.some((d) => (d.dx || d.dy ? segDist(x, y, d.x - d.dx / 2, d.y - d.dy / 2, d.x + d.dx / 2, d.y + d.dy / 2) <= 0.45 : Math.hypot(d.x - x, d.y - y) <= d.r))) cov++;
      }
      if (inside < tot || (Math.abs(cx) < 8 && cy < 447.5)) continue;
      n++;
      expect(cov, `круг ${cx},${cy} пуст`).toBeGreaterThan(0);
      expect(cov / tot, `круг ${cx},${cy} сплошной`).toBeLessThanOrEqual(HOLE_FILL_MAX);
    }
    expect(n).toBeGreaterThan(10);
  });
  test('плотность падает только у края: на полосе до 2 ед. от края зерно реже, чем внутри (по числу на площадь)', () => {
    let edge = 0;
    let inner = 0;
    let aEdge = 0;
    let aInner = 0;
    for (let y = 436; y <= 461; y += 0.5) for (let x = -25; x <= 25; x += 0.5) {
      if (!inPoly({ x, y }, zone) || !clearOf(x, y, 0.5)) continue;
      if (distTo(zone, { x, y }) < 2) aEdge++;
      else if (interior(x, y)) aInner++;
    }
    for (const seed of SEEDS) for (const d of stubbleDots(seed)) {
      if (!inPoly({ x: d.x, y: d.y }, zone)) continue;
      if (distTo(zone, { x: d.x, y: d.y }) < 2) edge++;
      else if (interior(d.x, d.y)) inner++;
    }
    expect(edge / aEdge).toBeLessThan(inner / aInner);
  });
  test('seed берётся из Look и не зависит от Math.random: тот же человек — та же раскладка, другой — другая', () => {
    const real = Math.random;
    Math.random = () => { throw new Error('Math.random'); };
    try {
      const a = look({});
      const b = look({ hairCol: '#7A3E2B' });
      expect(stubbleSeed(a)).toBe(stubbleSeed(look({})));
      expect(stubbleSeed(a)).not.toBe(stubbleSeed(b));
      const m = (l: Look): string => personParts(l).head('neutral');
      expect(m(look({ facial: 'stubble' }))).toBe(m(look({ facial: 'stubble' })));
      expect(m(look({ facial: 'stubble' }))).not.toBe(m(look({ facial: 'stubble', hairCol: '#7A3E2B' })));
    } finally { Math.random = real; }
  });
  test('прозрачность 0,25–0,4 (≤ 0,45), без контура и заливки зоны; рот и складки чистые (≥ 1,42 ед. от края зерна); зерно внутри контура всех форм при поворотах', () => {
    expect(STUBBLE_ALPHA_MIN).toBeGreaterThanOrEqual(0.25);
    expect(STUBBLE_ALPHA_MAX).toBeLessThanOrEqual(0.4);
    for (const seed of SEEDS.slice(0, 10)) {
      const dots = stubbleDots(seed);
      for (const d of dots) {
        expect(d.a).toBeGreaterThanOrEqual(0.25);
        expect(d.a).toBeLessThanOrEqual(0.4);
      }
      /* рот и складки чистые для каждого настроения (складки у пожилых) */
      for (const m of MOODS) for (const senior of [false, true]) {
        const line = [...pathPoints(MOUTH_PATHS[m]), ...(senior ? pathPoints(FOLD_KEEP_OUT) : [])];
        for (const d of stubbleDots(seed, m, senior)) for (const q of line) expect(Math.hypot(d.x - q.x, d.y - q.y) - d.r, `${m} ${senior}`).toBeGreaterThanOrEqual(1.42);
      }
      const svg = beardLayer('stubble', '#3A2A22', 'adult', 0, 'round', seed);
      expect(svg).not.toMatch(/ d="[^"]*Q/);
      for (const shape of SHAPES) for (const fx of [0, TURN_SHIFT, -TURN_SHIFT]) {
        const poly = facePoly(shape);
        for (const m of beardLayer('stubble', '#3A2A22', 'adult', fx, shape, seed).matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)) {
          const p = { x: Number(m[1]), y: Number(m[2]) };
          expect(inPoly(p, poly)).toBe(true);
          expect(distTo(poly, p)).toBeGreaterThanOrEqual(Number(m[3]) - 0.01);
        }
      }
    }
  });
});

describe('З2 (32-З): полная и короткая борода отделены от волос цветом и линией', () => {
  const FACIALS: Facial[] = ['beard', 'short', 'mustache'];
  const hue = (c: string): { h: number; chroma: number } => { const [, a, b] = labOf(c); return { h: (Math.atan2(b, a) * 180) / Math.PI, chroma: Math.hypot(a, b) }; };
  test('для всех цветов волос ΔE76 между цветом бороды и волос ≥ 6 (порог BEARD_DE 7), тот же тон; у седой (senior) серая темнее и разница ≥ 4', () => {
    expect(BEARD_DE).toBeGreaterThanOrEqual(6);
    for (const h of HAIR) {
      const b = beardColor(h);
      expect(deltaE(b, h), h).toBeGreaterThanOrEqual(6);
      const a = hue(h);
      const c = hue(b);
      if (a.chroma >= 8 && c.chroma >= 8) expect(Math.abs(((a.h - c.h + 540) % 360) - 180), h).toBeLessThanOrEqual(15);
    }
    expect(deltaE(beardColor(GREY), GREY)).toBeGreaterThanOrEqual(4);
    expect(labOf(beardColor(GREY))[0]).toBeLessThan(labOf(GREY)[0]);
  });
  test.each(FACIALS)('%s × все цвета волос × причёски: цвет бороды в разметке равен beardColor, волосы остаются цветом волос, борода и волосы различимы', (facial) => {
    for (const hairCol of HAIR) for (const hair of ['short', 'curly', 'grey', 'beanie'] as HairStyle[]) {
      const l = look({ facial, hairCol, hair, age: hairCol === GREY ? 'senior' : 'adult' });
      const h = personParts(l).head('neutral');
      const bc = beardColor(hairCol);
      if (facial === 'mustache') expect(h).toContain(`fill="${bc}"`);
      else expect(h).toContain(`fill="${bc}"`);
      expect(deltaE(bc, hairCol)).toBeGreaterThanOrEqual(6);
      if (hair !== 'beanie') expect(h).toContain(`fill="${hairCol}"`);
    }
  });
  test.each(['beard', 'short'] as const)('%s: линия-разделитель на обеих сторонах лица при анфасе и обоих поворотах, толщина 2,5, у виска у контура лица', (kind) => {
    expect(SEAM_W).toBeGreaterThanOrEqual(2.5);
    expect(SEAM_W).toBeLessThanOrEqual(3);
    for (const shape of SHAPES) for (const view of [0, -1, 1]) {
      const face: FaceSpec = { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 };
      const h = personParts(look({ facial: kind, face })).head('neutral', false, { x: 0, y: 0 }, view);
      const seam = /<path d="([^"]*)" fill="none" stroke-width="2.5" data-seam="1"\/>/.exec(h);
      expect(seam, `${shape} ${view}`).not.toBeNull();
      const parts = (seam?.[1] ?? '').split(/(?=M)/).filter(Boolean).map((d) => pathPoints(d));
      expect(parts.length).toBe(2);
      const poly = facePoly(shape);
      const sides = parts.map((pts) => Math.sign((pts[0] as Pt).x)).sort();
      expect(sides).toEqual([-1, 1]);
      for (const pts of parts) {
        const start = pts[0] as Pt;
        /* начало у висков: на контуре лица или внутри него не дальше 2 ед. */
        expect(Math.abs(start.y - 434)).toBeLessThan(0.1);
        expect(inPoly(start, poly) || distTo(poly, start) <= 2).toBe(true);
        for (const p of pts) expect(inPoly(p, poly) || distTo(poly, p) <= 2).toBe(true);
      }
    }
    expect(SEAM_D.split('M').length - 1).toBe(2);
  });
  test('у щетины, усов и без растительности разделителя нет', () => {
    for (const facial of ['stubble', 'mustache', 'none'] as Facial[]) expect(personParts(look({ facial })).head('neutral')).not.toContain('data-seam');
    expect(beardLayer('beard', '#3A2A22', 'adult')).toContain('data-seam');
  });
});
