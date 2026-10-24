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

/** Причёски по смыслу; у каждой свой рисунок в art.ts (hairLayers). */
export type HairStyle = 'short' | 'grey' | 'crop' | 'sidepart' | 'bob' | 'bun' | 'braid' | 'pony' | 'long' | 'curly' | 'wavy' | 'beanie';
export const HAIR_STYLES: readonly HairStyle[] = ['short', 'grey', 'crop', 'sidepart', 'bob', 'bun', 'braid', 'pony', 'long', 'curly', 'wavy', 'beanie'];

/** Черты лица (32-Д): форма головы, ресницы, брови, нос, морщины, румянец. Положение глаз, рта и бровей от них не зависит. */
export interface FaceSpec {
  shape: 'round' | 'oval' | 'square';
  lashes: boolean;
  brow: 'thin' | 'normal' | 'thick';
  nose: 'small' | 'normal';
  wrinkles: 0 | 1 | 2;
  /** 0..1: сила румянца; видим, когда больше BLUSH_MIN (в happy и joy прибавляется BLUSH_MOOD). */
  blush: number;
}
/** Лицо по умолчанию для вручную собранных Look (листы, тесты): прежний круг без черт. */
export const DEFAULT_FACE: FaceSpec = { shape: 'round', lashes: false, brow: 'normal', nose: 'small', wrinkles: 0, blush: 0.5 };
export const BLUSH_MIN = 0.45;
export const BLUSH_MOOD = 0.2;

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
  sex: Sex;
  age: Age;
  facial: Facial;
  face?: FaceSpec;
}

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

/** Причёски строго по полу (32-Д): кросс-гендерных нет; grey только у пожилых, косы, хвост и пучок только у женщин. */
export const HAIR_MALE: readonly HairStyle[] = ['short', 'crop', 'sidepart', 'grey', 'curly', 'beanie'];
export const HAIR_FEMALE: readonly HairStyle[] = ['bob', 'bun', 'braid', 'pony', 'long', 'wavy', 'curly', 'beanie'];
/** Какие причёски бывают у типа: у обычных гостей и спешащих нет шапки, спешащему не идут длинные. */
const HAIR_TYPE_ALLOWED: Readonly<Record<PersonType, readonly HairStyle[]>> = {
  regular: HAIR_STYLES.filter((h) => h !== 'beanie'),
  student: HAIR_STYLES,
  hurry: HAIR_STYLES.filter((h) => h !== 'beanie' && h !== 'long')
};

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
/** Наушники: у студентов 35 %, иначе по возрасту (молодые 20 %, взрослые 5 %, пожилые 1 %). */
export const HEADPHONES_BY_AGE: Readonly<Record<Age, number>> = { young: 0.2, adult: 0.05, senior: 0.01 };
export const headphonesShare = (type: PersonType, age: Age): number => (type === 'student' ? 0.35 : HEADPHONES_BY_AGE[age]);
/** Очки (до наушников и без них): чаще с возрастом. Раньше очки были только у «regular» (около половины), у студентов и спешащих не было. */
export const GLASSES_BY_AGE: Readonly<Record<Age, number>> = { young: 0.08, adult: 0.12, senior: 0.35 };
export const HURRY_SUIT_SHARE = 0.6;

const PANTS: Readonly<Record<PersonType, readonly string[]>> = {
  regular: ['#5C4A3E', '#4F4A5A', '#3E4A55'],
  student: ['#4F4A5A', '#6A5B4E', '#3E4A55'],
  hurry: ['#3A3440']
};
const OUTFITS: Readonly<Record<PersonType, readonly string[]>> = { regular: ['coat', 'sweater', 'jacket'], student: ['hoodie'], hurry: ['suit', 'coat'] };
const ACC_WEIGHTS: Readonly<Record<PersonType, readonly (readonly [string, number])[]>> = {
  regular: [['scarf', 1], ['none', 1]],
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

/** Причёски, которые бывают у такого человека: пол, тип гостя, возраст (grey только у пожилых). */
export function hairFor(type: PersonType, sex: Sex, age: Age): HairStyle[] {
  const own = sex === 'm' ? HAIR_MALE : HAIR_FEMALE;
  return own.filter((h) => HAIR_TYPE_ALLOWED[type].includes(h) && (h !== 'grey' || age === 'senior'));
}
/** Все причёски типа (любой пол и возраст). */
export function allowedHair(type: PersonType, age: Age): HairStyle[] {
  return HAIR_STYLES.filter((h) => (['m', 'f'] as const).some((sx) => hairFor(type, sx, age).includes(h)));
}

/** Цвета волос для причёски и возраста. */
export function hairColors(hair: HairStyle, age: Age): readonly string[] {
  if (hair === 'grey') return [GREY];
  return age === 'senior' ? [GREY, ...HAIR_SENIOR_OTHER] : HAIR_COLORED;
}

/** Лицо по полу и возрасту (32-Д): женщины round/oval, ресницы 70 %, брови thin/normal, нос small 70 %; мужчины oval/square, без ресниц, брови normal/thick, нос normal 70 %. */
export function faceFor(r: Rng, sex: Sex, age: Age, facial: Facial): FaceSpec {
  const f = sex === 'f';
  const shape = pickFrom(r, f ? (['round', 'oval'] as const) : (['oval', 'square'] as const));
  const lashes = f ? r() < 0.7 : (r(), false);
  const brow = pickFrom(r, f ? (['thin', 'normal'] as const) : (['normal', 'thick'] as const));
  const nose = (r() < 0.7) === f ? 'small' : 'normal';
  const w = r();
  const wrinkles: 0 | 1 | 2 = age === 'young' ? 0 : age === 'adult' ? (w < 0.3 ? 1 : 0) : w < 0.5 ? 1 : 2;
  const jitter = (r() - 0.5) * 0.6;
  let blush = age === 'young' ? (f ? 0.6 + jitter : 0.2) : age === 'adult' ? (f ? 0.4 : 0.1) : 0.1;
  blush = Math.min(1, Math.max(0, blush));
  if (facial === 'beard') blush = 0;
  return { shape, lashes, brow, nose, wrinkles, blush: Math.round(blush * 100) / 100 };
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
  const hair = pickFrom(r, hairFor(t, sex, age));
  const hairCol = age === 'senior' && hair !== 'grey' ? (r() < SENIOR_GREY_SHARE ? GREY : pickFrom(r, HAIR_SENIOR_OTHER)) : pickFrom(r, hairColors(hair, age));
  const facial: Facial = sex === 'm' ? weighted(r, FACIAL_SHARE[age]) : 'none';
  const outfit = t === 'hurry' ? (r() < HURRY_SUIT_SHARE ? 'suit' : 'coat') : pickFrom(r, OUTFITS[t]);
  const cloth = pickFrom(r, t === 'hurry' ? HURRY_CLOTH : CLOTH);
  const headphones = r() < headphonesShare(t, age);
  const glasses = r() < GLASSES_BY_AGE[age];
  const acc = headphones ? 'headphones' : glasses ? 'glasses' : weighted(r, ACC_WEIGHTS[t]);
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
    sex,
    age,
    facial,
    face: faceFor(r, sex, age, facial)
  };
  if (hair === 'beanie') look.hat = pickHat(r, cloth);
  if (t === 'student') look.shoe = '#FBF4E8';
  return look;
}

/** Бариста в формате Look: цвета берёт рисунок baristaParts (картинка не меняется). */
export const BARISTA_LOOK: Look = { skin: SKIN[0] as string, hair: 'bun', hairCol: '#3A2A22', outfit: 'apron', cloth: '#93A684', sex: 'f', age: 'adult', facial: 'none' };
