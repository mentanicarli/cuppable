/**
 * Внешность гостя (32-Б): поля Look и чистый генератор lookFor(type, rng).
 * Здесь только выбор значений по правилам; рисует Look `src/render/world/art.ts`.
 * Решения владельца (аудит 32-А, docs/design/people.md): пол и возраст ограничивают причёску, усы и бороду, седину;
 * шапка не сливается с худи; наушники допустимы с любой причёской (слои решает рисунок, 32-В).
 */
import type { Rng } from './types';
import { deltaE } from './drinkModel';

export type Sex = 'm' | 'f';
export type Age = 'young' | 'adult' | 'senior';
export type Facial = 'none' | 'mustache' | 'beard';
export type PersonType = 'regular' | 'student' | 'hurry';

/** Причёски по смыслу. crop, sidepart, braid, wavy в арте появятся в 32-В, до этого рисуются по FALLBACK_STYLE. */
export type HairStyle = 'short' | 'grey' | 'crop' | 'sidepart' | 'bob' | 'bun' | 'braid' | 'pony' | 'long' | 'curly' | 'wavy' | 'beanie';
/** Причёски, которые рисует art.ts сейчас. */
export type RenderStyle = 'short' | 'grey' | 'bob' | 'bun' | 'pony' | 'long' | 'curly' | 'beanie';

export interface Look {
  skin: string;
  hair: HairStyle;
  hairCol: string;
  outfit: string;
  cloth: string;
  hat?: string;
  pants?: string;
  shoe?: string;
  acc?: string;
  item?: string;
  build?: string;
  /** Производное от facial (пока 32-В не заменит рисунок): усы рисуются и для бороды. */
  mustache?: boolean;
  sex: Sex;
  age: Age;
  facial: Facial;
}

/** ВРЕМЕННО (до 32-В): ближайший существующий рисунок для новых причёсок. */
export const FALLBACK_STYLE: Readonly<Partial<Record<HairStyle, RenderStyle>>> = { crop: 'short', sidepart: 'short', braid: 'long', wavy: 'curly' };
export const renderStyle = (h: HairStyle): RenderStyle => FALLBACK_STYLE[h] ?? (h as RenderStyle);

export const SKIN: readonly string[] = ['#F5D0AE', '#EBC09A', '#D9A67E', '#B98160', '#A26C49'];
export const HAIR: readonly string[] = ['#3A2A22', '#7A3E2B', '#C99028', '#2E2E3A', '#A55B3A', '#CFC4B4'];
export const GREY = '#CFC4B4';
/** Не седые цвета: любые для молодых и взрослых. */
export const HAIR_COLORED: readonly string[] = HAIR.filter((c) => c !== GREY);
/** Тёмный или каштановый: не седая часть пожилых. */
export const HAIR_SENIOR_OTHER: readonly string[] = ['#3A2A22', '#7A3E2B', '#2E2E3A', '#A55B3A'];
export const CLOTH: readonly string[] = ['#C4694A', '#93A684', '#E8B04A', '#7FA3A8', '#8A5A6E', '#D98C5F', '#5F7A8A', '#B85C3F'];
export const HURRY_CLOTH: readonly string[] = ['#4A5568', '#5A4A5E', '#3F5A58', '#6B4A44'];
export const FALLBACK_HAT = '#F3EBDD';
export const HAT_MIN_DELTA = 15;
export const HAT_TRIES = 5;

