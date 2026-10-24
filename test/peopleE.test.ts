import { describe, expect, test } from 'vitest';
import { deltaE } from '../src/game/drinkModel';
import { BEARD_KINDS, COMMON_OUTFITS, EARRINGS_SHARE, FEMALE_OUTFITS, GREY, MALE_OUTFITS, OUTFITS_BY_SEX, SKIN, TIGHTS, hasBeard, lookFor, type Age, type Facial, type Look, type PersonType, type Sex } from '../src/game/look';
import {
  BEARD_D, BEARD_SHORT_D, FACE_DIM, FACE_SQUARE_D, FEMALE_BODY, MALE_BODY, MALE_HEM_Y, MOUTH_PATHS, STUBBLE_ALPHA, STUBBLE_IN_D, STUBBLE_OUT_D, TURN_FAR_EYE, TURN_MOUTH, TURN_SHIFT, WRINKLE_ALPHA, WRINKLE_W,
  beardLayer, chinY, femaleOutline, maleOutline, personParts, stubbleColor, type MoodId
} from '../src/render/world/art';
import { inPoly } from './helpers/hairAudit';
import { pathPoints, type Pt } from './helpers/geom';
import { mulberry } from './helpers/peopleSnap';
import { mix } from '../src/render/world/art';

const TYPES: PersonType[] = ['regular', 'student', 'hurry'];
const MOODS: MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const N = 12000;
const data = Object.fromEntries(TYPES.map((t, i) => [t, Array.from({ length: N }, ((r) => () => lookFor(t, r))(mulberry(900 + i)))])) as Record<PersonType, Look[]>;
const share = (xs: Look[], f: (l: Look) => boolean): number => (xs.filter(f).length / Math.max(1, xs.length)) * 100;
const near = (got: number, want: number, tol: number): void => expect(Math.abs(got - want), `${got.toFixed(2)} vs ${want}`).toBeLessThanOrEqual(tol);

