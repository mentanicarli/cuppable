import { describe, expect, test } from 'vitest';
import ACTOR from '../src/render/world/actor.ts?raw';
import WORLD from '../src/render/world/world.ts?raw';
import DAY from '../src/legacy/05-day.js?raw';
import STATE from '../src/legacy/02-state.js?raw';
import { SIT_FIRST_DELAY, between, hallSeed, mulberry32 } from '../src/game/hall';
import { BLUSH_MIN, BLUSH_MOOD, SKIN, lookFor, type Age, type FaceSpec, type Look, type PersonType, type Sex } from '../src/game/look';
import {
  BLUSH_X, BLUSH_Y, FACE_DIM, FACE_SQUARE_D, HEAD_TOP, MOODS_FOR_TEST, MOUTH_PATHS, NECK_BASE, NECK_FACE_W, NECK_SEX, NECK_VISIBLE, TURN_FAR_EYE, TURN_SHIFT, TURN_TORSO,
  blushOf, chinY, hairLayers, personParts
} from '../src/render/world/art';
import { inPoly, marksRaster, maskDiff, polyRaster } from './helpers/hairAudit';
import { pathPoints, shapePoints, type Pt } from './helpers/geom';
import { mulberry } from './helpers/peopleSnap';

const TYPES: PersonType[] = ['regular', 'student', 'hurry'];
const N = 20000;
const data = Object.fromEntries(TYPES.map((t, i) => [t, Array.from({ length: N }, ((r) => () => lookFor(t, r))(mulberry(500 + i)))])) as Record<PersonType, Look[]>;
const all = TYPES.flatMap((t) => data[t]);
const share = (xs: Look[], f: (l: Look) => boolean): number => (xs.filter(f).length / Math.max(1, xs.length)) * 100;
const near = (got: number, want: number, tol: number): void => expect(Math.abs(got - want), `${got.toFixed(2)} vs ${want}`).toBeLessThanOrEqual(tol);
const faceOf = (l: Look): FaceSpec => l.face as FaceSpec;
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('FaceSpec: правила по полу и возрасту (20 000 гостей на тип)', () => {
  test('у каждого гостя есть лицо; формы, ресницы, брови, нос по полу', () => {
    for (const l of all) {
      const f = faceOf(l);
      expect(f).toBeTruthy();
      if (l.sex === 'f') {
        expect(['round', 'oval']).toContain(f.shape);
        expect(['thin', 'normal']).toContain(f.brow);
      } else {
        expect(['oval', 'square']).toContain(f.shape);
        expect(['normal', 'thick']).toContain(f.brow);
        expect(f.lashes).toBe(false);
      }
    }
    const f = all.filter((l) => l.sex === 'f');
    const m = all.filter((l) => l.sex === 'm');
    near(share(f, (l) => faceOf(l).lashes), 70, 2);
    near(share(f, (l) => faceOf(l).nose === 'small'), 70, 2);
    near(share(m, (l) => faceOf(l).nose === 'normal'), 70, 2);
    for (const s of ['round', 'oval']) near(share(f, (l) => faceOf(l).shape === s), 50, 2);
    for (const s of ['oval', 'square']) near(share(m, (l) => faceOf(l).shape === s), 50, 2);
  });
  test('морщины по возрасту: young 0, adult 0/1 (30 % единица), senior 1/2', () => {
    for (const l of all) {
      const w = faceOf(l).wrinkles;
      if (l.age === 'young') expect(w).toBe(0);
      else if (l.age === 'adult') expect([0, 1]).toContain(w);
      else expect([1, 2]).toContain(w);
    }
    near(share(all.filter((l) => l.age === 'adult'), (l) => faceOf(l).wrinkles === 1), 30, 2);
    near(share(all.filter((l) => l.age === 'senior'), (l) => faceOf(l).wrinkles === 2), 50, 2);
  });
  test('румянец: young ж 0,6±0,3, young м 0,2, adult ж 0,4, adult м 0,1, senior 0,1; с бородой 0', () => {
    const g = (s: Sex, a: Age): number[] => all.filter((l) => l.sex === s && l.age === a && l.facial !== 'beard').map((l) => faceOf(l).blush);
    near(mean(g('f', 'young')), 0.6, 0.02);
    expect(Math.min(...g('f', 'young'))).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(Math.max(...g('f', 'young'))).toBeLessThanOrEqual(0.9 + 1e-9);
    for (const [s, a, v] of [['m', 'young', 0.2], ['f', 'adult', 0.4], ['m', 'adult', 0.1], ['f', 'senior', 0.1], ['m', 'senior', 0.1]] as [Sex, Age, number][]) for (const b of g(s, a)) expect(b).toBe(v);
    for (const l of all.filter((x) => x.facial === 'beard')) expect(faceOf(l).blush).toBe(0);
  });
  test('Н14: единообразия нет: в neutral румянец видят не больше 45 % гостей (по типам и в выборке из 200)', () => {
    const vis = (l: Look): boolean => blushOf(faceOf(l), 'neutral', l.facial).visible;
    for (const t of TYPES) expect(share(data[t], vis)).toBeLessThanOrEqual(45);
    const r = mulberry(3203);
    const sample = Array.from({ length: 200 }, (_, i) => lookFor(TYPES[i % 3] as PersonType, r));
    expect(share(sample, vis)).toBeLessThanOrEqual(45);
    expect(share(all, vis)).toBeGreaterThan(5);
  });
  test('lookFor по-прежнему берёт ровно LEGACY_DRAWS чисел у rng, лицо считается от него же', () => {
    expect(lookFor('regular', mulberry(9))).toEqual(lookFor('regular', mulberry(9)));
  });
});

