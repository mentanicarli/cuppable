import { describe, expect, test } from 'vitest';
import ACTOR from '../src/render/world/actor.ts?raw';
import WORLD from '../src/render/world/world.ts?raw';
import { sha } from './helpers/peopleSnap';
import { BLINK_DUR, BLINK_GAP, actorRng, blinkPhase, blinkPlan } from '../src/game/blink';
import { deltaE, labOf } from '../src/game/drinkModel';
import { HAIR_STYLES, type HairStyle, type Look } from '../src/game/look';
import { BROW_W, GUEST_K, HAIR_PIVOT, SWING, browSpec, hairBackKind, hairLayers, personParts, swingAngle, type HairBackKind, type MoodId } from '../src/render/world/art';
import { columnBottom, covered, hairlineProfile, mass, sideEnd } from './helpers/hairAudit';
import { pathPoints, shapePoints } from './helpers/geom';

const HAIR = '#3A2A22';
const layers = (s: HairStyle, col = HAIR): { b: string; f: string; o: string } => hairLayers(s, col, '#5F7A8A');

describe('Н9 crop: на макушке нет «рубчика»', () => {
  test('не больше одного едва заметного штриха (цвет волос темнее на ΔE ≤ 8, толщина ≤ 1,5)', () => {
    const f = layers('crop').f;
    const m = mass(f);
    expect(m.strokes).toBeLessThanOrEqual(1);
    for (const t of f.matchAll(/<path\b[^>]*fill="none"[^>]*>/g)) {
      expect(Number(/stroke-width="([\d.]+)"/.exec(t[0])?.[1])).toBeLessThanOrEqual(1.5);
      expect(deltaE(/stroke="(#[0-9A-Fa-f]{6})"/.exec(t[0])?.[1] as string, HAIR)).toBeLessThanOrEqual(8);
    }
  });
});

describe('Н10 grey: ломаная линия роста, виски и бакенбарды', () => {
  const f = layers('grey', '#CFC4B4').f;
  const prof = hairlineProfile(f, -18, 18);
  test('перепад высоты линии по ширине лба не меньше 3 px и не меньше двух изломов (не срезка и не плавная шапочка)', () => {
    expect(Math.max(...prof) - Math.min(...prof)).toBeGreaterThanOrEqual(3);
    let turns = 0;
    let last = 0;
    for (let i = 1; i < prof.length; i++) {
      const d = Math.sign((prof[i] as number) - (prof[i - 1] as number));
      if (d !== 0) {
        if (last !== 0 && d !== last) turns++;
        last = d;
      }
    }
    expect(turns).toBeGreaterThanOrEqual(2);
  });
  test('заходит на виски до верха уха (≥ 432) и есть бакенбарды на высоте уха', () => {
    expect(sideEnd(f)).toBeGreaterThanOrEqual(432);
    for (const sg of [-1, 1]) expect(covered(f, sg * 27.8, 443)).toBe(true);
  });
});

describe('Н11 long и wavy: низ заднего слоя неровный, без прямоугольных вырезов', () => {
  test.each(['long', 'wavy'] as HairStyle[])('%s', (s) => {
    const b = layers(s).b;
    const pts = pathPoints(/ d="([^"]*)"/.exec(b)?.[1] as string);
    for (let i = 1; i < pts.length; i++) {
      const [p, q] = [pts[i - 1], pts[i]] as [{ x: number; y: number }, { x: number; y: number }];
      if (Math.abs(q.x - p.x) > 6) expect(Math.abs(q.y - p.y), `горизонтальный отрезок ${p.x},${p.y}→${q.x},${q.y}`).toBeGreaterThan(0.5);
    }
    /* низ по колонкам: хвосты ниже, середина (шея) выше, перепад не меньше 12 */
    const cols = [-34, -30, -26, -20, -12, -4, 0, 4, 12, 20, 26, 30, 34].map((x) => columnBottom(b, x) ?? 0);
    expect(Math.max(...cols) - Math.min(...cols.filter((c) => c > 0))).toBeGreaterThanOrEqual(12);
    /* без прямоугольных ступеней: соседние колонки отличаются не больше чем на 9 */
    for (let x = -30; x < 30; x += 2) expect(Math.abs((columnBottom(b, x) ?? 0) - (columnBottom(b, x + 2) ?? 0))).toBeLessThanOrEqual(9);
  });
});