export const HAIR_MALE: readonly HairStyle[] = ['short', 'grey', 'crop', 'sidepart'];
export const HAIR_FEMALE: readonly HairStyle[] = ['bob', 'bun', 'braid', 'pony', 'long'];
export const HAIR_NEUTRAL: readonly HairStyle[] = ['curly', 'wavy', 'beanie'];
/** Какие причёски вообще бывают у типа (регулярный и спешащий без шапки; спешащему не идут длинные). */
const HAIR_TYPE_ALLOWED: Readonly<Record<PersonType, readonly HairStyle[]>> = {
  regular: [...HAIR_MALE, ...HAIR_FEMALE, 'curly', 'wavy'],
  student: [...HAIR_MALE, ...HAIR_FEMALE, ...HAIR_NEUTRAL],
  hurry: ['short', 'grey', 'crop', 'sidepart', 'bob', 'bun', 'braid', 'pony', 'curly', 'wavy']
};
/** Доля «своей» группы причёсок и доля мужских/женских внутри «своей или нейтральной». */
export const OWN_GROUP_SHARE = 0.85;
export const NEUTRAL_SHARE = 0.3;

export const SEX_SHARE_M: Readonly<Record<PersonType, number>> = { regular: 0.5, student: 0.5, hurry: 0.55 };
export const AGE_SHARE: Readonly<Record<PersonType, readonly (readonly [Age, number])[]>> = {
  regular: [['adult', 0.6], ['senior', 0.3], ['young', 0.1]],
  student: [['young', 1]],
  hurry: [['adult', 0.85], ['young', 0.15]]
};
export const FACIAL_SHARE: Readonly<Record<Age, readonly (readonly [Facial, number])[]>> = {
  young: [['none', 1]],
  adult: [['none', 0.7], ['mustache', 0.15], ['beard', 0.15]],
  senior: [['none', 0.55], ['mustache', 0.2], ['beard', 0.25]]
};
export const SENIOR_GREY_SHARE = 0.75;
export const HEADPHONES_SHARE: Readonly<Record<PersonType, number>> = { regular: 0.05, student: 0.35, hurry: 0.05 };
export const HURRY_SUIT_SHARE = 0.6;

const PANTS: Readonly<Record<PersonType, readonly string[]>> = {
  regular: ['#5C4A3E', '#4F4A5A', '#3E4A55'],
  student: ['#4F4A5A', '#6A5B4E', '#3E4A55'],
  hurry: ['#3A3440']
};
const OUTFITS: Readonly<Record<PersonType, readonly string[]>> = { regular: ['coat', 'sweater', 'jacket'], student: ['hoodie'], hurry: ['suit', 'coat'] };
const ACC_WEIGHTS: Readonly<Record<PersonType, readonly (readonly [string, number])[]>> = {
  regular: [['glasses', 2], ['scarf', 1], ['none', 1]],
  student: [['backpack', 1]],
  hurry: [['none', 1]]
};
const ITEMS: Readonly<Record<PersonType, readonly string[]>> = { regular: ['tote', 'none'], student: ['none'], hurry: ['briefcase', 'phone'] };
const BUILDS: Readonly<Record<PersonType, readonly string[]>> = { regular: ['slim', 'mid', 'round'], student: ['slim', 'mid'], hurry: ['slim', 'mid'] };

/** Сколько случайных чисел прежний lookFor брал у Math.random: spawn не должен сдвигать поток остальных бросков. */
export const LEGACY_DRAWS: Readonly<Record<PersonType, number>> = { regular: 10, student: 8, hurry: 6 };