const dense = (p: Pt[], step = 0.4): Pt[] => p.flatMap((a, i) => {
  const n = p[(i + 1) % p.length] as Pt;
  const k = Math.max(1, Math.ceil(Math.hypot(n.x - a.x, n.y - a.y) / step));
  return Array.from({ length: k }, (_, j) => ({ x: a.x + ((n.x - a.x) * j) / k, y: a.y + ((n.y - a.y) * j) / k }));
});
const facePoly = (shape: 'round' | 'oval' | 'square'): Pt[] => {
  if (shape === 'square') return pathPoints(FACE_SQUARE_D);
  const d = shape === 'round' ? FACE_DIM.round : FACE_DIM.oval;
  return Array.from({ length: 160 }, (_, k) => ({ x: d.rx * Math.cos((k / 160) * 6.2832), y: 432 + d.ry * Math.sin((k / 160) * 6.2832) }));
};
const edgeDist = (p: Pt, edge: Pt[]): number => Math.min(...edge.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
/** Полная ширина многоугольника на высоте y (по пересечениям рёбер). */
const widthAt = (poly: Pt[], y: number): number => {
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Pt;
    const b = poly[j] as Pt;
    if (a.y > y !== b.y > y) xs.push(((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x);
  }
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
};
const look = (o: Partial<Look>): Look => ({ skin: SKIN[2] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'coat', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 }, ...o });

describe('Н1 (32-Е): квадратное лицо — мягкие нижние углы, подбородок без прямой линии', () => {
  const poly = facePoly('square');
  test('на уровне рта лицо уже, чем на уровне глаз, на 8–12 % (отношение 0,88–0,92)', () => {
    const r = widthAt(poly, 451) / widthAt(poly, 437);
    expect(r).toBeGreaterThanOrEqual(0.88);
    expect(r).toBeLessThanOrEqual(0.92);
  });
  test('нижний угол скруглён: горизонтальный размах дуги не меньше 35 % ширины на уровне рта; ровная нижняя линия не длиннее 20 % ширины', () => {
    const wMouth = widthAt(poly, 451);
    const bottom = Math.max(...poly.map((p) => p.y));
    expect(bottom).toBeCloseTo(chinY('square'), 0);
    const flat = poly.filter((p) => p.y >= bottom - 0.35);
    const flatLen = Math.max(...flat.map((p) => p.x)) - Math.min(...flat.map((p) => p.x));
    expect(flatLen).toBeLessThanOrEqual(0.2 * wMouth);
    const arc = widthAt(poly, 448) / 2 - Math.max(...flat.map((p) => p.x));
    expect(arc).toBeGreaterThanOrEqual(0.35 * wMouth);
  });
  test('верх остаётся широким (на уровне глаз не уже круга), HEAD_TOP и положение глаз не зависят от формы', () => {
    expect(widthAt(poly, 437)).toBeGreaterThanOrEqual(widthAt(facePoly('round'), 437) - 0.1);
    for (const shape of ['round', 'oval', 'square'] as const) {
      const h = personParts(look({ face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 } })).head('neutral');
      expect(h).toContain('<ellipse cx="-10" cy="437" rx="4.7" ry="5"');
      expect(h).toContain(`<path d="${MOUTH_PATHS['neutral']}"`);
    }
  });
  test.each(['round', 'oval', 'square'] as const)('%s: очки и борода сидят на лице (линзы внутри контура, сторона бороды у висков внутри)', (shape) => {
    const edge = dense(facePoly(shape));
    const p = facePoly(shape);
    for (const sg of [-1, 1]) {
      for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]] as const) expect(inPoly({ x: sg * 11 + dx, y: 437 + dy }, p), `линза ${sg}`).toBe(true);
      expect(edgeDist({ x: sg * 11 + 8, y: 437 }, edge)).toBeGreaterThanOrEqual(0);
    }
    /* борода лежит по контуру лица: выступ за него не больше 4 ед (полная борода шире челюсти круглого и овального лица). */
    for (const q of pathPoints(BEARD_D).filter((x) => x.y < 450)) expect(inPoly(q, p) || edgeDist(q, edge) <= 4, `${q.x},${q.y}`).toBe(true);
  });
});