describe('SWING: качание заднего слоя волос', () => {
  test('значения по таблице владельца', () => {
    expect(SWING.pony.k).toBe(0.45);
    expect(SWING.braid.k).toBe(0.55);
    expect(SWING.braid.phase).toBeCloseTo(0.6, 5);
    expect(SWING.long.k).toBe(0.3);
    expect(SWING.wavy.k).toBe(0.35);
    expect(SWING.braid.freq).toBeLessThan(SWING.long.freq); /* тяжёлая коса запаздывает */
    expect(Object.keys(SWING).sort()).toEqual(['bob', 'braid', 'long', 'pony', 'wavy']);
    expect(HAIR_STYLES.filter((h) => hairBackKind(h)).sort()).toEqual(['bob', 'braid', 'long', 'pony', 'wavy']);
  });
  test('шаговое покачивание отстаёт у косы и одно для остальных', () => {
    const a = (k: HairBackKind, ph: number): number => swingAngle(k, 0, ph, 1);
    /* максимум у косы позже максимума у long: sin(2ph − 0,6) против sin(2ph) */
    const peak = (k: HairBackKind): number => {
      let best = 0;
      let at = 0;
      for (let ph = 0; ph < Math.PI; ph += 0.001) if (a(k, ph) > best) { best = a(k, ph); at = ph; }
      return at;
    };
    expect(peak('braid') - peak('long')).toBeCloseTo(0.3, 2);
    expect(Math.abs(swingAngle('long', 0, 1.234, 0))).toBe(0);
  });
  test.each(['pony', 'braid', 'long', 'wavy', 'bob'] as HairBackKind[])('%s: при максимальном размахе волосы остаются в PERSON_BOX', (kind) => {
    const style = (kind === 'pony' ? 'pony' : kind) as HairStyle;
    const pts = shapePoints(layers(style).b).map((p) => ({ x: 1.1 * p.x, y: 458 + 1.1 * (p.y - 458) }));
    const maxA = SWING[kind].k * (0.5 + SWING_GAIT_MAX) + HEAD_ROLL_MAX; /* пружина ±0,5, шаг, поворот головы */
    const pv = HAIR_PIVOT[kind];
    for (const sgn of [-1, 1]) {
      const a = sgn * maxA;
      for (const p of pts) {
        const dx = p.x - pv.x;
        const dy = p.y - pv.y;
        const x = pv.x + dx * Math.cos(a) - dy * Math.sin(a);
        const y = pv.y + dx * Math.sin(a) + dy * Math.cos(a);
        expect(x).toBeGreaterThanOrEqual(-80);
        expect(x).toBeLessThanOrEqual(80);
        expect(y).toBeGreaterThanOrEqual(356);
        expect(y).toBeLessThanOrEqual(620);
      }
    }
  });
});
const SWING_GAIT_MAX = 0.12;
/** Наибольший крен головы в actor.ts: наклон корпуса до 9° × 0,8, взгляд в сторону до 8°, кивок: около 0,2 рад. */
const HEAD_ROLL_MAX = 0.2;

describe('моргание: своё зерно от номера, без Math.random', () => {
  test('интервалы 2,5–6 с, длительность 0,12–0,18 с у 300 актёров × 20 морганий', () => {
    for (let id = 1; id <= 300; id++) for (const b of blinkPlan(id, 20)) {
      expect(b.gap).toBeGreaterThanOrEqual(BLINK_GAP[0]);
      expect(b.gap).toBeLessThanOrEqual(BLINK_GAP[1]);
      expect(b.dur).toBeGreaterThanOrEqual(BLINK_DUR[0]);
      expect(b.dur).toBeLessThanOrEqual(BLINK_DUR[1]);
    }
  });
  test('у каждого своё: первые паузы 300 актёров различны, один номер повторяется, среднее около 4,25 с', () => {
    const first = Array.from({ length: 300 }, (_, i) => blinkPlan(i + 1, 1)[0]?.gap);
    expect(new Set(first).size).toBe(300);
    expect(blinkPlan(7, 5)).toEqual(blinkPlan(7, 5));
    expect(blinkPlan(7, 5)).not.toEqual(blinkPlan(8, 5));
    const all = Array.from({ length: 300 }, (_, i) => blinkPlan(i + 1, 20)).flat();
    const mean = all.reduce((a, b) => a + b.gap, 0) / all.length;
    expect(Math.abs(mean - 4.25)).toBeLessThan(0.1);
  });
  test('Math.random не вызывается', () => {
    const real = Math.random;
    Math.random = () => {
      throw new Error('Math.random');
    };
    try {
      blinkPlan(3, 50);
      actorRng(5)();
    } finally {
      Math.random = real;
    }
  });
  test('три фазы: полузакрыто → закрыто → полузакрыто → открыто', () => {
    for (const d of [0.12, 0.15, 0.18]) {
      const seq: number[] = [];
      for (let t = 0; t < d + 0.05; t += 0.005) {
        const ph = blinkPhase(t, d);
        if (seq[seq.length - 1] !== ph) seq.push(ph);
      }
      expect(seq).toEqual([1, 2, 1, 0]);
    }
    expect(blinkPhase(-0.01, 0.15)).toBe(0);
  });
  test('в actor.ts: зерно от номера, joy не моргает, в коде нет Math.random', () => {
    expect(ACTOR).toContain('actorRng(o.id ?? 0)');
    expect(ACTOR).toContain("this.mood !== 'joy'");
    expect(ACTOR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).not.toContain('Math.random');
  });
});

