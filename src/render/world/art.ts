/**
 * Рисованные персонажи: гости собираются из частей, бариста и мимика.
 * Здесь только SVG-разметка (векторный исходник); в игру части попадают как текстуры (см. rig.ts).
 */
import { deltaE } from '../../game/drinkModel';
import { BARISTA_LOOK, SKIN, type HairStyle, type Look } from '../../game/look';
export const INK = '#4A2F25';
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

const P = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number): string => {
  const x = P(a);
  const y = P(b);
  return '#' + [0, 1, 2].map((i) => Math.round((x[i] as number) + ((y[i] as number) - (x[i] as number)) * t).toString(16).padStart(2, '0')).join('');
};
const dk = (h: string, t = 0.22) => mix(h, '#3A1F18', t);
const lt = (h: string, t = 0.3) => mix(h, '#FFF4E0', t);
export { SKIN, lookFor, type Look } from '../../game/look';

const arm = (d: string, c: string, w = 11) =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;

export type MoodId = 'neutral' | 'happy' | 'joy' | 'wait' | 'annoyed' | 'angry';
interface MoodDef { m: string; b: string; h: boolean; f?: string }
/** Настроения: рот, брови, закрытые глаза. blink — моргание на нейтральном лице. */
const MOOD: Readonly<Record<MoodId, MoodDef>> = {
  neutral: { m: 'M-6 450q6 3 12 0', b: '', h: false },
  happy: { m: 'M-8 447q8 9 16 0', b: '', h: false },
  joy: { m: 'M-10 446q10 14 20 0Z', b: '', h: true, f: '#8A3F34' },
  wait: { m: 'M-5 451h10', b: 'M-15 427q5 -3 10 0M5 427q5 -3 10 0', h: false },
  annoyed: { m: 'M-7 454q7 -5 14 0', b: 'M-16 426L-5 430M16 426L5 430', h: false },
  angry: { m: 'M-8 456q8 -8 16 0', b: 'M-17 423L-4 430M17 423L4 430', h: false }
};

/** Слои причёски: b — задние волосы (отдельный спрайт, качается), f — перед лицом, o — поверх дужки наушников (пучок). */
export interface HairLayers { b: string; f: string; o: string }
/** Резинка косы: контрастна к цвету волос. */
const tieOf = (h: string): string => (deltaE(h, '#C4694A') < 30 ? '#5F7A8A' : '#C4694A');

