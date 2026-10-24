import { describe, expect, test } from 'vitest';
import DOC from '../docs/design/people.md?raw';
import ACTOR from '../src/render/world/actor.ts?raw';
import * as LOOKMOD from '../src/game/look';
import { GREY, HAIR_STYLES, SKIN, type Facial, type HairStyle, type Look } from '../src/game/look';
import { BAND_TOP, BEARD_D, HEAD_LAYER_ORDER, HEAD_TOP, MOUTH_PATHS, hairBackKind, hairLayers, headTopOf, personParts, type MoodId } from '../src/render/world/art';
import { maxY, minX, minY, pathPoints, shapePoints } from './helpers/geom';

const MOODS: MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const BASE: Look = { skin: SKIN[1] as string, hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none' };
const mk = (o: Partial<Look>): Look => ({ ...BASE, ...o });
/** Причёски, перерисованные или нарисованные в 32-В: их верх проверяем точно. */
const NEW_OR_REDRAWN: HairStyle[] = ['crop', 'sidepart', 'braid', 'wavy', 'grey', 'long', 'curly', 'bob'];
const top = (s: HairStyle): number => {
  const l = hairLayers(s, '#3A2A22', '#5F7A8A');
  return minY(shapePoints(l.f + l.o));
};
describe('причёски: у каждой свой рисунок, запасной таблицы нет', () => {
  test('FALLBACK_STYLE и renderStyle удалены', () => {
    expect('FALLBACK_STYLE' in LOOKMOD).toBe(false);
    expect('renderStyle' in LOOKMOD).toBe(false);
  });
  test('все 12 причёсок рисуются по-разному (передний и задний слои)', () => {
    expect(HAIR_STYLES).toHaveLength(12);
    const seen = new Map<string, HairStyle>();
    for (const s of HAIR_STYLES) {
      const l = hairLayers(s, '#3A2A22', '#5F7A8A');
      expect(l.f.length).toBeGreaterThan(20);
      const key = l.b + '|' + l.f + '|' + l.o;
      expect(seen.get(key), `${s} совпадает с ${seen.get(key)}`).toBeUndefined();
      seen.set(key, s);
    }
  });
  test('задние слои только у причёсок с hairBack (pony, long, bob, braid, wavy)', () => {
    for (const s of HAIR_STYLES) expect(hairLayers(s, '#3A2A22', '#5F7A8A').b !== '').toBe(hairBackKind(s) !== null);
    expect(HAIR_STYLES.filter((s) => hairBackKind(s)).sort()).toEqual(['bob', 'braid', 'long', 'pony', 'wavy']);
  });
  test('hairBack каждой причёски помещается в клетку атласа (после масштаба головы 1,1)', () => {
    for (const s of HAIR_STYLES.filter((x) => hairBackKind(x))) {
      const cell = personParts(mk({ hair: s })).cells.find((c) => c.id === 'hairBack');
      expect(cell, s).toBeTruthy();
      const pts = shapePoints(hairLayers(s, '#3A2A22', '#5F7A8A').b).map((p) => ({ x: p.x * 1.1, y: 458 + (p.y - 458) * 1.1 }));
      const b = cell?.box as { x: number; y: number; w: number; h: number };
      /* верх у bob, long, wavy на 1 px выше клетки (макушка закрыта головой, это прежнее поведение bob и long) */
      expect(minX(pts)).toBeGreaterThanOrEqual(b.x);
      expect(Math.max(...pts.map((p) => p.x))).toBeLessThanOrEqual(b.x + b.w);
      expect(minY(pts)).toBeGreaterThanOrEqual(b.y - 1.5);
      expect(maxY(pts)).toBeLessThanOrEqual(b.y + b.h);
    }
  });
  test('actor качает braid и wavy как long: коэффициент 0,35, у хвоста 1', () => {
    expect(ACTOR).toContain("this.parts.hairBack === 'pony' ? 1 : 0.35");
    expect(ACTOR).toContain('headTopOf(o.look)');
    expect(ACTOR).not.toContain('const HEAD_TOP');
  });
});

describe('HEAD_TOP: числа сняты с рисунка', () => {
  test.each(HAIR_STYLES)('%s', (s) => {
    const t = top(s);
    if (NEW_OR_REDRAWN.includes(s)) expect(Math.abs(HEAD_TOP[s] - t)).toBeLessThanOrEqual(0.6);
    /* у старых причёсок (и шапки с помпоном выше на 10) значение прежнее: не выше рисунка, не ниже 10 px под ним */
    expect(HEAD_TOP[s]).toBeGreaterThanOrEqual(t - 0.01);
    expect(HEAD_TOP[s]).toBeLessThanOrEqual(t + 10);
    /* не ниже верха головы (404) и не выше предела (bun, самый высокий пучок, 379) */
    expect(HEAD_TOP[s]).toBeLessThanOrEqual(404);
    expect(HEAD_TOP[s]).toBeGreaterThanOrEqual(379);
  });
  test('с наушниками верх не ниже дужки, кончик пузыря не заходит в дужку', () => {
    for (const s of HAIR_STYLES) {
      const hp = headTopOf({ hair: s, acc: 'headphones' });
      expect(hp).toBeLessThanOrEqual(BAND_TOP + 0.5);
      expect(hp - 4).toBeLessThanOrEqual(BAND_TOP);
      expect(headTopOf({ hair: s, acc: 'none' })).toBe(HEAD_TOP[s]);
    }
    expect(BAND_TOP).toBeCloseTo(minY(pathPoints('M-27 428Q-28 396 0 394Q28 396 27 428')) - 4, 1);
  });
  test('чёлка новых и перерисованных причёсок не опускается на глаза и очки (центр лба |x| ≤ 12: ≤ 422, очки с 429)', () => {
    for (const s of NEW_OR_REDRAWN) {
      const l = hairLayers(s, '#3A2A22', '#5F7A8A');
      const fr = shapePoints(l.f).filter((p) => Math.abs(p.x) <= 12 && p.y < 428);
      expect(maxY(fr), s).toBeLessThanOrEqual(422);
    }
  });
  test('beanie: шапка не перекрывает дужку, дужка проходит выше обода (≈ 394–428)', () => {
    expect(top('beanie')).toBeCloseTo(380, 3);
    expect(BAND_TOP).toBeGreaterThan(top('beanie'));
  });
});

describe('борода: вокруг рта, рот виден при любом настроении', () => {
  test('все лица × настроения: борода и усы есть, борода ниже рта по порядку слоёв, цвет = цвет волос (седая у senior)', () => {
    for (const col of ['#3A2A22', '#7A3E2B', GREY]) {
      const p = personParts(mk({ facial: 'beard', hairCol: col, age: col === GREY ? 'senior' : 'adult' }));
      for (const m of MOODS) for (const blink of [false, true]) {
        const h = p.head(m, blink);
        expect(h).toContain(`<path d="${BEARD_D}" fill="${col}"`);
        expect(h).toContain(`fill="${col}" stroke-width="2"/>`);
        expect(h.indexOf(BEARD_D)).toBeLessThan(h.indexOf(MOUTH_PATHS[m]));
      }
    }
  });
  test('facial none и mustache: бороды нет, усы только у mustache', () => {
    const f = (x: Facial): string => personParts(mk({ facial: x })).head('neutral');
    expect(f('none')).not.toContain(BEARD_D);
    expect(f('mustache')).not.toContain(BEARD_D);
    expect(f('none')).not.toContain('M-11 446Q-5 440');
    expect(f('mustache')).toContain('M-11 446Q-5 440');
    expect(f('beard')).toContain('M-11 446Q-5 440');
  });
});

describe('слои головы: порядок снизу вверх закреплён таблицей', () => {
  const MARK: Record<string, (l: Look) => string> = {
    ears: () => '<circle cx="-27" cy="438" r="5.5"',
    face: () => '<circle cx="0" cy="432" r="28"',
    beard: () => BEARD_D,
    features: () => '<path d="M-6 450q6 3 12 0"',
    hair: (l) => hairLayers(l.hair, l.hairCol, l.hat ?? l.cloth).f,
    band: () => 'M-27 428Q-28 396 0 394Q28 396 27 428',
    bun: (l) => hairLayers(l.hair, l.hairCol, l.hat ?? l.cloth).o,
    cups: () => '<rect x="-35" y="422"'
  };
  const expected = (l: Look): string[] => {
    const hp = l.acc === 'headphones';
    return [
      ...(hairBackKind(l.hair) ? ['hairBack'] : []),
      'ears', 'face',
      ...(l.facial === 'beard' ? ['beard'] : []),
      'features', 'hair',
      ...(hp ? ['band'] : []),
      ...(l.hair === 'bun' ? ['bun'] : []),
      ...(hp ? ['cups'] : [])
    ];
  };
  test('таблица в people.md совпадает с HEAD_LAYER_ORDER', () => {
    expect(DOC).toContain(HEAD_LAYER_ORDER.join(' → '));
  });
  test('каждая комбинация причёска × шапка × наушники × борода × костюм: слои и положение в рисунке', () => {
    let n = 0;
    for (const hair of HAIR_STYLES) for (const acc of ['none', 'headphones', 'glasses']) for (const facial of ['none', 'beard'] as Facial[]) for (const outfit of ['hoodie', 'suit']) {
      const l = mk({ hair, acc, facial, outfit, hat: '#5F7A8A' });
      const p = personParts(l);
      const want = expected(l).filter((x) => x !== 'glasses');
      /* очки идут между features и hair; в таблице они есть только при acc = glasses */
      const wantG = acc === 'glasses' ? want.flatMap((x) => (x === 'hair' ? ['glasses', 'hair'] : [x])) : want;
      expect(p.layers, `${hair} ${acc} ${facial}`).toEqual(wantG);
      const head = p.head('neutral');
      const at = p.layers.filter((x) => x !== 'hairBack' && x !== 'glasses').map((x) => head.indexOf((MARK[x] as (l: Look) => string)(l)));
      for (let i = 0; i < at.length; i++) {
        expect(at[i], `${hair} ${acc} слой ${p.layers[i + (p.layers[0] === 'hairBack' ? 1 : 0)]}`).toBeGreaterThanOrEqual(0);
        if (i) expect(at[i]).toBeGreaterThan(at[i - 1] as number);
      }
      expect(p.cells.some((c) => c.id === 'hairBack')).toBe(hairBackKind(hair) !== null);
      n++;
    }
    expect(n).toBe(12 * 3 * 2 * 2);
  });
  test('пучок выше дужки, дужка выше шапки и причёски, чашки выше всего; hairBack всегда под головой', () => {
    const bun = personParts(mk({ hair: 'bun', acc: 'headphones' }));
    expect(bun.layers.slice(-4)).toEqual(['hair', 'band', 'bun', 'cups']);
    const beanie = personParts(mk({ hair: 'beanie', acc: 'headphones' }));
    expect(beanie.layers.slice(-3)).toEqual(['hair', 'band', 'cups']);
    for (const s of ['long', 'braid', 'wavy'] as HairStyle[]) {
      const p = personParts(mk({ hair: s, acc: 'headphones' }));
      expect(p.layers[0]).toBe('hairBack');
      expect(p.layers[p.layers.length - 1]).toBe('cups');
    }
  });
});
