import { describe, expect, test } from 'vitest';
import { deltaE } from '../src/game/drinkModel';
import { SKIN, type FaceSpec, type Look } from '../src/game/look';
import {
  BEARD_D, BEARD_SHORT_D, FACE_DIM, FOLD_KEEP_OUT, FACE_SQUARE_D, FEMALE_BODY, MALE_HEM_Y, MOUTH_PATHS, STUBBLE_ALPHA_MAX, STUBBLE_ALPHA_MIN, STUBBLE_CLEAR, TURN_FAR_EYE, TURN_MOUTH, TURN_SHIFT,
  beardD, beardLayer, femaleOutline, hairLayers, legVisibleShare, maleOutline, mix, personParts, samplePath, stubbleColor, stubbleDots, type MoodId
} from '../src/render/world/art';
import { fillShapes, inPoly, raster } from './helpers/hairAudit';
import { pathPoints, type Pt } from './helpers/geom';

const look = (o: Partial<Look>): Look => ({ skin: SKIN[2] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'coat', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none', face: { shape: 'oval', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 }, ...o });
const MOODS: MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const SHAPES = ['round', 'oval', 'square'] as const;
type XY = [number, number];
const toPt = (p: XY[]): Pt[] => p.map(([x, y]) => ({ x, y }));
const facePoly = (shape: (typeof SHAPES)[number]): Pt[] => {
  if (shape === 'square') return toPt(samplePath(FACE_SQUARE_D));
  const d = shape === 'round' ? FACE_DIM.round : FACE_DIM.oval;
  return Array.from({ length: 200 }, (_, k) => ({ x: d.rx * Math.cos((k / 200) * 6.2832), y: 432 + d.ry * Math.sin((k / 200) * 6.2832) }));
};
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
/** Правая граница контура лица на высоте y. */
const contourX = (poly: Pt[], y: number): number => {
  let best = -99;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Pt;
    const b = poly[(i + 1) % poly.length] as Pt;
    if (a.y > y !== b.y > y) best = Math.max(best, a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
  }
  return best;
};
/* растр helpers/hairAudit: 2 px на единицу, начало (−64; 366), ширина 256 */
const RW = 256;
const pxAt = (g: Uint8Array, x: number, y: number): number => g[Math.floor((y - 366) * 2) * RW + Math.floor((x + 64) * 2)] ?? 0;

describe('Ж1 (32-Ж): щетина — зерно в зоне короткой бороды, без заливки и контура', () => {
  const dots = stubbleDots();
  const svg = beardLayer('stubble', '#3A2A22', 'adult');
  const zoneRaster = raster([toPt(samplePath(BEARD_SHORT_D))]);
  const coverRaster = (markup: string): Uint8Array => {
    const g = raster(fillShapes(markup).map((s) => s.poly));
    /* короткие штрихи: диски вдоль линии */
    for (const m of markup.matchAll(/<path d="M([-\d.]+) ([-\d.]+)l([-\d.]+) ([-\d.]+)"[^>]*stroke-width="([\d.]+)"/g)) {
      const [x, y, dx, dy, w] = [1, 2, 3, 4, 5].map((i) => Number(m[i]));
      for (let k = 0; k <= 4; k++) {
        const cx = (x as number) + ((dx as number) * k) / 4;
        const cy = (y as number) + ((dy as number) * k) / 4;
        for (let a = -1; a <= 1; a += 0.5) for (let b = -1; b <= 1; b += 0.5) if (a * a + b * b <= 1) {
          const ix = Math.floor((cx + a * ((w as number) / 2) + 64) * 2);
          const iy = Math.floor((cy + b * ((w as number) / 2) - 366) * 2);
          g[iy * RW + ix] = 1;
        }
      }
    }
    return g;
  };
  const cover = coverRaster(svg);
  test('зерно: не меньше 100 штук, прозрачность каждого 0,25–0,4 (≤ 0,45), заливки зоны и контура нет, штрихи тоньше 1', () => {
    expect(dots.length).toBeGreaterThanOrEqual(100);
    for (const d of dots) {
      expect(d.a).toBeGreaterThanOrEqual(STUBBLE_ALPHA_MIN);
      expect(d.a).toBeLessThanOrEqual(STUBBLE_ALPHA_MAX);
    }
    expect(STUBBLE_ALPHA_MAX).toBeLessThanOrEqual(0.45);
    for (const m of svg.matchAll(/fill-opacity="([\d.]+)"|stroke-opacity="([\d.]+)"/g)) expect(Number(m[1] ?? m[2])).toBeLessThanOrEqual(0.45);
    expect(svg).not.toMatch(/ d="[^"]*Q/);
    for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(Number(m[1])).toBeLessThan(1);
    for (const m of svg.matchAll(/<circle [^>]*r="([\d.]+)"/g)) expect(Number(m[1])).toBeLessThanOrEqual(0.6);
    expect(svg.match(/<g fill=/g)?.length).toBe(1);
  });
  test('покрытие: доля пикселей зерна от площади зоны короткой бороды 0,18–0,32 (в кадрах ≈ 0,25)', () => {
    let z = 0;
    let c = 0;
    for (let i = 0; i < zoneRaster.length; i++) if (zoneRaster[i]) { z++; if (cover[i]) c++; }
    expect(c / z).toBeGreaterThanOrEqual(0.18);
    expect(c / z).toBeLessThanOrEqual(0.32);
  });
  test('нет вырезов: ни один круг радиуса 2,5 внутри зоны (вне чистой зоны рта) не пуст и не закрашен сплошь (≤ 92 %)', () => {
    const R = 2.5;
    const clear = [...MOODS.flatMap((m) => pathPoints(MOUTH_PATHS[m])), ...pathPoints(FOLD_KEEP_OUT)];
    let n = 0;
    for (let cy = 436; cy <= 460; cy++) for (let cx = -24; cx <= 24; cx++) {
      if (clear.some((q) => Math.hypot(q.x - cx, q.y - cy) < R + STUBBLE_CLEAR + 0.5)) continue;
      let tot = 0;
      let inZone = 0;
      let cov = 0;
      for (let y = cy - R; y <= cy + R; y += 0.5) for (let x = cx - R; x <= cx + R; x += 0.5) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
        tot++;
        if (pxAt(zoneRaster, x, y)) inZone++;
        if (pxAt(cover, x, y)) cov++;
      }
      if (inZone < tot) continue;
      n++;
      expect(cov, `круг ${cx},${cy} пуст`).toBeGreaterThan(0);
      expect(cov / tot, `круг ${cx},${cy} сплошной`).toBeLessThanOrEqual(0.92);
    }
    expect(n).toBeGreaterThan(20);
  });
  test('рот и складки чистые: зерно не ближе STUBBLE_CLEAR + радиус к линиям рта всех настроений (≥ 2,5 px = 1,42 ед.)', () => {
    expect(STUBBLE_CLEAR).toBeGreaterThanOrEqual(1.42);
    for (const m of MOODS) for (const q of pathPoints(MOUTH_PATHS[m])) for (const d of dots) expect(Math.hypot(d.x - q.x, d.y - q.y) - d.r, `${m}`).toBeGreaterThanOrEqual(1.42);
  });
  test('зерно внутри контура всех форм лица (запас ≥ радиуса), и после сдвига при повороте влево и вправо', () => {
    for (const shape of SHAPES) {
      const poly = facePoly(shape);
      for (const fx of [0, TURN_SHIFT, -TURN_SHIFT]) {
        const turned = beardLayer('stubble', '#3A2A22', 'adult', fx, shape);
        for (const m of turned.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)) {
          const p = { x: Number(m[1]), y: Number(m[2]) };
          expect(inPoly(p, poly), `${shape} ${fx} ${p.x},${p.y}`).toBe(true);
          expect(distTo(poly, p)).toBeGreaterThanOrEqual(Number(m[3]) - 0.01);
        }
      }
    }
  });
  test('цвет: у седых серый, у остальных цвет волос; зерно заметно на коже всех тонов (ΔE ≥ 4 при прозрачности 0,33), у блондинов тоже', () => {
    expect(stubbleColor('#CFC4B4', 'senior')).toBe('#8F8A86');
    expect(stubbleColor('#3A2A22', 'adult')).toBe('#3A2A22');
    for (const sk of SKIN.slice(0, 5)) for (const col of ['#3A2A22', '#7A3E2B', '#2E2E3A', '#C99028']) {
      expect(deltaE(sk, mix(sk, col, 0.33)), `${sk} ${col}`).toBeGreaterThanOrEqual(4);
    }
    for (const sk of SKIN.slice(0, 5)) expect(deltaE(sk, mix(sk, '#8F8A86', 0.33))).toBeGreaterThanOrEqual(4);
  });
  test('детерминировано: два вызова дают ту же раскладку, Math.random не нужен', () => {
    expect(beardLayer('stubble', '#3A2A22', 'adult')).toBe(beardLayer('stubble', '#3A2A22', 'adult'));
    expect(stubbleDots()).toBe(stubbleDots());
  });
});

