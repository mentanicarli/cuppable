import { describe, expect, test } from 'vitest';
import BASE from './fixtures/people-baseline.json';
import LOOKS from './fixtures/look-baseline.json';
import { baristaHash, cellsHash, fixedLooks, mulberry, orderStream, sha, torsoHash } from './helpers/peopleSnap';
import { deltaE } from '../src/game/drinkModel';
import {
  AGE_SHARE, BARISTA_LOOK, CLOTH, FACIAL_SHARE, FALLBACK_HAT, GLASSES_BY_AGE, GREY, HAIR_FEMALE, HAIR_MALE, HAIR_SENIOR_OTHER, HURRY_CLOTH, HURRY_SUIT_SHARE,
  LEGACY_DRAWS, SEX_SHARE_M, SKIN, hairColors, hairFor, headphonesShare, lookFor, type Age, type Look, type PersonType
} from '../src/game/look';
import { baristaParts } from '../src/render/world/art';

const TYPES: PersonType[] = ['regular', 'student', 'hurry'];
const N = 20000;
const draw = (t: PersonType, seed: number): Look[] => {
  const r = mulberry(seed);
  return Array.from({ length: N }, () => lookFor(t, r));
};
const share = (xs: Look[], f: (l: Look) => boolean): number => (xs.filter(f).length / xs.length) * 100;
const near = (got: number, want: number, tol = 2): void => expect(Math.abs(got - want), `${got.toFixed(2)} vs ${want}`).toBeLessThanOrEqual(tol);

describe('картинка не изменилась (эталон из кода до 32-Б)', () => {
  test('руки, ноги, ступни, кисти старых внешностей побитово прежние; торс пересчитан в 32-Е намеренно (наряды по полу, торс-эталон torso)', () => {
    const looks = fixedLooks('headphones').map((l) => ({ ...l, sex: 'f', age: 'adult', facial: l.mustache ? 'mustache' : 'none' } as Record<string, unknown>));
    expect(looks.map((l) => cellsHash(l as never))).toEqual(BASE.cells);
    expect(looks.map((l) => torsoHash(l as never))).toEqual(BASE.torso);
  });
  test('внешности по сиду 32 (по 300 на тип) совпадают с эталоном look-baseline.json (пересоздан в 32-Е намеренно: наряды по полу, ступени бороды, серьги)', () => {
    for (const t of TYPES) {
      const r = mulberry(32);
      expect(sha(JSON.stringify(Array.from({ length: 300 }, () => lookFor(t, r))))).toBe(LOOKS[t]);
    }
  });
  test('бариста: части не изменились, BARISTA_LOOK в новом формате', () => {
    expect(baristaHash()).toBe(BASE.barista);
    expect(BARISTA_LOOK).toMatchObject({ sex: 'f', age: 'adult', facial: 'none', hair: 'bun' });
    expect(baristaParts().head('smile')).toContain(BARISTA_LOOK.hairCol);
  });
  test('rollOrder и поток случайных чисел spawn при том же сиде равны прежним', () => {
    const rng = mulberry(7);
    expect(orderStream(rng, (t) => void lookFor(t, rng))).toBe(BASE.orders);
  });
  test('lookFor берёт из rng ровно столько чисел, сколько брал прежний', () => {
    for (const t of TYPES) {
      let n = 0;
      lookFor(t, () => (++n, 0.37));
      expect(n).toBe(LEGACY_DRAWS[t]);
    }
  });
});