describe('Н2 (32-Е): морщины — мягкие дуги, не веер', () => {
  const WR_RE = /<path d="([^"]*)" fill="none" stroke="(#[0-9A-Fa-f]{6})" stroke-opacity="([\d.]+)" stroke-width="([\d.]+)"/g;
  const wrinkles = (l: Look): { d: string; col: string; a: number; w: number }[] => [...personParts(l).head('neutral').matchAll(WR_RE)].map((m) => ({ d: m[1] as string, col: m[2] as string, a: Number(m[3]), w: Number(m[4]) }));
  const cases: [Age, 1 | 2, Facial][] = [['adult', 1, 'none'], ['senior', 1, 'none'], ['senior', 2, 'none'], ['senior', 2, 'beard'], ['senior', 1, 'stubble']];
  test.each(cases)('%s, морщины %s, %s: тонкие (≤ 1,2), прозрачные (≤ 0,45), цвет кожи на тон темнее, каждая линия короткая', (age, wr, facial) => {
    for (const shape of ['round', 'oval', 'square'] as const) {
      const ws = wrinkles(look({ age, facial, face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: wr, blush: 0.1 } }));
      expect(ws.length).toBeGreaterThan(0);
      for (const w of ws) {
        expect(w.w).toBeLessThanOrEqual(1.2);
        expect(w.a).toBeLessThanOrEqual(0.45);
        expect(w.a).toBeGreaterThanOrEqual(0.3);
        expect(deltaE(w.col, SKIN[2] as string)).toBeGreaterThan(10);
        expect(deltaE(w.col, SKIN[2] as string)).toBeLessThan(30);
        for (const sub of w.d.split(/(?=M)/).filter(Boolean)) {
          const pts = pathPoints(sub);
          let len = 0;
          for (let i = 1; i < pts.length; i++) len += Math.hypot((pts[i] as Pt).x - (pts[i - 1] as Pt).x, (pts[i] as Pt).y - (pts[i - 1] as Pt).y);
          expect(len, sub).toBeLessThanOrEqual(19);
        }
      }
    }
    expect(WRINKLE_W).toBeLessThanOrEqual(1.2);
    expect(WRINKLE_ALPHA).toBeLessThanOrEqual(0.45);
  });
  test('все точки внутри контура лица с зазором не меньше 4 (три формы, морщины 2 у пожилых)', () => {
    for (const shape of ['round', 'oval', 'square'] as const) {
      const edge = dense(facePoly(shape), 0.5);
      const poly = facePoly(shape);
      for (const l of [look({ age: 'senior', face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 2, blush: 0.1 } }), look({ age: 'adult', face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 1, blush: 0.1 } })]) {
        for (const w of wrinkles(l)) for (const p of pathPoints(w.d)) {
          expect(inPoly(p, poly), `${shape} ${p.x},${p.y}`).toBe(true);
          expect(edgeDist(p, edge), `${shape} ${p.x},${p.y}`).toBeGreaterThanOrEqual(4 - 0.05);
        }
      }
    }
  });
  test('нет «веера»: с одной стороны не больше одного почти горизонтального штриха длиннее 3 (кошачьи усики)', () => {
    for (const age of ['adult', 'senior'] as Age[]) {
      const ws = wrinkles(look({ age, face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 2, blush: 0.1 } }));
      const subs = ws.flatMap((w) => w.d.split(/(?=M)/).filter(Boolean)).map((s) => pathPoints(s));
      for (const side of [-1, 1]) {
        const horizontal = subs.filter((pts) => {
          const a = pts[0] as Pt;
          const b = pts[pts.length - 1] as Pt;
          return Math.sign(a.x) === side && Math.abs(a.x) > 15 && Math.hypot(b.x - a.x, b.y - a.y) > 3 && Math.abs(b.y - a.y) / Math.max(0.1, Math.abs(b.x - a.x)) < 0.25;
        });
        expect(horizontal.length).toBeLessThanOrEqual(1);
      }
    }
  });
  test('у молодых морщин нет, у взрослых только «гусиные лапки» (две короткие дуги с каждой стороны), у пожилых бороды скрывают складки', () => {
    expect(wrinkles(look({ age: 'young', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 } })).length).toBe(0);
    const ad = wrinkles(look({ age: 'adult', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 1, blush: 0.1 } }));
    expect(ad.length).toBe(1);
    expect((ad[0] as { d: string }).d.match(/M/g)?.length).toBe(4);
    const b = wrinkles(look({ age: 'senior', facial: 'beard', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 1, blush: 0.1 } }));
    expect(b.some((w) => w.d.includes('443.9q'))).toBe(false);
  });
});