describe('Ж2 (32-Ж): мужской подбородок ещё мягче', () => {
  const OLD_E = 'M-28 432Q-28 420.4 -19.8 412.2Q-11.6 404 0 404Q11.6 404 19.8 412.2Q28 420.4 28 432Q30 440 26.7 448Q26.4 460.4 7 460.4Q0 462 -7 460.4Q-26.4 460.4 -26.7 448Q-30 440 -28 432Z';
  const widthAt = (poly: Pt[], y: number): number => {
    const xs: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i] as Pt;
      const b = poly[(i + 1) % poly.length] as Pt;
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    return Math.max(...xs) - Math.min(...xs);
  };
  const metrics = (d: string): { ratio: number; arc: number } => {
    const poly = toPt(samplePath(d));
    const bottom = Math.max(...poly.map((p) => p.y));
    const flatX = Math.max(...poly.filter((p) => p.y >= bottom - 0.35).map((p) => p.x));
    return { ratio: widthAt(poly, 451) / widthAt(poly, 437), arc: (widthAt(poly, 448) / 2 - flatX) / widthAt(poly, 451) };
  };
  test('низ уже на 2–4 % (отношение ширин на y 451 / 437), радиус скругления нижних углов больше на 15–20 % относительно 32-Е', () => {
    const a = metrics(OLD_E);
    const b = metrics(FACE_SQUARE_D);
    expect(b.ratio / a.ratio).toBeGreaterThanOrEqual(0.96);
    expect(b.ratio / a.ratio).toBeLessThanOrEqual(0.98);
    expect(b.arc / a.arc).toBeGreaterThanOrEqual(1.15);
    expect(b.arc / a.arc).toBeLessThanOrEqual(1.2);
  });
  test('борода, очки и наушники сидят: линзы целиком внутри контура, глаза и рот не сдвинулись, шея под подбородком', () => {
    const poly = facePoly('square');
    for (const sg of [-1, 1]) for (const [dx, dy] of [[9.25, 0], [-9.25, 0], [0, 9.25], [0, -9.25]] as const) expect(inPoly({ x: sg * 11 + dx, y: 437 + dy }, poly)).toBe(true);
    for (const p of pathPoints(BEARD_D).filter((q) => q.y < 450)) expect(inPoly(p, poly) || distTo(poly, p) <= 4).toBe(true);
    const h = personParts(look({ face: { shape: 'square', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 }, acc: 'headphones' })).head('neutral');
    expect(h).toContain('<ellipse cx="-10" cy="437" rx="4.7" ry="5"');
    expect(h).toContain(FACE_SQUARE_D);
  });
});