export function hairLayers(style: HairStyle, h: string, bc: string): HairLayers {
  const top = `<path d="M-28 430Q-31 398 0 397Q31 398 28 430Q16 413 0 415Q-16 413 -28 430Z" fill="${h}"/>`;
  switch (style) {
    case 'bun': return { b: '', f: top, o: `<circle cx="0" cy="391" r="12" fill="${h}"/><path d="M-6 389q6 -5 12 0" fill="none" stroke="${lt(h, 0.35)}" stroke-width="2.5"/>` };
    case 'pony': return { b: `<path d="M18 408Q54 410 46 462Q38 444 24 436Z" fill="${h}"/>`, f: top, o: '' };
    case 'long': {
      /* 32-В2: линия роста по лбу (волосы закрывают верх лба, пробор «домиком»), объём вокруг лица, неровный нижний край сзади */
      const b = `<path d="M-32 432Q-40 402 0 397Q40 402 32 432L37 478Q35 492 28 486Q24 492 20 482Q17 474 14 468Q8 462 0 462Q-8 462 -14 468Q-17 474 -20 484Q-24 490 -28 486Q-34 494 -37 478Z" fill="${h}"/>`;
      const f = `<path d="M-29 437Q-35 398 1 394Q40 398 31 437Q27 426 21 421.5Q14 418.5 8.5 415.5Q4.5 413 1.5 409Q-1 413 -6 416Q-13 419 -21 422Q-26 426 -29 437Z" fill="${h}"/><path d="M-17 404Q-9 399 -3 401M12 402Q18 405 22 412" fill="none" stroke="${dk(h, 0.25)}" stroke-width="2"/>`;
      return { b, f, o: '' };
    }
    case 'bob': return { b: `<path d="M-31 440Q-36 400 0 397Q36 400 31 440L31 456Q18 460 16 446L-16 446Q-18 460 -31 456Z" fill="${h}"/>`, f: `<path d="M-28 436Q-31 398 0 397Q31 398 28 430Q10 411.5 -8 417.5Q-20 422 -28 436Z" fill="${h}"/>`, o: '' };
    case 'curly': {
      /* 32-В2: общая шапка волос и завитки разного размера по краю; сначала контуры, затем заливка без контура (внутри массы линий нет) */
      const cap = `<path d="M-29 434Q-32 403 0 400Q32 403 29 434Q25 421 16 417Q0 413 -16 417.5Q-25 421 -29 434Z" fill="${h}"/>`;
      const cs = [[-27, 430, 6.5], [-30, 418, 8.6], [-26, 408, 9.8], [-17, 399.5, 9], [-6, 398.5, 8], [5, 400, 9.2], [15, 399.5, 8.2], [24, 406, 8.4], [30, 418, 7.2], [28, 430, 6.8], [-12, 408, 6]];
      const ring = (stroke: string): string => cs.map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${h}"${stroke}/>`).join('');
      return { b: '', f: ring('') + cap + ring(' stroke="none"') + cap.replace('/>', ' stroke="none"/>') + `<path d="M-21 403q4 -4 8 0M9 397q4 -4 8 0" fill="none" stroke="${dk(h, 0.25)}" stroke-width="2"/>`, o: '' };
    }
    case 'beanie': return { b: '', f: `<path d="M-29 427Q-30 392 0 390Q30 392 29 427Z" fill="${bc}"/><rect x="-30" y="420" width="60" height="12" rx="6" fill="${lt(bc, 0.35)}"/><path d="M-20 424v6M-10 424v6M0 424v6M10 424v6M20 424v6" stroke="${dk(bc, 0.2)}" stroke-width="2"/><circle cx="0" cy="388" r="8" fill="${lt(bc, 0.5)}"/>`, o: '' };
    case 'grey':
      /* 32-В2: седая шапка волос целиком, объём над макушкой, три пряди внутри массы. 32-Г: линия роста ломаная (залысины у висков, мыс по центру), заходит на виски до верха уха, бакенбарды */
      return { b: '', f: `<path d="M-32 437Q-41 405 -17 396Q0 389 17 396Q36 404 30 437L28.5 446L24.5 440Q24 428 20 421Q16.5 413 11 414.5Q6 419 0 417Q-6 413 -12 415.5Q-17 412 -21 421Q-24.5 428 -25.5 440L-29 447Z" fill="${h}"/><path d="M-16 401Q-8 395.5 0 398M3 396Q11 394 18 400M-11 408Q-3 404.5 6 406" fill="none" stroke="${dk(h, 0.18)}" stroke-width="2"/>`, o: '' };
    case 'crop':
      /* ёжик: плотно к голове, ниже short, нет чёлки; виски того же цвета; штрихов на макушке нет (32-Г: читались как рубчик шапки) */
      return { b: '', f: `<path d="M-27.5 431Q-30 403 0 401Q30 403 27.5 431Q24 421 16 416.5Q0 413 -16 416.5Q-24 421 -27.5 431Z" fill="${h}"/>`, o: '' };
    case 'sidepart':
      /* короткая с чётким боковым пробором: объём слева, чёлка изгибом через лоб, линия пробора правее центра */
      return { b: '', f: `<path d="M-29 434Q-32 399 -8 395Q20 392 28 420Q28 427 27 434Q25 421 14 416Q6 413.5 0 414.5Q-8 415.5 -14 419.5Q-22 421.5 -29 434Z" fill="${h}"/><path d="M9 396Q12 405 7 414" fill="none" stroke="${dk(h, 0.4)}" stroke-width="2.2"/><path d="M-22 411Q-14 401 -4 401" fill="none" stroke="${dk(h, 0.25)}" stroke-width="2"/>`, o: '' };
    case 'braid': {
      /* одна коса через плечо вперёд (читается и стоя, и за ноутбуком), резинка другого цвета; висит как hairBack */
      const beads = [[-33, 440], [-36, 452], [-33, 464], [-36, 476], [-34, 486]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="6.5" ry="8" fill="${h}"/>`).join('');
      return { b: `${beads}<rect x="-40" y="486" width="11" height="5" rx="2" fill="${tieOf(h)}" stroke-width="2"/><ellipse cx="-34" cy="492" rx="4.5" ry="4" fill="${h}"/>`, f: top, o: '' };
    }
    case 'wavy':
      /* волны до плеч: объём ниже ушей, S-образный контур; впереди волнистая чёлка (волны разной величины) */
      return {
        b: `<path d="M-31 432Q-42 404 0 397Q42 404 31 432Q42 450 36 462Q44 474 34 482Q26 478 20 474Q14 466 8 462Q0 460 -8 462Q-14 466 -20 474Q-26 478 -34 482Q-44 474 -36 462Q-42 450 -31 432Z" fill="${h}"/>`,
        f: `<path d="M-28 437Q-38 398 0 396Q33 398 28 431Q25 421 18.5 417.5Q14 421.5 8.5 416.5Q3 420.5 -3 415.5Q-9 419.5 -15 415Q-22 419.5 -28 437Z" fill="${h}"/>`,
        o: ''
      };
    default: return { b: '', f: top, o: '' }; /* short */
  }
}

/** Причёски с задним слоем (hairBack): он качается отдельно, коэффициенты в actor.ts. */
export type HairBackKind = 'pony' | 'long' | 'bob' | 'braid' | 'wavy';
export const hairBackKind = (s: HairStyle): HairBackKind | null => (s === 'pony' || s === 'long' || s === 'bob' || s === 'braid' || s === 'wavy' ? s : null);

/** Качание заднего слоя волос (32-Г): k — доля размаха пружины, phase — отставание шагового покачивания от тела (рад), freq — частота пружины (чем ниже, тем тяжелее и позже). */
export const SWING: Readonly<Record<HairBackKind, { k: number; phase: number; freq: number }>> = {
  pony: { k: 0.45, phase: 0, freq: 8 },
  braid: { k: 0.55, phase: 0.6, freq: 5.5 },
  long: { k: 0.3, phase: 0, freq: 8 },
  wavy: { k: 0.35, phase: 0, freq: 8 },
  bob: { k: 0.35, phase: 0, freq: 8 }
};
/** Размах шагового покачивания волос в долях k (рад), его фаза отстаёт на SWING.phase. */
export const SWING_GAIT = 0.12;
/** Угол заднего слоя: пружина (от скорости и толчков) плюс шаговое покачивание. */
export const swingAngle = (kind: HairBackKind, spring: number, ph: number, wk: number): number => SWING[kind].k * (spring + wk * SWING_GAIT * Math.sin(2 * ph - SWING[kind].phase));
/** Точка подвеса заднего слоя в координатах фигуры: хвост у виска, остальные на макушке. */
export const HAIR_PIVOT: Readonly<Record<HairBackKind, { x: number; y: number }>> = { pony: { x: 22, y: 410 }, braid: { x: -30, y: 432 }, long: { x: 0, y: 404 }, wavy: { x: 0, y: 404 }, bob: { x: 0, y: 404 } };

/**
 * Верх головы по причёскам (y в координатах головы до масштаба 1,1; по нему стоят пузырь и реплика).
 * Значения равны верху рисунка hairLayers (проверяет test/peopleArt.test.ts); у beanie помпон выше шапки на 10, его не считаем.
 */
export const HEAD_TOP: Readonly<Record<HairStyle, number>> = { short: 397, grey: 392.5, crop: 401, sidepart: 394.8, bob: 397, bun: 379, braid: 397, pony: 397, long: 394, curly: 390.5, wavy: 396, beanie: 390 };
/** Верх дужки наушников вместе с обводкой (путь до y 394, обводка 8, бирюзовая линия 4). */
export const BAND_TOP = 390;
export const headTopOf = (l: Pick<Look, 'hair' | 'acc'>): number => (l.acc === 'headphones' ? Math.min(HEAD_TOP[l.hair], BAND_TOP + 0.5) : HEAD_TOP[l.hair]);

/**
 * Брови neutral и happy (32-Г): у остальных настроений брови прежние. Цвет — цвет волос, темнее на 15 %, линия 2 (тоньше прежних 2,5).
 * happy дугой, середина на 1,5 выше линии neutral; с очками обе выше оправы; под шапкой (beanie) не рисуются (ободок ниже бровей).
 */
export interface BrowSpec { d: string; color: string; w: number }
export const BROW_W = 2;
export function browSpec(mood: MoodId, glasses: boolean, hairCol: string, beanie: boolean): BrowSpec | null {
  if ((mood !== 'neutral' && mood !== 'happy') || beanie) return null;
  const y = glasses ? 426.2 : 428.5;
  const color = dk(hairCol, 0.15);
  if (mood === 'neutral') return { d: `M-14.5 ${y}h9M5.5 ${y}h9`, color, w: BROW_W };
  /* дуга: концы на линии neutral, середина на 1,5 выше */
  return { d: `M-15 ${y}q5 -3 10 0M5 ${y}q5 -3 10 0`, color, w: BROW_W };
}

/** Рты настроений (для проверки бороды). Борода идёт вокруг рта и никогда его не закрывает. */
export const MOUTH_PATHS: Readonly<Record<MoodId, string>> = { neutral: MOOD.neutral.m, happy: MOOD.happy.m, joy: MOOD.joy.m, wait: MOOD.wait.m, annoyed: MOOD.annoyed.m, angry: MOOD.angry.m };
export const BEARD_D = 'M-26.5 434Q-28 451 -21 461Q-12 472 0 472Q12 472 21 461Q28 451 26.5 434Q27 445.5 14 445.5Q0 439 -14 445.5Q-27 445.5 -26.5 434Z';
export const BEARD_PATH = (c: string): string => `<path d="${BEARD_D}" fill="${c}"/>`;
/** Ширина рта по настроению и светлая полоска губ: не толще 40 % ширины рта, без своего контура; у открытого рта (joy) губ нет. */
export const MOUTH_WIDTH: Readonly<Record<MoodId, number>> = { neutral: 12, happy: 16, joy: 20, wait: 10, annoyed: 14, angry: 16 };
export const LIPS_SHARE = 0.4;
export const lipsWidth = (m: MoodId): number => (m === 'joy' ? 0 : Math.floor(MOUTH_WIDTH[m] * LIPS_SHARE * 10) / 10);
export const MOUSTACHE_D = 'M-11 446Q-5 440 0 444Q5 440 11 446Q5 451 0 447Q-5 451 -11 446Z';
export const MOUSTACHE_PATH = (c: string): string => `<path d="${MOUSTACHE_D}" fill="${c}" stroke-width="2"/>`;
export const MOODS_FOR_TEST: readonly MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];

/** Порядок слоёв головы снизу вверх (docs/design/people.md, таблица); hairBack — отдельный спрайт под головой. */
export const HEAD_LAYER_ORDER = ['ears', 'face', 'beard', 'features', 'glasses', 'hair', 'band', 'bun', 'cups'] as const;
export type HeadLayer = (typeof HEAD_LAYER_ORDER)[number];

function outfit(kind: string, c: string, w: number): { back: string; torso: string } {
  const cd = dk(c, 0.25);
  const cl = lt(c, 0.3);
  const torso = `M${-30 * w} 572Q${-34 * w} 464 0 458Q${34 * w} 464 ${30 * w} 572Q0 582 ${-30 * w} 572Z`;
  const coatTorso = `M${-32 * w} 588Q${-36 * w} 466 0 458Q${36 * w} 466 ${32 * w} 588Q0 598 ${-32 * w} 588Z`;
  const shadeR = `<path d="M${30 * w} 570Q${34 * w} 466 0 458Q${24 * w} 470 ${20 * w} 574Z" fill="${cd}" fill-opacity=".38" stroke="none"/>`;
  switch (kind) {
    case 'hoodie': return { back: `<ellipse cx="0" cy="464" rx="26" ry="11" fill="${cd}"/>`, torso: `<path d="${torso}" fill="${c}"/>${shadeR}<path d="M${-18 * w} 538Q0 548 ${18 * w} 538L${21 * w} 562Q0 570 ${-21 * w} 562Z" fill="${cd}" stroke-width="2.5"/><path d="M-6 470v18M6 470v18" stroke-width="2.5" fill="none"/>` };
    case 'coat': return { back: '', torso: `<path d="${coatTorso}" fill="${c}"/>${shadeR}<path d="M-14 460L0 494L14 460Z" fill="#FBF4E8" stroke-width="2.5"/><path d="M-14 460L-7 504M14 460L7 504" fill="none" stroke-width="2.5"/><circle cx="0" cy="522" r="2.6" fill="${INK}" stroke="none"/><circle cx="0" cy="548" r="2.6" fill="${INK}" stroke="none"/>` };
    case 'sweater': return { back: '', torso: `<path d="${torso}" fill="${c}"/>${shadeR}<path d="M${-29 * w} 520Q0 530 ${29 * w} 520" fill="none" stroke="${cl}" stroke-width="9" stroke-linecap="butt"/><path d="M${-30 * w} 544Q0 554 ${30 * w} 544" fill="none" stroke="${cl}" stroke-width="9" stroke-linecap="butt"/><path d="M-14 461Q0 476 14 461" fill="none" stroke-width="3"/>` };
    case 'jacket': return { back: '', torso: `<path d="${torso}" fill="${c}"/>${shadeR}<path d="M-15 460L-9 474L0 466L9 474L15 460" fill="${cd}" stroke-width="2.5"/><path d="M0 466V574" fill="none" stroke-width="2.5"/><path d="M${-30 * w} 566Q0 576 ${30 * w} 566" fill="none" stroke="${cd}" stroke-width="8" stroke-linecap="butt"/>` };
    default: return { back: '', torso: `<path d="${torso}" fill="${c}"/>${shadeR}<path d="M-10 460L10 460L0 494Z" fill="#FBF4E8" stroke-width="2.5"/><path d="M-3 470H3L5 496L0 503L-5 496Z" fill="#C4694A" stroke-width="2.5"/>` };
  }
}

/** Клетка атласа: кусок разметки в собственных координатах, рамка box — что из него попадёт в текстуру. */
export interface PartCell { id: string; box: Box; svg: string }

/** Части фигуры. Туловище и голова нарисованы в координатах фигуры (центр x=0, ноги на y=600),
 *  руки и ноги — «лентами»: прямая заготовка вдоль оси x, которую игра изгибает по суставам. */
export interface PersonParts {
  /** Клетки общего атласа гостя. */
  cells: PartCell[];
  /** Дополнительные клетки для сидящего за столиком (ступня анфас). */
  seatCells: PartCell[];
  head: (mood: MoodId, blink?: boolean | 'half', gaze?: Gaze) => string;
  /** Тип задних волос, которые качаются отдельно: хвост, длинные, каре. */
  hairBack: HairBackKind | null;
  /** Слои головы снизу вверх (HEAD_LAYER_ORDER): порядок закреплён тестом и таблицей в docs/design/people.md. */
  layers: string[];
  skin: string;
}
export interface Gaze { x: number; y: number }

/** Длины костей, общие для рисунка и для расчёта поз (координаты фигуры). */
export const BONE = { arm1: 28, arm2: 29, leg1: 17, leg2: 17, cap: 8.5 } as const;
/** Плечи и бёдра в координатах фигуры. */
export const JOINT = { shL: [-24, 482], shR: [24, 482], hipL: [-11, 566], hipR: [11, 566], neck: [0, 458], waist: [0, 570] } as const;
/** Размеры заготовок лент (в собственных координатах клетки). */
export const ARM_LEN = 9 + BONE.arm1 + BONE.arm2 + 10;
export const LEG_LEN = 9 + BONE.leg1 + BONE.leg2 + 9;

export function personParts(o: Look, seat = false): PersonParts {
  const w = o.build === 'round' ? 1.12 : o.build === 'slim' ? 0.93 : 1;
  const sk = o.skin;
  const skd = dk(sk, 0.2);
  const ou = outfit(o.outfit, o.cloth, w);
  const hr = hairLayers(o.hair, o.hairCol, o.hat ?? o.cloth);
  const slv = o.outfit === 'suit' ? dk(o.cloth, 0.1) : o.cloth;
  const pants = o.pants ?? '#4F4A5A';
  const shoe = o.shoe ?? '#2F211B';
  const item = seat ? 'none' : o.item;
  const back = o.acc === 'backpack' ? `<rect x="-46" y="468" width="38" height="78" rx="14" fill="${dk(o.cloth, 0.12)}"/><rect x="-42" y="520" width="20" height="18" rx="6" fill="${lt(o.cloth, 0.15)}" stroke-width="2.5"/>` : '';
  /* то, что человек держит в руке: рисуется вокруг кисти (0,0) */
  const caseL =
    item === 'briefcase' ? `<rect x="-17" y="8" width="34" height="26" rx="5" fill="#C98B5A"/><path d="M-8 8q8 -13 16 0" fill="none" stroke-width="2.5"/><path d="M-17 20h34" stroke-width="2" fill="none"/>`
    : item === 'tote' ? `<rect x="-15" y="8" width="30" height="28" rx="6" fill="#E7D3AE"/><path d="M-9 8q9 -15 18 0" fill="none" stroke-width="2.5"/><circle cx="0" cy="22" r="5" fill="${lt(o.cloth, 0.1)}" stroke-width="2"/>`
    : '';
  const phoneR = item === 'phone' ? `<rect x="-7" y="-17" width="13" height="22" rx="3.5" fill="#2F2B3A"/><rect x="-5" y="-14" width="9" height="14" rx="2" fill="#9FC3C7" stroke="none"/>` : '';
  const hand = (extra: string) => `${extra}<circle cx="0" cy="0" r="8.5" fill="${sk}"/>`;
  const dark = o.skin === SKIN[4] || o.skin === SKIN[3];
  const cheeks = `<ellipse cx="-19" cy="446" rx="5.5" ry="3.2" fill="#E3806C" fill-opacity="${dark ? 0.35 : 0.6}" stroke="none"/><ellipse cx="19" cy="446" rx="5.5" ry="3.2" fill="#E3806C" fill-opacity="${dark ? 0.35 : 0.6}" stroke="none"/>`;
  const stache = o.facial !== 'none' ? MOUSTACHE_PATH(o.hairCol) : '';
  const beard = o.facial === 'beard' ? BEARD_PATH(o.hairCol) : '';
  const eye = (cx: number, hl: number, g: Gaze) => `<g><ellipse cx="${cx}" cy="437" rx="4.7" ry="5" fill="#FFFDF6" stroke-width="1.8"/><circle cx="${cx + 0.4 + g.x}" cy="${438 + g.y}" r="2.8" fill="#2F211B" stroke="none"/><circle cx="${hl + g.x}" cy="${436.6 + g.y}" r="1" fill="#fff" stroke="none"/></g>`;
  const glasses = o.acc === 'glasses' ? `<circle cx="-11" cy="437" r="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><circle cx="11" cy="437" r="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><path d="M-3 436H3M-19 435L-28 432M19 435L28 432" stroke-width="2.5" fill="none"/>` : '';
  const scarf = o.acc === 'scarf' ? `<path d="M-24 464Q0 480 24 464L26 478Q0 494 -26 478Z" fill="${lt('#C4694A', 0.05)}" stroke-width="2.8"/><path d="M14 478L20 512L30 508L24 476Z" fill="${lt('#C4694A', 0.05)}" stroke-width="2.8"/><path d="M-12 474v8M0 478v8M12 476v8" stroke="${lt('#C4694A', 0.45)}" stroke-width="2" fill="none"/>` : '';
  const band = o.acc === 'headphones' ? `<path d="M-27 428Q-28 396 0 394Q28 396 27 428" fill="none" stroke-width="8"/><path d="M-27 428Q-28 396 0 394Q28 396 27 428" fill="none" stroke="#4A6B72" stroke-width="4"/>` : '';
  const cups = o.acc === 'headphones' ? `<rect x="-35" y="422" width="12" height="22" rx="6" fill="#4A6B72"/><rect x="23" y="422" width="12" height="22" rx="6" fill="#4A6B72"/>` : '';
  const ears = `<circle cx="-27" cy="438" r="5.5" fill="${sk}"/><circle cx="27" cy="438" r="5.5" fill="${sk}"/>`;
  /* у бородача рот лежит внутри бороды: узкая светлая полоска губ вдоль рта, без контура */
  const lips = (mood: MoodId): string => (beard && lipsWidth(mood) > 0 ? `<path d="${MOOD[mood].m}" fill="none" stroke="${sk}" stroke-width="${lipsWidth(mood)}" stroke-linecap="round"/>` : '');
  const halfEye = (cx: number, g: Gaze): string => `<g><ellipse cx="${cx}" cy="438" rx="4.7" ry="2.4" fill="#FFFDF6" stroke-width="1.8"/><ellipse cx="${cx + 0.4 + g.x}" cy="438.3" rx="2.5" ry="1.8" fill="#2F211B" stroke="none"/><path d="M${cx - 5.2} 436.6q5.2 -3 10.4 0" fill="none" stroke-width="2"/></g>`;
  const headLayers = (mood: MoodId, blink: boolean | 'half', gaze: Gaze): Record<HeadLayer, string> => {
    const m = MOOD[mood];
    const brows = browSpec(mood, o.acc === 'glasses', o.hairCol, o.hair === 'beanie');
    const eyes = m.h || blink === true ? `<path d="M-15 438q5 -7 10 0M5 438q5 -7 10 0" fill="none" stroke-width="2.6"/>` : blink === 'half' ? `${halfEye(-10, gaze)}${halfEye(10, gaze)}` : `${eye(-10, -8.5, gaze)}${eye(10, 11.5, gaze)}`;
    return {
      ears,
      face: `<circle cx="0" cy="432" r="28" fill="${sk}"/><path d="M14 408Q34 424 20 452Q28 432 14 408Z" fill="${skd}" fill-opacity=".35" stroke="none"/><path d="M-26 424Q-24 414 -18 410" fill="none" stroke="${lt(sk, 0.5)}" stroke-width="3" stroke-opacity=".7"/>`,
      beard,
      features: `${eyes}${brows ? `<path d="${brows.d}" fill="none" stroke="${brows.color}" stroke-width="${brows.w}" stroke-linecap="round"/>` : `<path d="${m.b}" fill="none" stroke-width="2.5"/>`}${lips(mood)}<path d="${m.m}" fill="${m.f ?? 'none'}" stroke-width="2.5"/>${beard ? '' : cheeks}${stache}`,
      glasses,
      hair: hr.f,
      band,
      bun: hr.o,
      cups
    };
  };
  const head = (mood: MoodId, blink: boolean | 'half' = false, gaze: Gaze = { x: 0, y: 0 }): string => {
    const L = headLayers(mood, blink, gaze);
    return `<g transform="translate(0 458) scale(1.1) translate(0 -458)">${HEAD_LAYER_ORDER.map((n) => L[n]).join('')}</g>`;
  };
  /** Слои, которые реально нарисованы у этого человека, снизу вверх; hairBack — отдельный спрайт под головой. */
  const neutralLayers = headLayers('neutral', false, { x: 0, y: 0 });
  const layerNames = [...(hr.b ? ['hairBack'] : []), ...HEAD_LAYER_ORDER.filter((n) => neutralLayers[n] !== '')];
  const rope = (len: number, c: string): string => arm(`M9 0H${len - 9}`, c, 11);
  const cells: PartCell[] = [
    { id: 'armRope', box: { x: 0, y: -12, w: ARM_LEN, h: 24 }, svg: rope(ARM_LEN, slv) },
    { id: 'legRope', box: { x: 0, y: -12, w: LEG_LEN, h: 24 }, svg: rope(LEG_LEN, pants) },
    { id: 'shoe', box: { x: -18, y: -11, w: 36, h: 22 }, svg: `<ellipse cx="0" cy="0" rx="14" ry="6.5" fill="${shoe}"/><path d="M-6 -3Q0 -5 6 -3" stroke="${lt(shoe, 0.35)}" stroke-width="2" fill="none" stroke-opacity=".7"/>` },
    { id: 'handL', box: { x: -24, y: -16, w: 48, h: 56 }, svg: hand(caseL) },
    { id: 'handR', box: { x: -24, y: -22, w: 48, h: 50 }, svg: hand(phoneR) },
    { id: 'torso', box: { x: -54, y: 452, w: 108, h: 150 }, svg: `${back}${ou.back}${ou.torso}${scarf}` }
  ];
  const seatCells: PartCell[] = seat
    ? [{ id: 'knee', box: { x: -17, y: -14, w: 34, h: 28 }, svg: `<ellipse cx="0" cy="0" rx="13.5" ry="10.5" fill="${pants}"/><path d="M-7 -4Q0 -8 7 -4" stroke="${lt(pants, 0.25)}" stroke-width="2" fill="none" stroke-opacity=".6"/>` }, { id: 'shoeSeat', box: { x: -18, y: -13, w: 36, h: 26 }, svg: `<ellipse cx="0" cy="0" rx="14" ry="8.5" fill="${shoe}"/><ellipse cx="0" cy="2.5" rx="8.5" ry="4.6" fill="${lt(shoe, 0.22)}" stroke-width="2"/>` }]
    : [];
  const hb = hairBackKind(o.hair);
  if (hb) cells.push({ id: 'hairBack', box: { x: -48, y: 392, w: 114, h: 110 }, svg: `<g transform="translate(0 458) scale(1.1) translate(0 -458)">${hr.b}</g>` });
  return { cells, seatCells, head, hairBack: hb, layers: layerNames, skin: sk };
}

/** Оборачивает часть в самостоятельный SVG: общая рамка для всех частей фигуры.
 *  Дрожание линий (как у остальной графики) считается в координатах фигуры, поэтому швов между частями нет. */
/**
 * Рост гостей относительно исходного рисунка (ноги остаются на полу, точка 0,600 фигуры).
 * Исходно верх стойки (y 399) был на уровне головы: гость 205 px от пола (y 600) до макушки.
 * 1,6 → 328 px, верх стойки на 61% роста (талия/нижние рёбра).
 */
export const GUEST_K = 1.6;
/** Бариста стоит дальше от зрителя, чем гость, поэтому ниже гостя: 1,3 → макушка на ~150 px над краем стойки (у гостя ~200). Масштаб от линии края стойки (y 399). */
export const BARISTA_K = 1.3;
export const BARISTA_PIVOT = { x: 865, y: 399 } as const;
/** Точка на полу у столика: от неё масштабируется весь столик с гостем. */
export const SEAT_PIVOT = { x: 230, y: 652 } as const;
export const PERSON_BOX = { x: -80, y: 356, w: 160, h: 264 } as const;
export const HEAD_BOX = { x: -46, y: 362, w: 92, h: 114 } as const;
export interface Box { x: number; y: number; w: number; h: number }
export function wobbleDef(b: Box, id = 'wbx'): string {
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.04" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter>`;
}
export function wrapPart(inner: string, b: Box = PERSON_BOX): string {
  return `<defs>${wobbleDef(b)}</defs><g filter="url(#wbx)"><g ${S}>${inner}</g></g>`;
}


/** Бариста за стойкой: координаты сцены, голова в (865,322), плечо левой руки (834,376). */
export type BaristaFace = 'smile' | 'blink' | 'joy' | 'focus' | 'tired';
export interface BaristaParts { body: string; arm2: string; arm: string; head: (f: BaristaFace) => string; heldCup: string }
export function baristaParts(): BaristaParts {
  const sk = BARISTA_LOOK.skin;
  const skd = dk(sk, 0.2);
  const hr = BARISTA_LOOK.hairCol;
  const sw = BARISTA_LOOK.cloth;
  return {
    body: `<path d="M824 414Q824 370 865 364Q906 370 906 414Z" fill="${sw}"/>
<path d="M906 414Q906 374 874 365Q894 382 890 414Z" fill="#6E8262" fill-opacity=".45" stroke="none"/>
<rect x="853" y="342" width="24" height="28" rx="9" fill="${sk}"/>
<path d="M842 414L847 382Q865 374 883 382L888 414Z" fill="#8A5240"/>
<path d="M848 380L852 364M882 380L878 364" fill="none" stroke-width="2.5"/>
<rect x="855" y="396" width="20" height="14" rx="3.5" fill="#6A3E2E" stroke-width="2.5"/>`,
    arm2: `${arm('M894 379Q918 384 938 386', sw, 12)}<circle cx="942" cy="386" r="8.5" fill="${sk}"/>`,
    arm: `${arm('M836 379Q818 381 808 386', sw, 12)}<circle cx="805" cy="386" r="8.5" fill="${sk}"/>`,
    heldCup: '',
    head: (f: BaristaFace) => {
      const eye = (cx: number, hl: number) => f === 'tired'
        ? `<path d="M${cx - 5} 328q5 4 10 0" fill="none" stroke-width="2.4"/><path d="M${cx - 5} 327q5 -4 10 0" fill="#FFFDF6" stroke-width="1.8"/><circle cx="${cx + 0.4}" cy="328" r="2.6" fill="#2F211B" stroke="none" clip-path="none"/><path d="M${cx - 5.5} 326.5q5.5 -4.5 11 0" fill="${sk}" stroke-width="2"/>`
        : f === 'blink' || f === 'joy'
        ? `<path d="M${cx - 5} 328q5 -6 10 0" fill="none" stroke-width="2.4"/>`
        : `<g><ellipse cx="${cx}" cy="327" rx="4.8" ry="${f === 'focus' ? 4.2 : 5.2}" fill="#FFFDF6" stroke-width="1.8"/><circle cx="${cx + 0.4}" cy="328" r="3" fill="#2F211B" stroke="none"/><circle cx="${hl}" cy="326.6" r="1" fill="#fff" stroke="none"/></g>`;
      const mouth = f === 'tired' ? '<path d="M857 339q4 -3 8 0t8 0" stroke-width="2.4" fill="none"/>' : f === 'joy' ? '<path d="M855 335q10 13 20 0Z" fill="#8A3F34" stroke-width="2.4"/>' : f === 'focus' ? '<path d="M860 339q5 3 10 0" stroke-width="2.6" fill="none"/>' : '<path d="M857 337q8 9 16 0" stroke-width="2.6" fill="none"/>';
      const brows = f === 'tired' ? '<path d="M848 321L860 317M870 317L882 321" stroke-width="2.2" fill="none"/>' : f === 'focus' ? '<path d="M848 320L860 322M870 322L882 320" stroke-width="2.2" fill="none"/>' : '<path d="M848 319q6 -4 12 -1M870 318q6 -3 12 1" stroke-width="2.2" fill="none"/>';
      return `<circle cx="865" cy="290" r="13" fill="${hr}"/><path d="M859 288q6 -5 12 0" fill="none" stroke="#6A5348" stroke-width="2.5"/>
<circle cx="835" cy="326" r="5.5" fill="${sk}"/><circle cx="895" cy="326" r="5.5" fill="${sk}"/>
<circle cx="865" cy="322" r="29" fill="${sk}"/>
<path d="M880 296Q898 314 886 346Q892 322 880 296Z" fill="${skd}" fill-opacity=".35" stroke="none"/>
<path d="M834 318Q832 290 865 289Q898 290 896 318Q880 302 865 304Q850 302 834 318Z" fill="${hr}"/>
<path d="M835 312Q865 299 895 312" stroke="#C4694A" stroke-width="7" fill="none"/>
${eye(854, 855.5)}${eye(876, 877.5)}${brows}${mouth}
${f === 'tired' ? '<path d="M892 308q-5 7 0 10q5 -3 0 -10Z" fill="#A9D6E6" stroke-width="1.8"/>' : ''}<ellipse cx="845" cy="336" rx="5.5" ry="3.2" fill="#E3806C" fill-opacity=".6" stroke="none"/><ellipse cx="885" cy="336" rx="5.5" ry="3.2" fill="#E3806C" fill-opacity=".6" stroke="none"/>`;
    }
  };
}

/** Обёртка клетки атласа: свой фильтр дрожания линий на рамку клетки. */
export function wrapCell(inner: string, b: Box, id: string): string {
  return `<defs>${wobbleDef(b, id)}</defs><g filter="url(#${id})"><g ${S}>${inner}</g></g>`;
}

/** Клетки для рук баристы: плечо и предплечье по 24, толщина 12 (+контур). */
export const BARISTA_ARM_LEN = 9 + 48 + 10;
export function baristaCells(): PartCell[] {
  return [
    { id: 'bArm', box: { x: 0, y: -12, w: BARISTA_ARM_LEN, h: 24 }, svg: arm(`M9 0H${BARISTA_ARM_LEN - 10}`, BARISTA_LOOK.cloth, 12) },
    { id: 'bHand', box: { x: -12, y: -12, w: 24, h: 24 }, svg: `<circle cx="0" cy="0" r="8.5" fill="${BARISTA_LOOK.skin}"/>` }
  ];
}
