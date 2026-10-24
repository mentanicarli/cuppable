import { describe, expect, test } from 'vitest';
import { deltaE, labOf } from '../src/game/drinkModel';
import { GREY, HAIR_STYLES, SKIN, type HairStyle, type Look } from '../src/game/look';
import { BEARD_D, beardColor, MOODS_FOR_TEST, MOUSTACHE_D, MOUTH_PATHS, MOUTH_WIDTH, hairLayers, lipsWidth, personParts, type MoodId } from '../src/render/world/art';
import { HAIRLINE_MAX, HAIRLINE_MIN, asymmetry, curls, diffShare, fillShapes, gaps, hairline, inPoly, mass, sideEnd, silhouetteGap } from './helpers/hairAudit';
import { pathPoints, type Pt } from './helpers/geom';

/** Критерии «натуральности» Н1–Н8 (32-В2): числа считаются по геометрии и растру, docs/design/people.md раздел 10. */
const HAIR = '#3A2A22';
const layers = (s: HairStyle, col = HAIR): { b: string; f: string; o: string } => hairLayers(s, col, '#5F7A8A');
const STYLES = HAIR_STYLES.filter((s) => s !== 'beanie');
const SCALE = 1.1 * 1.6; /* масштаб головы в игре: 1,1 (рисунок) × 1,6 (рост гостя) */
const N8_SET: HairStyle[] = ['sidepart', 'bob', 'long', 'grey', 'curly', 'wavy'];

describe.each(STYLES)('натуральность: %s', (s) => {
  const l = layers(s);
  const front = l.f + l.o;
  test('Н1: линия роста на лбу в допуске (30–55 % от верха черепа до верха глаз, лоб не больше трети лица)', () => {
    const hl = hairline(l.f);
    expect(hl).toBeGreaterThanOrEqual(HAIRLINE_MIN - 0.05);
    expect(hl).toBeLessThanOrEqual(HAIRLINE_MAX);
  });
  test('Н2: нет просветов внутри массы и голой макушки', () => {
    const g = gaps(front);
    expect(g.holes).toBe(0);
    expect(g.crown).toBeLessThanOrEqual(0.5);
  });
  test('Н3: есть закраска, внутренних штрихов не больше трёх, все заливки цвета волос', () => {
    const m = mass(front);
    expect(m.area).toBeGreaterThanOrEqual(450);
    expect(m.strokes).toBeLessThanOrEqual(3);
    for (const f of fillShapes(front)) expect(f.fill).toBe(HAIR);
  });
  test('Н4: край доходит до висков (ниже 429 у ушей)', () => {
    expect(sideEnd(front)).toBeGreaterThanOrEqual(429);
  });
  test('Н7: контур — прежние классы толщины, у заливок нет своего цвета линии', () => {
    for (const w of [...front.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]))) expect([1.8, 2, 2.2, 2.5, 3]).toContain(w);
    for (const m of front.matchAll(/<(?:path|circle|ellipse|rect)\b[^>]*fill="#[0-9A-Fa-f]{6}"[^>]*>/g)) expect(m[0]).not.toMatch(/stroke="(?!none)/);
  });
  if (N8_SET.includes(s)) {
    test('Н8: левая и правая половины чуть не равны (4–25 % по площади)', () => {
      const a = asymmetry(front);
      expect(a).toBeGreaterThanOrEqual(0.04);
      expect(a).toBeLessThanOrEqual(0.25);
    });
  }
});