describe('Ж3 (32-Ж): мужские наряды короче и прямые, у женских подол шире плеч', () => {
  const widthAt = (poly: Pt[], y: number): number => {
    const xs: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i] as Pt;
      const b = poly[(i + 1) % poly.length] as Pt;
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    return Math.max(...xs) - Math.min(...xs);
  };
  test.each([0.93, 1, 1.12])('build %s: мужской низ / плечи ≤ 1,0; платья и юбки ≥ 1,3', (w) => {
    for (const k of ['coat', 'jacket', 'suit', 'vest']) {
      const hy = MALE_HEM_Y[k] as number;
      const poly = pathPoints(maleOutline(w, hy));
      expect(widthAt(poly, hy - 6) / widthAt(poly, 500), k).toBeLessThanOrEqual(1.0);
    }
    for (const k of Object.keys(FEMALE_BODY)) {
      const hy = (FEMALE_BODY[k] as { hemY: number }).hemY;
      const poly = pathPoints(femaleOutline(k, w));
      expect(widthAt(poly, hy - 6) / widthAt(poly, 496), k).toBeGreaterThanOrEqual(1.3);
    }
  });
  test('подол пальто и куртки до бедра: брюки видны не меньше чем на 60 % (было 0 у пальто и 43 % у куртки)', () => {
    expect(legVisibleShare(588)).toBe(0);
    expect(legVisibleShare(572)).toBeLessThan(0.5);
    for (const k of ['coat', 'jacket', 'suit', 'vest']) expect(legVisibleShare(MALE_HEM_Y[k] as number), k).toBeGreaterThanOrEqual(0.6);
    expect(MALE_HEM_Y['coat'] as number).toBeLessThanOrEqual(560);
    expect(MALE_HEM_Y['jacket'] as number).toBeLessThanOrEqual(556);
    /* подол не выше линии бёдер минус запас: между подолом и лентой ноги нет просвета (низ подола ≥ 557) */
    for (const k of ['coat', 'jacket', 'suit', 'vest']) expect((MALE_HEM_Y[k] as number) + 5).toBeGreaterThanOrEqual(557);
  });
  test('торс по-прежнему в рамке клетки (|x| ≤ 54, y 452…602) и украшения (пуговицы, пояс жилета) не ниже подола', () => {
    for (const k of ['coat', 'jacket', 'suit', 'vest', 'hoodie']) {
      const t = (personParts(look({ outfit: k })).cells.find((c) => c.id === 'torso') as { svg: string; box: { x: number; y: number; w: number; h: number } });
      expect(t.box).toEqual({ x: -54, y: 452, w: 108, h: 150 });
      const hy = (MALE_HEM_Y[k] as number) + 10;
      for (const m of t.svg.matchAll(/<circle cx="[-\d.]+" cy="([\d.]+)" r="2\.[0-9]"/g)) expect(Number(m[1]), k).toBeLessThanOrEqual(hy);
    }
  });
});