describe('глаза, рот и брови на прежних местах при любом лице', () => {
  test.each(['round', 'oval', 'square'] as const)('%s: глаза (±10; 437), рот, нос и брови не сдвинуты больше чем на 1 px', (shape) => {
    for (const mood of MOODS_FOR_TEST) {
      const look: Look = { skin: SKIN[1] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', sex: 'f', age: 'adult', facial: 'none', face: { shape, lashes: true, brow: 'normal', nose: 'small', wrinkles: 1, blush: 0.5 } };
      const h = personParts(look).head(mood);
      if (mood !== 'joy') {
        expect(h).toContain('<ellipse cx="-10" cy="437" rx="4.7" ry="5"');
        expect(h).toContain('<ellipse cx="10" cy="437" rx="4.7" ry="5"');
      }
      expect(h).toContain(`<path d="${MOUTH_PATHS[mood]}"`);
    }
  });
});

describe('Н14: румянец внутри контура лица', () => {
  const polyOf = (shape: FaceSpec['shape']): Pt[] => {
    if (shape === 'square') return pathPoints(FACE_SQUARE_D);
    const d = shape === 'round' ? FACE_DIM.round : FACE_DIM.oval;
    return Array.from({ length: 120 }, (_, k) => ({ x: d.rx * Math.cos((k / 120) * 6.2832), y: 432 + d.ry * Math.sin((k / 120) * 6.2832) }));
  };
  const dense = (p: Pt[]): Pt[] => p.flatMap((a, i) => { const n = p[(i + 1) % p.length] as Pt; return Array.from({ length: 6 }, (_, k) => ({ x: a.x + ((n.x - a.x) * k) / 6, y: a.y + ((n.y - a.y) * k) / 6 })); });
  test.each(['round', 'oval', 'square'] as const)('%s: центр не ближе 3 px к краю, пятно целиком внутри, радиус 2…5, прозрачность 0,25…0,5', (shape) => {
    const poly = polyOf(shape);
    const edge = dense(poly);
    for (let b = 0; b <= 1.0001; b += 0.05) for (const mood of MOODS_FOR_TEST) {
      const e = blushOf({ shape, lashes: false, brow: 'normal', nose: 'small', wrinkles: 0, blush: b }, mood, 'none');
      if (!e.visible) continue;
      expect(e.r).toBeGreaterThanOrEqual(2);
      expect(e.r).toBeLessThanOrEqual(5);
      expect(e.alpha).toBeGreaterThanOrEqual(0.25);
      expect(e.alpha).toBeLessThanOrEqual(0.5);
      for (const sg of [-1, 1]) {
        const c = { x: sg * BLUSH_X, y: BLUSH_Y };
        expect(inPoly(c, poly)).toBe(true);
        expect(Math.min(...edge.map((q) => Math.hypot(c.x - q.x, c.y - q.y)))).toBeGreaterThanOrEqual(3);
        for (const p of [{ x: c.x + e.r, y: c.y }, { x: c.x - e.r, y: c.y }, { x: c.x, y: c.y + e.r * 0.62 }, { x: c.x, y: c.y - e.r * 0.62 }]) expect(inPoly(p, poly)).toBe(true);
      }
    }
  });
  test('happy и joy усиливают румянец на 0,2 (не выше 1), с бородой и у старших пятна нет', () => {
    const f: FaceSpec = { shape: 'round', lashes: false, brow: 'normal', nose: 'small', wrinkles: 0, blush: 0.4 };
    expect(blushOf(f, 'neutral', 'none').eff).toBeCloseTo(0.4, 5);
    expect(blushOf(f, 'happy', 'none').eff).toBeCloseTo(0.4 + BLUSH_MOOD, 5);
    expect(blushOf({ ...f, blush: 0.95 }, 'joy', 'none').eff).toBe(1);
    expect(blushOf(f, 'happy', 'beard').visible).toBe(false);
    expect(blushOf({ ...f, blush: 0.1 }, 'joy', 'none').visible).toBe(false);
    expect(BLUSH_MIN).toBeGreaterThan(0.4);
  });
});

describe('Н15: шея', () => {
  const PX = 1.1 * 1.6; /* пикселей на единицу рисунка в игре */
  const mk = (o: Partial<Look>): Look => ({ skin: SKIN[1] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none', face: { shape: 'round', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 }, ...o });
  const neckOf = (l: Look): { w: number; bottom: number; shadowBottom: number } => {
    const h = personParts(l).head('neutral');
    const m = /<path d="M(-?[\d.]+) 450L-?[\d.]+ ([\d.]+)Q0 ([\d.]+) ([\d.]+) ([\d.]+)L/.exec(h);
    expect(m, 'путь шеи').toBeTruthy();
    const w = 2 * Math.abs(Number(m?.[1]));
    const sh = /<ellipse cx="0" cy="([\d.]+)" rx="[\d.]+" ry="([\d.]+)"/.exec(h);
    return { w, bottom: (Number(m?.[2]) + Number(m?.[3])) / 2, shadowBottom: Number(sh?.[1]) + Number(sh?.[2]) };
  };
  test.each([['young', 4], ['adult', 5], ['senior', 6]] as [Age, number][])('%s: видимая высота шеи в игре не меньше %s px', (age, px) => {
    for (const shape of ['round', 'oval', 'square'] as const) {
      const l = mk({ age, face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 } });
      const n = neckOf(l);
      expect((n.bottom - chinY(shape)) * PX).toBeGreaterThanOrEqual(px);
      expect(NECK_VISIBLE[age] * PX).toBeGreaterThanOrEqual(px);
      expect(n.bottom).toBeLessThanOrEqual(476); /* рамка головы */
    }
  });
  test('ширина 36–44 % ширины лица: мужчины +4 %, женщины −4 %; тень под подбородком не ниже 2 px', () => {
    for (const age of ['young', 'adult', 'senior'] as Age[]) {
      const m = neckOf(mk({ sex: 'm', age }));
      const f = neckOf(mk({ sex: 'f', age }));
      expect(m.w / NECK_FACE_W).toBeCloseTo(NECK_BASE + NECK_SEX, 2);
      expect(f.w / NECK_FACE_W).toBeCloseTo(NECK_BASE - NECK_SEX, 2);
      for (const r of [m.w, f.w]) {
        expect(r / NECK_FACE_W).toBeGreaterThanOrEqual(0.36 - 0.005);
        expect(r / NECK_FACE_W).toBeLessThanOrEqual(0.44 + 0.005);
      }
      expect((m.shadowBottom - 460) * PX).toBeGreaterThanOrEqual(2);
    }
  });
  test('пять нарядов, стоя и сидя, с бородой и без: слой neck первый, шея перекрывает верх торса, шарф шею скрывает; HEAD_TOP не менялся', () => {
    for (const outfit of ['hoodie', 'coat', 'sweater', 'jacket', 'suit']) for (const seat of [false, true]) for (const facial of ['none', 'beard'] as const) {
      const p = personParts(mk({ outfit, facial }), seat);
      expect(p.layers[0]).toBe('neck');
      expect(p.head('neutral')).toMatch(/ 450L/);
      const torso = p.cells.find((c) => c.id === 'torso');
      expect(torso).toBeTruthy();
    }
    const sc = personParts(mk({ acc: 'scarf' }));
    expect(sc.layers).not.toContain('neck');
    expect(sc.head('neutral')).not.toMatch(/ 450L/);
    expect(HEAD_TOP).toEqual({ short: 397, grey: 392.5, crop: 401, sidepart: 394.8, bob: 397, bun: 379, braid: 397, pony: 397, long: 394, curly: 390.5, wavy: 396, beanie: 390 });
  });
});

describe('Н13: лица различаются по полу и возрасту', () => {
  const base: Look = { skin: SKIN[1] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none' };
  const proto = (sex: Sex, age: Age, wr: 0 | 1 | 2): Look => ({
    ...base, sex, age,
    face: sex === 'f' ? { shape: 'round', lashes: true, brow: 'thin', nose: 'small', wrinkles: wr, blush: age === 'young' ? 0.6 : age === 'adult' ? 0.4 : 0.1 } : { shape: 'square', lashes: false, brow: 'thick', nose: 'normal', wrinkles: wr, blush: age === 'young' ? 0.2 : 0.1 }
  });
  const faceMark = (l: Look): { m: Uint8Array; a: Uint8Array } => {
    const h = personParts(l).head('neutral').replace(hairLayers(l.hair, l.hairCol, l.cloth).f, '');
    const shape = (l.face as FaceSpec).shape;
    const poly = shape === 'square' ? pathPoints(FACE_SQUARE_D) : Array.from({ length: 120 }, (_, k) => ({ x: (shape === 'round' ? 28 : FACE_DIM.oval.rx) * Math.cos((k / 120) * 6.2832), y: 432 + (shape === 'round' ? 28 : FACE_DIM.oval.ry) * Math.sin((k / 120) * 6.2832) }));
    return { m: marksRaster(h), a: polyRaster(poly) };
  };
  const diff = (x: Look, y: Look): number => {
    const a = faceMark(x);
    const b = faceMark(y);
    const m = new Uint8Array(a.m.length);
    const reg = new Uint8Array(a.m.length);
    for (let k = 0; k < m.length; k++) {
      reg[k] = a.a[k] || b.a[k] ? 1 : 0;
      m[k] = a.m[k] || a.a[k] !== b.a[k] ? 1 : 0;
    }
    /* различие = XOR штрихов и пятен внутри лица плюс XOR контуров лица */
    let d = 0;
    for (let k = 0; k < m.length; k++) if ((a.m[k] !== b.m[k] && reg[k]) || a.a[k] !== b.a[k]) d++;
    const v = d / 4 / (Math.PI * 28 * 28);
    return v;
  };
  test.each([['young', 0], ['adult', 1], ['senior', 2]] as [Age, 0 | 1 | 2][])('м против ж (%s): не менее 4 %% площади лица', (age, wr) => {
    expect(diff(proto('m', age, wr), proto('f', age, wr))).toBeGreaterThanOrEqual(0.04);
  });
  test.each(['m', 'f'] as Sex[])('young против senior (%s, самые мягкие морщины senior = 1): не менее 4 %% площади лица', (sex) => {
    expect(diff(proto(sex, 'young', 0), proto(sex, 'senior', 1))).toBeGreaterThanOrEqual(0.04);
    expect(diff(proto(sex, 'young', 0), proto(sex, 'senior', 2))).toBeGreaterThanOrEqual(0.04);
  });
  test('maskDiff считает разницу двух одинаковых лиц нулём', () => {
    const a = faceMark(proto('f', 'adult', 1));
    expect(maskDiff(a.m, a.m)).toBe(0);
  });
});

describe('Н12: у сидящих волосы не срезаны ровной линией на уровне крышки', () => {
  /* fig y 480,3: линия крышки (маска seatMaskA, сверено по кадру сцены: y 392,8 на экране = fig 480) */
  const CUT = 480.3;
  const mk = (hair: Look['hair']): Look => ({ skin: SKIN[1] as string, hair, hairCol: '#7A3E2B', outfit: 'sweater', cloth: '#C4694A', sex: 'f', age: 'adult', facial: 'none' });
  test.each(['long', 'wavy', 'braid'] as const)('%s: задний слой сидящего заканчивается выше линии крышки концами у плеч, без горизонтального среза длиннее 8 px', (hair) => {
    const seatSvg = (personParts(mk(hair), true).cells.find((c) => c.id === 'hairBack') as { svg: string }).svg;
    const standSvg = (personParts(mk(hair), false).cells.find((c) => c.id === 'hairBack') as { svg: string }).svg;
    expect(seatSvg).not.toBe(standSvg);
    const pts = shapePoints(seatSvg).map((p) => ({ x: p.x * 1.1, y: 458 + (p.y - 458) * 1.1 }));
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(CUT - 0.2);
    /* стоя волосы прежней длины */
    expect(Math.max(...shapePoints(standSvg).map((p) => 458 + (p.y - 458) * 1.1))).toBeGreaterThan(CUT);
    const poly = pathPoints(/ d="([^"]*)"/.exec(seatSvg)?.[1] ?? 'M0 0');
    for (let i = 1; i < poly.length; i++) {
      const [p, q] = [poly[i - 1], poly[i]] as [Pt, Pt];
      if (Math.abs(q.y - p.y) < 0.3 && Math.abs(q.x - p.x) > 8) throw new Error(`горизонтальный срез ${p.x}→${q.x} на y ${p.y}`);
    }
  });
  test('остальные причёски у сидящих прежние (bob, pony короче линии крышки)', () => {
    for (const hair of ['bob', 'pony'] as const) {
      const s = (personParts(mk(hair), true).cells.find((c) => c.id === 'hairBack') as { svg: string }).svg;
      expect(Math.max(...shapePoints(s).map((p) => 458 + (p.y - 458) * 1.1))).toBeLessThan(CUT);
    }
  });
});

describe('поворот при ходьбе вбок', () => {
  const look: Look = { skin: SKIN[1] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'mustache', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 } };
  test('вид вбок: черты сдвинуты на 4,5 в сторону движения, дальний глаз уже на 15 %, дальнее ухо скрыто, торс уже на 6 %', () => {
    const p = personParts(look);
    const front = p.head('neutral');
    for (const v of [-1, 1]) {
      const h = p.head('neutral', false, { x: 0, y: 0 }, v);
      expect(h).toContain(`translate(${v * TURN_SHIFT} 0)`);
      expect(h).toContain(`translate(${10 * v} 0) scale(${TURN_FAR_EYE} 1) translate(${-10 * v} 0)`);
      expect((h.match(/<circle cx="-?27" cy="438" r="5.5"/g) ?? []).length).toBe(1);
      expect(h).not.toContain(`<circle cx="${27 * v}" cy="438" r="5.5"`);
    }
    expect((front.match(/<circle cx="-?27" cy="438" r="5.5"/g) ?? []).length).toBe(2);
    expect(p.head('neutral', false, { x: 0, y: 0 }, 0)).toBe(front);
    expect(TURN_TORSO).toBeCloseTo(0.06, 5);
  });
  test('в actor.ts: сидящие и стоящие анфас, переход за 0,15–0,25 с, хвост тянется назад', () => {
    expect(ACTOR).toContain('const sideT = !seated && wk > 0.5 ? 1 : 0;');
    expect(ACTOR).toContain('damp(this.turn, sideT, 12, dt)');
    expect(Math.log(1 / 0.05) / 12).toBeGreaterThanOrEqual(0.15);
    expect(Math.log(1 / 0.05) / 12).toBeLessThanOrEqual(0.25);
    expect(ACTOR).toContain('this.hairC.scale.x = flip;');
  });
});

describe('зал: сброс при старте дня, меню и новой игре', () => {
  test('таймер прихода 6–15 с, поток зала отдельный (в stepSitter нет Math.random)', () => {
    for (let i = 0; i < 200; i++) {
      const t = between(mulberry32(hallSeed(i, 1700000000000)), SIT_FIRST_DELAY);
      expect(t).toBeGreaterThanOrEqual(6);
      expect(t).toBeLessThanOrEqual(15);
    }
    const w = WORLD.replace(/\r/g, '');
    const i = w.indexOf('private stepSitter(dt: number): void {');
    const body = w.slice(i, w.indexOf('\n  }\n', i));
    expect(body).not.toContain('Math.random');
    expect(body).toContain('this.hallRng');
    expect(w.slice(w.indexOf('clearActors(): void {'), w.indexOf('hallState()'))).toContain('this.resetHall();');
  });
  test('два последовательных старта дают разных сидящих', () => {
    const looks = [1, 2, 3, 4, 5, 6].map((n) => {
      const r = mulberry32(hallSeed(n, 1700000000000));
      const kind = ['student', 'student', 'regular', 'hurry'][Math.floor(r() * 4)] as string;
      return JSON.stringify(lookFor(kind, r));
    });
    expect(new Set(looks).size).toBe(6);
    expect(hallSeed(1, 5)).not.toBe(hallSeed(2, 5));
  });
  test('legacy сбрасывает зал через WORLD.clearActors в startDay и newGame', () => {
    expect(DAY).toMatch(/function startDay\(\) \{[^}]*WORLD\.clearActors\(\)/);
    expect(STATE).toContain('WORLD.clearActors(); ACT.clear();');
  });
});