function mulberry(a: number): Rng {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pickFrom = <T,>(r: Rng, a: readonly T[]): T => a[Math.min(a.length - 1, Math.floor(r() * a.length))] as T;
function weighted<T>(r: Rng, a: readonly (readonly [T, number])[]): T {
  let x = r() * a.reduce((s, e) => s + e[1], 0);
  for (const [v, w] of a) if ((x -= w) <= 0) return v;
  return (a[a.length - 1] as readonly [T, number])[0];
}

/** Причёски, которые бывают у такого человека (grey только у пожилых). */
export function allowedHair(type: PersonType, age: Age): HairStyle[] {
  return HAIR_TYPE_ALLOWED[type].filter((h) => h !== 'grey' || age === 'senior');
}

/** Группы причёсок с долями для пола (после отбора по типу и возрасту; пустая группа пропускается). */
export function hairGroups(type: PersonType, sex: Sex, age: Age): [HairStyle[], number][] {
  const ok = allowedHair(type, age);
  const sel = (g: readonly HairStyle[]): HairStyle[] => g.filter((h) => ok.includes(h));
  const own = sel(sex === 'm' ? HAIR_MALE : HAIR_FEMALE);
  const other = sel(sex === 'm' ? HAIR_FEMALE : HAIR_MALE);
  const neutral = sel(HAIR_NEUTRAL);
  const groups: [HairStyle[], number][] = [
    [own, OWN_GROUP_SHARE * (1 - NEUTRAL_SHARE)],
    [neutral, OWN_GROUP_SHARE * NEUTRAL_SHARE],
    [other, 1 - OWN_GROUP_SHARE]
  ];
  return groups.filter(([g]) => g.length > 0);
}

/** Цвета волос для причёски и возраста. */
export function hairColors(hair: HairStyle, age: Age): readonly string[] {
  if (hair === 'grey') return [GREY];
  return age === 'senior' ? [GREY, ...HAIR_SENIOR_OTHER] : HAIR_COLORED;
}

/** Шапка: до 5 попыток взять цвет, заметно отличающийся от худи, иначе нейтральный запасной. */
export function pickHat(r: Rng, cloth: string): string {
  for (let i = 0; i < HAT_TRIES; i++) {
    const c = pickFrom(r, CLOTH);
    if (deltaE(c, cloth) >= HAT_MIN_DELTA) return c;
  }
  return FALLBACK_HAT;
}

/** Чистый генератор внешности: ничего не читает и не пишет снаружи. rng даёт только зерно (LEGACY_DRAWS чисел, как делал прежний lookFor), остальное — локальный генератор. */
export function lookFor(type: string, rng: Rng = Math.random): Look {
  const t: PersonType = type === 'student' || type === 'hurry' ? type : 'regular';
  let h = 0x811c9dc5;
  for (let i = 0; i < LEGACY_DRAWS[t]; i++) h = Math.imul(h ^ Math.floor(rng() * 4294967296), 16777619);
  const r = mulberry(h >>> 0);
  const sex: Sex = r() < SEX_SHARE_M[t] ? 'm' : 'f';
  const age = weighted(r, AGE_SHARE[t]);
  const hair = pickFrom(r, weighted(r, hairGroups(t, sex, age)));
  const hairCol = age === 'senior' && hair !== 'grey' ? (r() < SENIOR_GREY_SHARE ? GREY : pickFrom(r, HAIR_SENIOR_OTHER)) : pickFrom(r, hairColors(hair, age));
  const facial: Facial = sex === 'm' ? weighted(r, FACIAL_SHARE[age]) : 'none';
  const outfit = t === 'hurry' ? (r() < HURRY_SUIT_SHARE ? 'suit' : 'coat') : pickFrom(r, OUTFITS[t]);
  const cloth = pickFrom(r, t === 'hurry' ? HURRY_CLOTH : CLOTH);
  const headphones = r() < HEADPHONES_SHARE[t];
  const acc = headphones ? 'headphones' : weighted(r, ACC_WEIGHTS[t]);
  const look: Look = {
    skin: pickFrom(r, SKIN),
    hair,
    hairCol,
    outfit,
    cloth,
    pants: pickFrom(r, PANTS[t]),
    acc,
    item: pickFrom(r, ITEMS[t]),
    build: pickFrom(r, BUILDS[t]),
    mustache: facial !== 'none',
    sex,
    age,
    facial
  };
  if (hair === 'beanie') look.hat = pickHat(r, cloth);
  if (t === 'student') look.shoe = '#FBF4E8';
  return look;
}

/** Бариста в формате Look: цвета берёт рисунок baristaParts (картинка не меняется). */
export const BARISTA_LOOK: Look = { skin: SKIN[0] as string, hair: 'bun', hairCol: '#3A2A22', outfit: 'apron', cloth: '#93A684', sex: 'f', age: 'adult', facial: 'none' };