describe('Ж4 (32-Ж): curly — между волосами и бровью не меньше 2 px', () => {
  /* 2 px экрана = 2 / (1,1 · 1,6) ед. рисунка */
  const MIN_GAP = 2 / (1.1 * 1.6);
  test.each(['thin', 'normal', 'thick'] as const)('брови %s (neutral и happy, с очками и без): зазор до закраски волос ≥ 2 px', (brow) => {
    const shapes = fillShapes(hairLayers('curly', '#3A2A22', '#5F7A8A').f).map((s) => s.poly);
    for (const glasses of [false, true]) for (const mood of ['neutral', 'happy'] as const) {
      const h = personParts(look({ hair: 'curly', acc: glasses ? 'glasses' : 'none', face: { shape: 'oval', lashes: false, brow, nose: 'normal', wrinkles: 0, blush: 0.1 } })).head(mood);
      const m = /<path d="(M-1[45][^"]*)" fill="none" stroke="#[0-9A-Fa-f]{6}" stroke-width="([\d.]+)"/.exec(h);
      expect(m).not.toBeNull();
      const w = Number(m?.[2]);
      for (const p of pathPoints(m?.[1] ?? '')) for (let a = 0; a < 24; a++) {
        const r = w / 2 + MIN_GAP;
        const q = { x: p.x + r * Math.cos((a / 24) * 6.2832), y: p.y + r * Math.sin((a / 24) * 6.2832) };
        for (const poly of shapes) expect(inPoly(q, poly), `${brow} ${mood} ${glasses}`).toBe(false);
      }
    }
  });
  test('реальный зазор по центру лба (между нижней кромкой шапки и верхом брови) больше 8 ед. — правка линии роста не потребовалась', () => {
    const poly = fillShapes(hairLayers('curly', '#3A2A22', '#5F7A8A').f).flatMap((s) => s.poly);
    const bottom = Math.max(...poly.filter((p) => Math.abs(p.x) < 15 && p.y < 425).map((p) => p.y));
    expect(427 - bottom).toBeGreaterThan(8);
  });
});