describe('Н5: curly — шапка и завитки по краю; wavy — волны', () => {
  const c = curls(layers('curly').f);
  test('завитков не меньше 7, разного размера, не на одной окружности, перекрываются', () => {
    expect(c.n).toBeGreaterThanOrEqual(7);
    expect(c.ratio).toBeGreaterThanOrEqual(1.3);
    expect(c.ringStd).toBeGreaterThanOrEqual(2);
    expect(c.overlaps).toBeGreaterThanOrEqual(4);
  });
  test('под завитками общая закраска, а внутри массы нет контуров завитков (заливка без обводки после контуров)', () => {
    const f = layers('curly').f;
    expect(fillShapes(f).some((x) => x.poly.length > 6)).toBe(true);
    expect((f.match(/stroke="none"/g) ?? []).length).toBeGreaterThanOrEqual(c.n);
  });
  test('wavy: чёлка из волн (не меньше 5 дуг в передней части)', () => {
    expect((layers('wavy').f.match(/Q/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });
});

describe('crop: виски того же цвета', () => {
  test('нет светлее цвета волос больше чем на 6 единиц Lab', () => {
    const f = layers('crop').f;
    const L0 = labOf(HAIR)[0];
    for (const m of f.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)) expect(labOf(m[1] as string)[0] - L0).toBeLessThanOrEqual(6);
    for (const x of fillShapes(f)) expect(deltaE(x.fill, HAIR)).toBe(0);
  });
});

describe('силуэты отличаются от short не меньше чем на 3 px при масштабе игры', () => {
  const short = layers('short').f;
  test.each(['crop', 'sidepart'] as HairStyle[])('%s', (s) => {
    const l = layers(s);
    expect(silhouetteGap(short, l.f) * SCALE).toBeGreaterThanOrEqual(3);
    expect(diffShare(short, l.f)).toBeGreaterThanOrEqual(0.06);
  });
});

describe('Н6: борода — единая форма, рот внутри, без светлого овала', () => {
  const poly: Pt[] = pathPoints(BEARD_D);
  const dense = (p: Pt[]): Pt[] => p.flatMap((a, i) => (p[i + 1] ? Array.from({ length: 8 }, (_, k) => ({ x: a.x + ((p[i + 1] as Pt).x - a.x) * (k / 8), y: a.y + ((p[i + 1] as Pt).y - a.y) * (k / 8) })) : [a]));
  const bd = dense(poly);
  const dist = (p: Pt): number => Math.min(...bd.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
  const mouth = (m: MoodId): Pt[] => dense(pathPoints(MOUTH_PATHS[m]));
  test('от висков и ушей: края на |x| не меньше 26, верх у висков не ниже уха (y не больше 436)', () => {
    expect(Math.min(...poly.map((p) => p.x))).toBeLessThanOrEqual(-26);
    expect(Math.max(...poly.map((p) => p.x))).toBeGreaterThanOrEqual(26);
    expect(Math.min(...poly.filter((p) => Math.abs(p.x) >= 26).map((p) => p.y))).toBeLessThanOrEqual(436);
  });
  test('низ бороды (подбородок) ниже круга лица, но в рамке головы (не ниже 473)', () => {
    expect(Math.max(...poly.map((p) => p.y))).toBeGreaterThan(460);
    expect(Math.max(...poly.map((p) => p.y))).toBeLessThanOrEqual(473);
  });
  test.each(MOODS_FOR_TEST.slice())('рот «%s» целиком внутри бороды, запас до края не меньше 1,5 px', (m) => {
    for (const p of mouth(m)) {
      expect(inPoly(p, poly), `${p.x},${p.y}`).toBe(true);
      expect(dist(p)).toBeGreaterThanOrEqual(1.5);
    }
  });
  test('зона рта (|x| не больше 14, y 446–458) вся закрыта бородой: светлого овала нет', () => {
    for (let x = -14; x <= 14; x += 1) for (let y = 446.5; y <= 458; y += 1) expect(inPoly({ x, y }, poly), `${x},${y}`).toBe(true);
  });
  test('губы: не толще 40 % ширины рта, ширина рта в таблице равна настоящей, цвет кожи, без контура; у открытого рта нет', () => {
    for (const m of MOODS_FOR_TEST) {
      const xs = pathPoints(MOUTH_PATHS[m]).map((p) => p.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(MOUTH_WIDTH[m], 1);
      expect(lipsWidth(m)).toBeLessThanOrEqual(0.4 * MOUTH_WIDTH[m]);
    }
    expect(lipsWidth('joy')).toBe(0);
    const skin = SKIN[2] as string;
    const look: Look = { skin, hair: 'short', hairCol: '#2E2E3A', outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: 'adult', facial: 'beard' };
    for (const m of MOODS_FOR_TEST) {
      const h = personParts(look).head(m);
      const lips = h.match(new RegExp(`<path d="[^"]*" fill="none" stroke="${skin}"[^>]*>`, 'g')) ?? [];
      expect(lips.length).toBe(m === 'joy' ? 0 : 1);
      for (const t of lips) expect(Number(/stroke-width="([\d.]+)"/.exec(t)?.[1])).toBeLessThanOrEqual(0.4 * MOUTH_WIDTH[m]);
      expect(h).not.toContain('E3806C'); /* румянец у бородача не рисуется поверх бороды */
    }
  });
  test('усы срастаются с бородой: не меньше 60 % точек усов внутри, верх усов вровень с краем бороды', () => {
    const st = pathPoints(MOUSTACHE_D);
    expect(st.filter((p) => inPoly(p, poly)).length / st.length).toBeGreaterThanOrEqual(0.6);
    const top = Math.min(...st.map((p) => p.y));
    const beardTop = Math.min(...bd.filter((p) => Math.abs(p.x) < 6).map((p) => p.y));
    expect(Math.abs(top - beardTop)).toBeLessThanOrEqual(2.5);
  });
  test('три цвета: заливка равна beardColor цвета волос (32-З: чуть темнее / светлее)', () => {
    for (const col of ['#2E2E3A', '#7A3E2B', GREY]) {
      const look: Look = { skin: SKIN[1] as string, hair: 'short', hairCol: col, outfit: 'sweater', cloth: '#C4694A', sex: 'm', age: col === GREY ? 'senior' : 'adult', facial: 'beard' };
      expect(personParts(look).head('neutral')).toContain(`<path d="${BEARD_D}" fill="${beardColor(col)}"/>`);
    }
  });
});