describe('lookFor: правила генератора (20 000 гостей на тип, сид фиксирован)', () => {
  const data = Object.fromEntries(TYPES.map((t, i) => [t, draw(t, 100 + i)])) as Record<PersonType, Look[]>;

  test('детерминирован и чист: тот же rng даёт ту же внешность', () => {
    for (const t of TYPES) expect(lookFor(t, mulberry(5))).toEqual(lookFor(t, mulberry(5)));
  });
  test('доли пола и возраста в допуске ±2 п.п.', () => {
    for (const t of TYPES) {
      const xs = data[t];
      near(share(xs, (l) => l.sex === 'm'), SEX_SHARE_M[t] * 100);
      for (const [a, w] of AGE_SHARE[t]) near(share(xs, (l) => l.age === a), w * 100);
    }
  });
  test('борода и усы: только у мужчин adult/senior, доли по возрасту', () => {
    for (const t of TYPES) {
      for (const l of data[t]) {
        if (l.sex === 'f' || l.age === 'young') expect(l.facial).toBe('none');
      }
      for (const age of ['adult', 'senior'] as Age[]) {
        const men = data[t].filter((l) => l.sex === 'm' && l.age === age);
        if (men.length < 500) continue;
        for (const [f, w] of FACIAL_SHARE[age]) near(share(men, (l) => l.facial === f), w * 100, 4);
      }
    }
  });
  test('седина только у пожилых; grey только у пожилых и всегда седая', () => {
    for (const t of TYPES) {
      for (const l of data[t]) {
        if (l.age !== 'senior') {
          expect(l.hairCol).not.toBe(GREY);
          expect(l.hair).not.toBe('grey');
        }
        if (l.hair === 'grey') expect(l.hairCol).toBe(GREY);
      }
    }
    const seniors = data.regular.filter((l) => l.age === 'senior' && l.hair !== 'grey');
    near(share(seniors, (l) => l.hairCol === GREY), 75, 4);
    for (const l of seniors) if (l.hairCol !== GREY) expect(HAIR_SENIOR_OTHER).toContain(l.hairCol);
  });
  test('причёски строго по полу (кросс-гендерных нет), косы, хвост, пучок только у женщин; у beanie есть шапка, ΔE шапки и худи ≥ 15', () => {
    for (const t of TYPES) {
      for (const l of data[t]) {
        expect(hairFor(t, l.sex, l.age)).toContain(l.hair);
        if (l.sex === 'm') expect((HAIR_MALE as readonly string[]).includes(l.hair)).toBe(true);
        else expect((HAIR_FEMALE as readonly string[]).includes(l.hair)).toBe(true);
        if (['braid', 'pony', 'bun', 'long', 'wavy', 'bob'].includes(l.hair)) expect(l.sex).toBe('f');
        if (l.facial !== 'none') expect(l.sex).toBe('m');
        if (l.hair === 'beanie') {
          expect(l.hat).toBeTruthy();
          if (l.hat !== FALLBACK_HAT) expect(deltaE(l.hat as string, l.cloth)).toBeGreaterThanOrEqual(15);
        } else expect(l.hat).toBeUndefined();
      }
    }
  });
  test('запасной цвет шапки отличается от любого худи на ΔE ≥ 15, и берётся редко', () => {
    for (const c of [...CLOTH, ...HURRY_CLOTH]) expect(deltaE(FALLBACK_HAT, c)).toBeGreaterThanOrEqual(15);
    const hats = data.student.filter((l) => l.hair === 'beanie');
    expect(hats.length).toBeGreaterThan(500);
    expect(share(hats, (l) => l.hat === FALLBACK_HAT)).toBeLessThan(1);
  });
  test('наушники: student 35 %, иначе по возрасту (young 20 / adult 5 / senior 1); очки по возрасту (8 / 12 / 35); у hurry-мужчин костюм 60 % / пальто 40 %', () => {
    for (const t of TYPES) for (const a of ['young', 'adult', 'senior'] as Age[]) {
      const g = data[t].filter((l) => l.age === a);
      if (g.length < 800) continue;
      near(share(g, (l) => l.acc === 'headphones'), headphonesShare(t, a) * 100, 2.5);
      near(share(g.filter((l) => l.acc !== 'headphones'), (l) => l.acc === 'glasses'), GLASSES_BY_AGE[a] * 100, 3);
    }
    near(share(data.hurry.filter((l) => l.sex === 'm'), (l) => l.outfit === 'suit'), HURRY_SUIT_SHARE * 100, 3);
  });
  test('все причёски типа встречаются, нулевых долей нет', () => {
    for (const t of TYPES) {
      const seen = new Set(data[t].map((l) => l.hair));
      const want = new Set((['young', 'adult', 'senior'] as Age[]).filter((a) => AGE_SHARE[t].some(([x]) => x === a)).flatMap((a) => [...hairFor(t, 'm', a), ...hairFor(t, 'f', a)]));
      expect([...seen].sort()).toEqual([...want].sort());
    }
  });
});

describe('число различимых внешностей не меньше, чем до правок', () => {
  /* до 32-Б (аудит 32-А): regular 388 800, student 15 360, hurry 1 440 */
  const OLD: Record<PersonType, number> = { regular: 388800, student: 15360, hurry: 1440 };
  const ACC: Record<PersonType, string[]> = { regular: ['glasses', 'scarf', 'none'], student: ['backpack'], hurry: ['none'] };
  const ITEM: Record<PersonType, string[]> = { regular: ['tote', 'none'], student: ['none'], hurry: ['briefcase', 'phone'] };
  const OUT: Record<PersonType, number> = { regular: 3, student: 1, hurry: 2 };
  const BUILD: Record<PersonType, number> = { regular: 3, student: 2, hurry: 2 };
  const PANTS: Record<PersonType, number> = { regular: 3, student: 3, hurry: 1 };
  const distinct = (t: PersonType): number => {
    const clothes = t === 'hurry' ? HURRY_CLOTH : CLOTH;
    const accs = new Set([...ACC[t], 'headphones']).size;
    let total = 0;
    for (const cloth of clothes) {
      const heads = new Set<string>();
      const hats = [...CLOTH, FALLBACK_HAT].filter((c) => deltaE(c, cloth) >= 15);
      for (const [age] of AGE_SHARE[t]) for (const sex of ['m', 'f'] as const) {
        const facials = sex === 'm' ? FACIAL_SHARE[age].map(([f]) => f) : ['none'];
        for (const hair of hairFor(t, sex, age)) {
          const cols = hair === 'grey' ? [GREY] : age === 'senior' ? [GREY, ...HAIR_SENIOR_OTHER] : hairColors(hair, age);
          for (const f of facials) {
            const colVisible = hair !== 'beanie' || f !== 'none';
            for (const c of colVisible ? cols : ['-']) for (const hat of hair === 'beanie' ? hats : ['-']) heads.add(`${hair}|${c}|${hat}|${f === 'none' ? 0 : 1}`);
          }
        }
      }
      total += heads.size * SKIN.length * OUT[t] * PANTS[t] * accs * ITEM[t].length * BUILD[t];
    }
    return total;
  };
  test.each(TYPES)('%s', (t) => {
    const n = distinct(t);
    console.log(`различимых ${t}: ${n} (было ${OLD[t]})`);
    expect(n).toBeGreaterThanOrEqual(OLD[t]);
  });
});