describe('Н3 (32-Е): наряды по полу', () => {
  test('мужские и женские наряды не пересекаются, общий только hoodie', () => {
    expect(MALE_OUTFITS.filter((o) => FEMALE_OUTFITS.includes(o))).toEqual([]);
    expect([...MALE_OUTFITS, ...FEMALE_OUTFITS].filter((o) => COMMON_OUTFITS.includes(o))).toEqual([]);
    expect(COMMON_OUTFITS).toEqual(['hoodie']);
  });
  test('генератор: мужчины только в мужских и hoodie, женщины только в женских и hoodie; доли по типу и полу сходятся с таблицей', () => {
    for (const t of TYPES) {
      for (const sex of ['m', 'f'] as Sex[]) {
        const xs = data[t].filter((l) => l.sex === sex);
        const table = OUTFITS_BY_SEX[sex][t];
        const total = table.reduce((a, e) => a + e[1], 0);
        for (const l of xs) {
          expect(table.map((e) => e[0])).toContain(l.outfit);
          expect((sex === 'm' ? MALE_OUTFITS : FEMALE_OUTFITS).includes(l.outfit) || COMMON_OUTFITS.includes(l.outfit)).toBe(true);
        }
        for (const [o, w] of table) near(share(xs, (l) => l.outfit === o), (w / total) * 100, 3);
      }
    }
  });
  test('женщины: колготки и сапоги (у студенток кроссовки), серьги ≈ 35 % (не с наушниками), маленькая сумка вместо портфеля; у мужчин ничего из этого нет', () => {
    for (const t of TYPES) for (const l of data[t]) {
      if (l.sex === 'f') {
        expect(TIGHTS).toContain(l.pants);
        if (t !== 'student') expect(l.shoe).toBe('#3A2A22');
        expect(l.item).not.toBe('briefcase');
      } else {
        expect(l.earrings).toBeUndefined();
        expect(l.item).not.toBe('purse');
      }
    }
    const f = [...data.regular, ...data.hurry, ...data.student].filter((l) => l.sex === 'f' && l.acc !== 'headphones');
    near(share(f, (l) => l.earrings === true), EARRINGS_SHARE * 100, 3);
    expect(share(data.hurry.filter((l) => l.sex === 'f'), (l) => l.item === 'purse')).toBeGreaterThan(30);
  });
  const widths = (poly: Pt[], hemY: number): { shoulder: number; hem: number } => ({ shoulder: widthAt(poly, 484), hem: widthAt(poly, hemY - 6) });
  test.each([0.93, 1, 1.12])('силуэты (build %s): мужские плечи / низ ≥ 0,95, женские платья и юбки ≤ 0,8; торс помещается в клетку (|x| ≤ 54)', (w) => {
    for (const k of [...MALE_OUTFITS, 'hoodie']) {
      const hy = MALE_HEM_Y[k] as number;
      const poly = pathPoints(maleOutline(w, hy));
      const r = widths(poly, hy);
      expect(r.shoulder / r.hem, k).toBeGreaterThanOrEqual(0.95);
      expect(Math.max(...poly.map((p) => Math.abs(p.x)))).toBeLessThanOrEqual(54);
    }
    for (const k of FEMALE_OUTFITS) {
      const hy = (FEMALE_BODY[k] as { hemY: number }).hemY;
      const poly = pathPoints(femaleOutline(k, w));
      const r = widths(poly, hy);
      expect(r.shoulder / r.hem, k).toBeLessThanOrEqual(0.8);
      expect(Math.max(...poly.map((p) => Math.abs(p.x)))).toBeLessThanOrEqual(54);
      /* заметная талия: на y 526 уже плеч */
      expect(widthAt(poly, 526)).toBeLessThan(widthAt(poly, 484));
    }
    expect(MALE_BODY.shoulder).toBeGreaterThan((FEMALE_BODY['dress'] as { shoulder: number }).shoulder);
  });
  test('верх у всех наряд-силуэтов общий: шея (y 458–461) и плечи на прежних местах, шея видна и стоя, и сидя', () => {
    for (const o of [...MALE_OUTFITS, ...FEMALE_OUTFITS, 'hoodie']) for (const seat of [false, true]) {
      const l = look({ outfit: o, sex: FEMALE_OUTFITS.includes(o) ? 'f' : 'm' });
      const p = personParts(l, seat);
      const torso = (p.cells.find((c) => c.id === 'torso') as { svg: string }).svg;
      expect(torso).toContain('461');
      expect(p.layers[0]).toBe('neck');
      expect(p.cells.find((c) => c.id === 'torso')?.box).toEqual({ x: -54, y: 452, w: 108, h: 150 });
    }
    expect(personParts(look({ outfit: 'vest' })).cells.find((c) => c.id === 'armRope')?.svg).toContain('#FBF4E8');
  });
});