describe('Ж5 (32-Ж): борода при повороте тянется по контуру на обе стороны', () => {
  /** Правый и левый край растра бороды по рядам y 436–450 против контура лица: просвет кожи (контур − край), по растру. */
  const edges = (d: string, y: number): { l: number; r: number } | null => {
    const g = raster([toPt(samplePath(d))]);
    let l = null as number | null;
    let r = null as number | null;
    for (let ix = 0; ix < RW; ix++) if (g[Math.floor((y - 366) * 2) * RW + ix]) { const x = ix / 2 - 64 + 0.25; if (l === null) l = x; r = x; }
    return l === null || r === null ? null : { l, r };
  };
  test.each(['beard', 'short'] as const)('%s: просвет кожи между краем бороды и контуром лица (у уха и бакенбард) ≤ 1,7 ед. (3 px) на каждой стороне при анфасе и обоих поворотах; выступ за контур ≤ 5', (kind) => {
    let worst = -99;
    for (const shape of SHAPES) for (const fx of [0, TURN_SHIFT, -TURN_SHIFT]) {
      const poly = facePoly(shape);
      for (let y = 436; y <= 450; y += 2) {
        const e = edges(beardD(kind, shape, fx), y);
        expect(e, `${shape} ${fx} ${y}`).not.toBeNull();
        const c = contourX(poly, y);
        for (const gap of [c - (e as { r: number }).r, c + (e as { l: number }).l]) {
          worst = Math.max(worst, gap);
          expect(gap, `${kind} ${shape} fx${fx} y${y}`).toBeLessThanOrEqual(1.7);
          expect(gap).toBeGreaterThanOrEqual(-5);
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(1.7);
  });
  test('сдвиг бороды согласован со сдвигом черт: у рта на половину fx, у краёв (|x| ≥ 23) нулевой; рот (сдвиг TURN_MOUTH·fx) остаётся внутри с запасом 1,42', () => {
    expect(TURN_MOUTH).toBe(0.5);
    const nums = (d: string): number[][] => [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const a = nums(BEARD_SHORT_D);
    const b = nums(beardD('short', 'round', TURN_SHIFT));
    a.forEach((p, i) => {
      const dx = (b[i] as number[])[0] as number - (p[0] as number);
      if (Math.abs(p[0] as number) >= 23) expect(Math.abs(dx)).toBeLessThan(0.02);
      if (Math.abs(p[0] as number) < 1) expect(dx).toBeGreaterThan(0.45 * TURN_SHIFT);
      expect((b[i] as number[])[1]).toBe(p[1]);
    });
    for (const kind of ['short', 'beard'] as const) for (const fx of [TURN_SHIFT, -TURN_SHIFT]) {
      const poly = toPt(samplePath(beardD(kind, 'oval', fx)));
      for (const m of MOODS) for (const q of pathPoints(MOUTH_PATHS[m])) {
        const p = { x: q.x + fx * TURN_MOUTH, y: q.y };
        expect(inPoly(p, poly), `${kind} ${m}`).toBe(true);
        expect(distTo(poly, p), `${kind} ${m}`).toBeGreaterThanOrEqual(1.42);
      }
    }
  });
  test('в разметке головы: слой бороды при повороте — путь той же формы (без transform), равный beardLayer; у стыка с волосами нет разрыва: верх бороды ≤ 6 под концом висков у всех причёсок', () => {
    for (const shape of SHAPES) for (const view of [-1, 1]) {
      const face: FaceSpec = { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 };
      const h = personParts(look({ facial: 'short', face })).head('neutral', false, { x: 0, y: 0 }, view);
      expect(h).toContain(beardLayer('short', '#3A2A22', 'adult', view * TURN_SHIFT, shape));
      expect(h).not.toContain('scale(0.9 1)');
    }
    /* низ висков причёсок мужчин: 429,5–436,5 (curly), верх бороды 434: разрыв не больше 6 */
    for (const [, end] of [['short', 429.5], ['crop', 430.5], ['sidepart', 433.5], ['curly', 436.5], ['beanie', 431.5]] as const) expect(434 - end).toBeLessThanOrEqual(6);
  });
  test('усы и щетина тянутся вместе с ртом/бородой: усы сдвигаются на TURN_MOUTH·fx, зерно щетины — по тому же закону, что борода', () => {
    const h = personParts(look({ facial: 'mustache' })).head('neutral', false, { x: 0, y: 0 }, 1);
    expect(h).toContain(`translate(${-(TURN_SHIFT * (1 - TURN_MOUTH)).toFixed(2)} 0)`);
    const st = beardLayer('stubble', '#3A2A22', 'adult', TURN_SHIFT);
    const st0 = beardLayer('stubble', '#3A2A22', 'adult');
    const xs = (s: string): number[] => [...s.matchAll(/<circle cx="([-\d.]+)"/g)].map((m) => Number(m[1]));
    const a = xs(st0);
    const b = xs(st);
    expect(b.length).toBe(a.length);
    a.forEach((x, i) => { if (Math.abs(x) < 3) expect((b[i] as number) - x).toBeGreaterThan(2.5); if (Math.abs(x) > 23) expect(Math.abs((b[i] as number) - x)).toBeLessThan(0.02); });
  });
});

describe('Ж6 (32-Ж): глаза при повороте — дальний сужается целиком', () => {
  const WHITE = /<ellipse cx="([-\d.]+)" cy="437" rx="([\d.]+)" ry="5" fill="#FFFDF6" stroke-width="1.8"\/>/g;
  const eyesOf = (h: string): { white: { cx: number; rx: number }; pupil: { cx: number; cy: number; rx: number; ry: number }; hl: { cx: number; cy: number; rx: number; ry: number } }[] => {
    const out: ReturnType<typeof eyesOf> = [];
    for (const m of h.matchAll(/<g>(<ellipse cx="[-\d.]+" cy="437"[^>]*\/>)(<(?:circle|ellipse)[^>]*fill="#2F211B"[^>]*\/>)(<(?:circle|ellipse)[^>]*fill="#fff"[^>]*\/>)<\/g>/g)) {
      const num = (t: string, n: string, d = 0): number => (new RegExp(`\\b${n}="([-\\d.]+)"`).exec(t) ? Number(new RegExp(`\\b${n}="([-\\d.]+)"`).exec(t)?.[1]) : d);
      const ell = (t: string): { cx: number; cy: number; rx: number; ry: number } => ({ cx: num(t, 'cx'), cy: num(t, 'cy'), rx: num(t, 'rx', num(t, 'r')), ry: num(t, 'ry', num(t, 'r')) });
      out.push({ white: { cx: num(m[1] as string, 'cx'), rx: num(m[1] as string, 'rx') }, pupil: ell(m[2] as string), hl: ell(m[3] as string) });
    }
    return out;
  };
  const inside = (a: { cx: number; cy: number; rx: number; ry: number }, b: { cx: number; cy: number; rx: number; ry: number }, m: number): boolean =>
    Array.from({ length: 48 }, (_, k) => ({ x: a.cx + a.rx * Math.cos((k / 48) * 6.2832), y: a.cy + a.ry * Math.sin((k / 48) * 6.2832) })).every((p) => ((p.x - b.cx) / (b.rx - m)) ** 2 + ((p.y - b.cy) / (b.ry - m)) ** 2 <= 1.0001);
  const GAZES = [{ x: 0, y: 0 }, { x: 1.9, y: 0.4 }, { x: -1.9, y: -0.4 }];
  test.each(SHAPES)('%s: отношение ширины к высоте дальнего глаза 0,62–0,78 (ближний 0,9–1), одна линия по y, зрачок в белке и блик в зрачке (все точки)', (shape) => {
    const face: FaceSpec = { shape, lashes: true, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 };
    for (const view of [-1, 1]) for (const g of GAZES) {
      const eyes = eyesOf(personParts(look({ face })).head('neutral', false, g, view));
      expect(eyes.length).toBe(2);
      const far = eyes.find((e) => Math.sign(e.white.cx) === view) as (typeof eyes)[number];
      const near = eyes.find((e) => Math.sign(e.white.cx) !== view) as (typeof eyes)[number];
      const ratio = (far.white.rx * 2) / 10;
      expect(ratio).toBeGreaterThanOrEqual(0.62);
      expect(ratio).toBeLessThanOrEqual(0.78);
      expect(far.white.rx).toBeCloseTo(4.7 * TURN_FAR_EYE, 1);
      expect((near.white.rx * 2) / 10).toBeGreaterThanOrEqual(0.9);
      /* белки на одной линии всегда; зрачок дальнего при сильном взгляде чуть ослаблен, чтобы остаться в белке (≤ 0,5) */
      const lim = g.x === 0 && g.y === 0 ? 0.3 : 0.5;
      expect(Math.abs(far.pupil.cy - near.pupil.cy)).toBeLessThanOrEqual(lim);
      expect(Math.abs(far.hl.cy - near.hl.cy)).toBeLessThanOrEqual(lim);
      const white = { cx: far.white.cx, cy: 437, rx: far.white.rx, ry: 5 };
      expect(inside(far.pupil, white, 0.9), `зрачок ${view} ${g.x}`).toBe(true);
      expect(inside(far.hl, far.pupil, 0), `блик ${view} ${g.x}`).toBe(true);
      /* сужены пропорционально: зрачок и блик в TURN_FAR_EYE раз уже, высота прежняя */
      expect(far.pupil.rx / far.pupil.ry).toBeCloseTo(TURN_FAR_EYE, 1);
      expect(far.hl.rx / far.hl.ry).toBeCloseTo(TURN_FAR_EYE, 1);
      expect(far.pupil.ry).toBeCloseTo(2.8, 1);
    }
    expect([...personParts(look({ face })).head('neutral', false, GAZES[0], 1).matchAll(WHITE)].length).toBe(2);
  });
  test('ближний глаз не меняет форму: его разметка при повороте равна разметке анфас (только сдвиг всего слоя черт)', () => {
    const p = personParts(look({}));
    const front = p.head('neutral');
    for (const view of [-1, 1]) {
      const turned = p.head('neutral', false, { x: 0, y: 0 }, view);
      const nearCx = -view * 10;
      const eye = (h: string): string => (new RegExp(`<g><ellipse cx="${nearCx}" cy="437"[^]*?</g>`).exec(h) ?? [''])[0];
      expect(eye(turned)).toBe(eye(front));
      expect(eye(front).length).toBeGreaterThan(50);
    }
  });
  test('ресницы и брови дальнего глаза сужены вместе с ним, у ближнего прежние; полуприкрытый и закрытый дальний глаз тоже уже', () => {
    const face: FaceSpec = { shape: 'oval', lashes: true, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 };
    const p = personParts(look({ face }));
    const front = p.head('neutral');
    const turned = p.head('neutral', false, { x: 0, y: 0 }, 1);
    const lash = (h: string): string => (/<path d="(M-14\.8[^"]*)" fill="none" stroke-width="1\.5"/.exec(h) ?? [])[1] ?? '';
    expect(lash(front)).toContain('M-14.8 434.4l-2.3 -2.2');
    expect(lash(turned)).toContain('M-14.8 434.4l-2.3 -2.2');
    /* дальняя (правая) ресница: начало cx + 4,8·k = 17,6, а не 14,8 */
    expect(lash(turned)).toContain(`M${+(10 + 4.8 * TURN_FAR_EYE).toFixed(2)} 434.4`);
    const brows = [...turned.matchAll(/<path d="M(-?[\d.]+) [^"]*" fill="none" stroke="#[0-9A-Fa-f]{6}" stroke-width="2" stroke-linecap="round"( transform="[^"]*")?\/>/g)];
    expect(brows.length).toBe(2);
    expect(brows.find((m) => Number(m[1]) > 0)?.[2]).toContain(`scale(${TURN_FAR_EYE} 1)`);
    expect(brows.find((m) => Number(m[1]) < 0)?.[2]).toBeUndefined();
    const half = p.head('neutral', 'half', { x: 0, y: 0 }, 1);
    expect(half).toContain(`<ellipse cx="10" cy="438" rx="${+(4.7 * TURN_FAR_EYE).toFixed(2)}" ry="2.4"`);
    expect(half).toContain('<ellipse cx="-10" cy="438" rx="4.7" ry="2.4"');
    const shut = p.head('joy', false, { x: 0, y: 0 }, -1);
    expect(shut).toContain(`M${+(-10 - 5 * TURN_FAR_EYE).toFixed(2)} 438q${+(5 * TURN_FAR_EYE).toFixed(2)} -7 ${+(10 * TURN_FAR_EYE).toFixed(2)} 0`);
  });
  test.each(SHAPES)('%s, очки: линзы поверх глаз и сдвигаются вместе с ними (дальняя уже), глаза внутри линз, всё внутри контура лица', (shape) => {
    const poly = facePoly(shape);
    for (const view of [-1, 1]) {
      const fx = view * TURN_SHIFT;
      const h = personParts(look({ acc: 'glasses', face: { shape, lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1 } })).head('neutral', false, { x: 0, y: 0 }, view);
      const near = /<circle cx="([-\d.]+)" cy="437" r="8"/.exec(h);
      const far = /<ellipse cx="([-\d.]+)" cy="437" rx="([\d.]+)" ry="8"/.exec(h);
      expect(near && far).toBeTruthy();
      const nearC = Number(near?.[1]);
      const farC = Number(far?.[1]);
      const farRx = Number(far?.[2]);
      expect(farRx).toBeCloseTo(8 * TURN_FAR_EYE, 1);
      /* глаза в координатах лица: центр ± 10 плюс сдвиг fx; ближний у линзы со сдвигом 1 (как анфас), дальний по центру линзы */
      expect(Math.abs(nearC - (-view * 10 + fx))).toBeLessThanOrEqual(1.01);
      expect(farC).toBeCloseTo(view * 10 + fx, 5);
      expect(4.7 + 0.9 + Math.abs(nearC - (-view * 10 + fx))).toBeLessThanOrEqual(8 - 1.25 + 0.01);
      expect(4.7 * TURN_FAR_EYE + 0.9).toBeLessThanOrEqual(farRx - 1.25 + 0.01);
      for (const [cx, rx] of [[nearC, 8], [farC, farRx]] as const) for (const dx of [-rx - 1.25, rx + 1.25]) {
        expect(inPoly({ x: cx + dx, y: 437 }, poly), `${shape} ${view} ${cx}`).toBe(true);
      }
      /* дужка только у ближней стороны */
      const arms = (/M[-\d.]+ 436H[-\d.]+M([-\d.]+) 435L([-\d.]+) 432/.exec(h) ?? []).slice(1).map(Number);
      expect(Math.sign(arms[1] as number)).toBe(-view);
    }
  });
});