describe('брови neutral и happy', () => {
  const MOODS2: MoodId[] = ['neutral', 'happy'];
  const base: Look = { skin: '#EBC09A', hair: 'short', hairCol: HAIR, outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'none' };
  test('цвет — цвет волос темнее на 15 %, линия тоньше прежних 2,5; у остальных настроений брови прежние', () => {
    const b = browSpec('neutral', false, HAIR, false);
    expect(b?.w).toBe(BROW_W);
    expect(BROW_W).toBeLessThan(2.5);
    expect(labOf(b?.color as string)[0]).toBeLessThan(labOf(HAIR)[0] + 0.001);
    for (const m of ['joy', 'wait', 'annoyed', 'angry'] as MoodId[]) expect(browSpec(m, false, HAIR, false)).toBeNull();
  });
  test.each([false, true])('середина дуги happy на 1,5 px выше линии neutral (очки: %s)', (g) => {
    const n = pathPoints(browSpec('neutral', g, HAIR, false)?.d as string)[0];
    const hp = pathPoints(browSpec('happy', g, HAIR, false)?.d as string);
    expect((n?.y as number) - Math.min(...hp.map((p) => p.y))).toBeCloseTo(1.5, 1);
  });
  test('все причёски × очки × настроение: ниже края волос не меньше 2 px, выше оправы очков; под beanie бровей нет', () => {
    let n = 0;
    for (const hair of HAIR_STYLES) for (const glasses of [false, true]) for (const mood of MOODS2) {
      const spec = browSpec(mood, glasses, HAIR, hair === 'beanie');
      if (hair === 'beanie') {
        expect(spec).toBeNull();
        continue;
      }
      expect(spec).not.toBeNull();
      const l = layers(hair);
      const front = l.f + l.o;
      const pts = pathPoints((spec as { d: string }).d);
      for (const p of pts) {
        const bottom = columnBottom(front, p.x + 0.01) ?? 404;
        expect(p.y - BROW_W / 2, `${hair} ${mood} x ${p.x}`).toBeGreaterThanOrEqual(bottom + 2);
        if (glasses) {
          const dx = Math.abs(p.x) - 11;
          if (Math.abs(dx) <= 8) expect(p.y + BROW_W / 2).toBeLessThanOrEqual(437 - Math.sqrt(64 - dx * dx) - 1.25 - 0.5);
        }
      }
      const head = personParts({ ...base, hair, acc: glasses ? 'glasses' : 'none' }).head(mood);
      expect(head).toContain((spec as { d: string }).d);
      n++;
    }
    expect(n).toBe(11 * 2 * 2);
  });
});

describe('посадка за столиком: маски и рост гостя не менялись (32-Г)', () => {
  const seat = (): string => {
    const w = WORLD.replace(/\r/g, '');
    const i = w.indexOf('  private seatMasks(a: Actor | null): void {');
    return w.slice(i, w.indexOf('\n  }\n', i) + 5);
  };
  test('текст seatMasks (маски seatMaskA/B) прежний', () => {
    expect(seat()).toContain('draw(this.seatMaskA, 164, 284);');
    expect(seat()).toContain('draw(this.seatMaskB, LID_X0, LID_X1);');
    expect(sha(seat())).toBe('b40ac891685dd-1322');
  });
  test('GUEST_K прежний 1,6; задний слой в actor.ts стоит на месте (привязка сброшена)', () => {
    expect(GUEST_K).toBe(1.6);
    expect(ACTOR).toContain('sp.pivot.set(0, 0);');
  });
  test.each(['braid', 'wavy', 'long', 'pony', 'bob'] as HairBackKind[])('%s: задний слой ложится в клетку атласа и ниже плеч не уходит (низ ≤ y 502)', (kind) => {
    const pts = shapePoints(layers(kind as HairStyle).b).map((p) => ({ x: 1.1 * p.x, y: 458 + 1.1 * (p.y - 458) }));
    expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(502);
  });
});