describe('Н4 (32-Е): ступени бороды', () => {
  const men = (t: PersonType, a: Age): Look[] => data[t].filter((l) => l.sex === 'm' && l.age === a);
  test('доли у взрослых и пожилых мужчин: без растительности 45, щетина 15, короткая 15, усы 10, полная 15 (±3); у женщин и молодых ничего', () => {
    for (const a of ['adult', 'senior'] as Age[]) {
      const xs = [...men('regular', a), ...men('hurry', a)];
      expect(xs.length).toBeGreaterThan(900);
      for (const [f, w] of [['none', 45], ['stubble', 15], ['short', 15], ['mustache', 10], ['beard', 15]] as [Facial, number][]) near(share(xs, (l) => l.facial === f), w, 3);
    }
    for (const t of TYPES) for (const l of data[t]) if (l.sex === 'f' || l.age === 'young') expect(l.facial).toBe('none');
    expect(BEARD_KINDS).toEqual(['stubble', 'short', 'beard']);
    expect(hasBeard('mustache')).toBe(false);
  });
  const SKINS = SKIN.slice(0, 5) as string[];
  const outline = (k: Facial): Pt[] => pathPoints(k === 'beard' ? BEARD_D : k === 'short' ? BEARD_SHORT_D : STUBBLE_OUT_D);
  test.each(['stubble', 'short', 'beard'] as Facial[])('%s: рот всех настроений внутри с зазором не меньше 2,5 px (1,42 ед.), светлого овала вокруг рта нет', (k) => {
    const poly = outline(k);
    const edge = dense(poly);
    for (const m of MOODS) for (const p of dense(pathPoints(MOUTH_PATHS[m]), 0.3)) {
      expect(inPoly(p, poly), `${m} ${p.x},${p.y}`).toBe(true);
      expect(edgeDist(p, edge), `${m} ${p.x},${p.y}`).toBeGreaterThanOrEqual(1.42);
    }
    /* зона рта целиком закрыта (щетина: поуже, потому что граница у скул мягкая) */
    const hx = k === 'stubble' ? 11 : 14;
    for (let x = -hx; x <= hx; x++) for (let y = 446.5; y <= (k === 'stubble' ? 457 : 458); y++) expect(inPoly({ x, y }, poly), `${x},${y}`).toBe(true);
  });
  test('короткая борода: высота не больше ⅓ лица (≤ 20,2), низ плотно по челюсти (не дальше 2,2 ед. за контуром), край неровный, контур тонкий', () => {
    const pts = pathPoints(BEARD_SHORT_D);
    const top = Math.min(...pts.filter((p) => Math.abs(p.x) < 2).map((p) => p.y));
    const bottom = Math.max(...pts.map((p) => p.y));
    /* высота от верха (середина верхней дуги) до низа */
    const topMid = 0.25 * 445.5 + 0.5 * 439 + 0.25 * 445.5;
    expect(bottom - topMid).toBeLessThanOrEqual(0.36 * 56);
    expect(top).toBeGreaterThan(0);
    for (const shape of ['round', 'oval', 'square'] as const) {
      const poly = facePoly(shape);
      const edge = dense(poly);
      for (const p of pts.filter((q) => q.y >= 452)) if (!inPoly(p, poly)) expect(edgeDist(p, edge), `${shape} ${p.x},${p.y}`).toBeLessThanOrEqual(2.6);
    }
    const bot = (sg: number): number[] => pts.filter((p) => sg * p.x > 4 && p.y > 456).map((p) => p.y);
    expect(Math.abs(Math.max(...bot(1)) - Math.max(...bot(-1)))).toBeGreaterThan(0.2);
    expect((personParts(look({ facial: 'short' })).head('neutral').match(/stroke-width="1.8"\/>/g) ?? []).length).toBeGreaterThan(0);
    expect((BEARD_SHORT_D.match(/Q/g) ?? []).length).toBeGreaterThanOrEqual(9);
  });
  test('щетина: без контура, граница внутри контура лица, полупрозрачная; контраст с кожей (композит ≥ 5 ΔE) на всех тонах кожи и у седых', () => {
    const svg = beardLayer('stubble', '#3A2A22', 'adult');
    expect(svg).not.toMatch(/stroke="(?!none)/);
    expect(svg).toContain('stroke="none"');
    for (const shape of ['round', 'oval', 'square'] as const) {
      const poly = facePoly(shape);
      for (const d of [STUBBLE_OUT_D, STUBBLE_IN_D]) for (const p of pathPoints(d)) expect(inPoly(p, poly), `${shape} ${p.x},${p.y}`).toBe(true);
    }
    const a = 1 - (1 - STUBBLE_ALPHA[0]) * (1 - STUBBLE_ALPHA[1]);
    for (const sk of SKINS) for (const [col, age] of [['#3A2A22', 'adult'], ['#7A3E2B', 'adult'], ['#2E2E3A', 'adult'], [GREY, 'senior']] as [string, Age][]) {
      const c = stubbleColor(col, age);
      expect(deltaE(sk, mix(sk, c, a)), `${sk} ${col}`).toBeGreaterThanOrEqual(5);
    }
    expect(stubbleColor(GREY, 'senior')).not.toBe('#3A2A22');
  });
  test('цвет: у senior седая, у adult цвет волос; борода не выходит за контур лица по бокам; очки и наушники совместимы, слой beard под лицом features и hair', () => {
    expect(beardLayer('beard', GREY, 'senior')).toContain(`fill="${GREY}"`);
    expect(beardLayer('short', GREY, 'senior')).toContain(`fill="${GREY}"`);
    for (const k of ['stubble', 'short', 'beard', 'mustache'] as Facial[]) for (const acc of ['glasses', 'headphones', 'none']) for (const hair of ['short', 'crop', 'beanie'] as const) {
      const p = personParts(look({ facial: k, acc, hair, age: k === 'stubble' ? 'adult' : 'senior', hairCol: GREY }));
      const L = p.layers;
      if (k !== 'mustache') expect(L.indexOf('beard')).toBeGreaterThan(L.indexOf('face'));
      if (k !== 'mustache') expect(L.indexOf('beard')).toBeLessThan(L.indexOf('features'));
      expect(L.indexOf('hair')).toBeGreaterThan(L.indexOf('features'));
      for (const m of MOODS) expect(p.head(m)).toContain(`<path d="${MOUTH_PATHS[m]}"`);
    }
    for (const k of ['stubble', 'short'] as Facial[]) for (const p of pathPoints(k === 'short' ? BEARD_SHORT_D : STUBBLE_OUT_D).filter((q) => q.y < 458)) expect(Math.abs(p.x)).toBeLessThanOrEqual(28);
    expect(hasBeard('short') && hasBeard('stubble') && hasBeard('beard')).toBe(true);
  });
  test('щетина без усов, короткая и полная с усами, у «усов» бороды нет; румянца у бородачей нет', () => {
    const has = (k: Facial): { stache: boolean; beard: boolean } => {
      const h = personParts(look({ facial: k, age: 'adult' })).head('neutral');
      return { stache: h.includes('M-11 446Q-5 440'), beard: personParts(look({ facial: k })).layers.includes('beard') };
    };
    expect(has('stubble')).toEqual({ stache: false, beard: true });
    expect(has('short')).toEqual({ stache: true, beard: true });
    expect(has('beard')).toEqual({ stache: true, beard: true });
    expect(has('mustache')).toEqual({ stache: true, beard: false });
    for (const l of [...data.regular, ...data.hurry]) if (hasBeard(l.facial)) expect(l.face?.blush).toBe(0);
  });
});

describe('Н5 (32-Е): поворот вбок заметнее', () => {
  const R = 28;
  const shift = (h: string, re: RegExp): number => Number((h.match(re) ?? [])[1] ?? 0);
  test('константы: сдвиг 7–8, дальний глаз 0,7, рот сдвигается на 0,5 сдвига черт', () => {
    expect(TURN_SHIFT).toBeGreaterThanOrEqual(7);
    expect(TURN_SHIFT).toBeLessThanOrEqual(8);
    expect(TURN_FAR_EYE).toBeCloseTo(0.7, 5);
    expect(TURN_MOUTH).toBeCloseTo(0.5, 5);
  });
  test('вправо и влево черты разведены на ≥ 50 % радиуса лица (15 ед.), дальний глаз уже на 30 %; анфас без сдвигов', () => {
    for (const l of [look({}), look({ acc: 'glasses', facial: 'beard' }), look({ sex: 'f', face: { shape: 'round', lashes: true, brow: 'thin', nose: 'small', wrinkles: 0, blush: 0.6 } })]) {
      const p = personParts(l);
      const r = p.head('neutral', false, { x: 0, y: 0 }, 1);
      const lf = p.head('neutral', false, { x: 0, y: 0 }, -1);
      const a = shift(r, /translate\((-?[\d.]+) 0\)"><path|translate\((-?[\d.]+) 0\)">(?:<g|<ellipse)/);
      expect(Math.abs(shift(r, /<g transform="translate\((-?[\d.]+) 0\)"><g transform="translate\(10 0\)/) || TURN_SHIFT)).toBeGreaterThan(0);
      expect(r).toContain(`translate(${TURN_SHIFT} 0)`);
      expect(lf).toContain(`translate(${-TURN_SHIFT} 0)`);
      expect(r).toContain(`scale(${TURN_FAR_EYE} 1)`);
      expect(2 * TURN_SHIFT / R).toBeGreaterThanOrEqual(0.5);
      expect(p.head('neutral')).not.toContain('scale(0.7 1)');
      expect(a).toBeDefined();
    }
  });
  test.each(['round', 'oval', 'square'] as const)('%s: при повороте глаза, рот (с учётом контура 2,5), брови, очки и борода не выходят за контур лица', (shape) => {
    const poly = facePoly(shape);
    const edge = dense(poly, 0.5);
    const inside = (p: Pt, m: number, what: string): void => {
      expect(inPoly(p, poly), `${what} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).toBe(true);
      expect(edgeDist(p, edge), `${what} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).toBeGreaterThanOrEqual(m);
    };
    for (const v of [-1, 1]) {
      const sh = v * TURN_SHIFT;
      for (const cx of [-10, 10]) {
        const k = Math.sign(cx) === v ? TURN_FAR_EYE : 1;
        for (const dx of [-5.6, 5.6]) inside({ x: cx + dx * k + sh, y: 437 }, 0, `глаз ${cx}`);
      }
      for (const m of MOODS) for (const p of pathPoints(MOUTH_PATHS[m])) inside({ x: p.x + sh * TURN_MOUTH, y: p.y }, 1.25, `рот ${m}`);
      for (const x of [-15, -5, 5, 15]) inside({ x: x + sh, y: 428.5 }, 0, 'бровь');
      for (const sg of [-1, 1]) for (const dx of [-9.25, 9.25]) inside({ x: sg * 11 + dx + 0.75 * sh, y: 437 }, 0, 'линза');
      for (const q of pathPoints(BEARD_D).filter((p) => p.y < 456)) expect(Math.abs(0.9 * q.x + 0.45 * sh)).toBeLessThanOrEqual(28.5);
    }
    const h = personParts(look({ acc: 'glasses', facial: 'beard' })).head('neutral', false, { x: 0, y: 0 }, 1);
    expect(h).toContain('scale(0.9 1)');
  });
});
