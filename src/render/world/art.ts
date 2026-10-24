/**
 * Рисованные персонажи: гости собираются из частей, бариста и мимика.
 * Здесь только SVG-разметка (векторный исходник); в игру части попадают как текстуры (см. rig.ts).
 */
import { deltaE, labOf } from '../../game/drinkModel';
import { BARISTA_LOOK, BLUSH_MIN, BLUSH_MOOD, DEFAULT_FACE, SKIN, hasBeard, type Age, type Facial, type FaceSpec, type HairStyle, type Look } from '../../game/look';
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
export interface HairLayers { b: string; f: string; o: string; /** задний слой для сидящего: концы у плеч выше линии крышки (fig y 480), без среза маской */ bs?: string }
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
      const bs = `<path d="M-32 432Q-40 402 0 397Q40 402 32 432L36 468Q37 477 31 476Q27 478 24 472Q20 466 14 464Q8 462 0 462Q-8 462 -14 464Q-20 466 -24 472Q-27 478 -31 476Q-37 477 -36 468Z" fill="${h}"/>`;
      return { b, bs, f, o: '' };
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
      const seatBeads = [[-33, 440], [-36, 451], [-33, 462]].map((p) => `<ellipse cx="${p[0]}" cy="${p[1]}" rx="6.5" ry="7.5" fill="${h}"/>`).join('');
      const bs = `${seatBeads}<rect x="-40" y="466" width="11" height="5" rx="2" fill="${tieOf(h)}" stroke-width="2"/><ellipse cx="-34" cy="473" rx="4.5" ry="4" fill="${h}"/>`;
      return { bs, b: `${beads}<rect x="-40" y="486" width="11" height="5" rx="2" fill="${tieOf(h)}" stroke-width="2"/><ellipse cx="-34" cy="492" rx="4.5" ry="4" fill="${h}"/>`, f: top, o: '' };
    }
    case 'wavy':
      /* волны до плеч: объём ниже ушей, S-образный контур; впереди волнистая чёлка (волны разной величины) */
      return {
        b: `<path d="M-31 432Q-42 404 0 397Q42 404 31 432Q42 450 36 462Q44 474 34 482Q26 478 20 474Q14 466 8 462Q0 460 -8 462Q-14 466 -20 474Q-26 478 -34 482Q-44 474 -36 462Q-42 450 -31 432Z" fill="${h}"/>`,
        bs: `<path d="M-31 432Q-42 404 0 397Q42 404 31 432Q42 450 36 462Q43 472 34 477Q27 476 22 472Q15 466 8 463Q0 461 -8 463Q-15 466 -22 472Q-27 476 -34 477Q-43 472 -36 462Q-42 450 -31 432Z" fill="${h}"/>`,
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
/** Толщина бровей neutral и happy по лицу (тоньше прежних 2,5 у thin и normal) и бровей остальных настроений. */
export const BROW_WIDTH = { thin: 1.5, normal: 2, thick: 3 } as const;
export const OTHER_BROW_W = { thin: 2, normal: 2.5, thick: 3.2 } as const;
export const BROW_W = BROW_WIDTH.normal;
export function browSpec(mood: MoodId, glasses: boolean, hairCol: string, beanie: boolean, brow: FaceSpec['brow'] = 'normal'): BrowSpec | null {
  if ((mood !== 'neutral' && mood !== 'happy') || beanie) return null;
  const w = BROW_WIDTH[brow];
  /* с очками низ брови не ниже 427,2 (оправа начинается с 427,75); без очков линия на 428,5 */
  const y = glasses ? 427.2 - w / 2 : 428.5;
  const color = dk(hairCol, 0.15);
  if (mood === 'neutral') return { d: `M-14.5 ${y}h9M5.5 ${y}h9`, color, w };
  /* дуга: концы на линии neutral, середина на 1,5 выше */
  return { d: `M-15 ${y}q5 -3 10 0M5 ${y}q5 -3 10 0`, color, w };
}

/** Рты настроений (для проверки бороды). Борода идёт вокруг рта и никогда его не закрывает. */
export const MOUTH_PATHS: Readonly<Record<MoodId, string>> = { neutral: MOOD.neutral.m, happy: MOOD.happy.m, joy: MOOD.joy.m, wait: MOOD.wait.m, annoyed: MOOD.annoyed.m, angry: MOOD.angry.m };
export const BEARD_D = 'M-26.5 434Q-28 451 -21 461Q-12 472 0 472Q12 472 21 461Q28 451 26.5 434Q27 445.5 14 445.5Q0 439 -14 445.5Q-27 445.5 -26.5 434Z';
export const BEARD_PATH = (c: string): string => `<path d="${BEARD_D}" fill="${c}"/>`;
/**
 * Короткая борода (32-Е): верх как у полной (рот внутри с тем же запасом), низ плотно по челюсти (до 2 px за контур лица), край неровный, контур тонкий;
 * высота от верха (y 442,3) до низа (461,7) 19,4 ≤ 0,36 высоты лица.
 */
export const BEARD_SHORT_D = 'M-26.5 434Q-27.6 446 -21 452.6Q-16.2 457.4 -11 459.6Q-9 460.9 -7 460.6Q-3.4 462.2 0 461.7Q4 461.4 7.6 460.9Q9 459.8 12 459.2Q15.4 457.6 21.4 452.2Q27.8 446 26.5 434Q27 445.5 14 445.5Q0 439 -14 445.5Q-27 445.5 -26.5 434Z';
export const BEARD_SHORT_PATH = (c: string): string => `<path d="${BEARD_SHORT_D}" fill="${c}" stroke-width="1.8"/>`;
/**
 * Борода при повороте головы (32-Ж): внешний край остаётся на контуре лица, а середина (рот и вырез под ним) сдвигается на половину сдвига черт.
 * Так борода тянется по контуру на обе стороны (на дальней доходит до уха и бакенбард, просвета кожи нет), а рот остаётся внутри.
 * x' = x + 0,5·fx·max(0, 1 − (x/23)²): за |x| ≥ 23 (бакенбарды, челюсть у ушей) борода не двигается.
 */
export const BEARD_TURN_K = 0.5;
export const beardWarpX = (x: number, fx: number): number => x + BEARD_TURN_K * fx * Math.max(0, 1 - (x / 23) ** 2);
/** Преобразует числа абсолютного пути (M, Q, Z): пары «x y» заменяются результатом f. */
export const mapPath = (d: string, f: (x: number, y: number) => [number, number]): string =>
  d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_m, x: string, y: string) => {
    const [a, b] = f(Number(x), Number(y));
    return `${+a.toFixed(2)} ${+b.toFixed(2)}`;
  });
const warped = (d: string, fx: number): string => (fx === 0 ? d : mapPath(d, (x, y) => [beardWarpX(x, fx), y]));
type XY = [number, number];
/** Точки абсолютного пути (M, Q, Z): кривые по 12 шагов. */
export function samplePath(d: string): XY[] {
  const t = d.match(/[MQZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const pts: XY[] = [];
  let cur: XY = [0, 0];
  let cmd = '';
  for (let i = 0; i < t.length; ) {
    const tok = t[i] as string;
    if (/[MQZ]/.test(tok)) { cmd = tok; i++; continue; }
    if (cmd === 'M') { cur = [Number(t[i]), Number(t[i + 1])]; i += 2; pts.push(cur); cmd = 'L'; }
    else if (cmd === 'Q') {
      const c: XY = [Number(t[i]), Number(t[i + 1])];
      const e: XY = [Number(t[i + 2]), Number(t[i + 3])];
      i += 4;
      for (let k = 1; k <= 12; k++) { const u = k / 12; pts.push([(1 - u) ** 2 * cur[0] + 2 * u * (1 - u) * c[0] + u * u * e[0], (1 - u) ** 2 * cur[1] + 2 * u * (1 - u) * c[1] + u * u * e[1]]); }
      cur = e;
    } else i++;
  }
  return pts;
}
const inPolyXY = (poly: XY[], x: number, y: number): boolean => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as XY;
    const b = poly[j] as XY;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) r = !r;
  }
  return r;
};
const distToPoly = (poly: XY[], x: number, y: number): number => {
  let m = 1e9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as XY;
    const b = poly[(i + 1) % poly.length] as XY;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    m = Math.min(m, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return m;
};
/** Точки линий с относительными q и h (рты, складки): раскрываются в ломаную. */
function relPoints(d: string): XY[] {
  const pts: XY[] = [];
  for (const part of d.split(/(?=M)/).filter(Boolean)) {
    const m = /^M(-?[\d.]+) (-?[\d.]+)(?:q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)|h(-?[\d.]+))?/.exec(part);
    if (!m) continue;
    const x0 = Number(m[1]);
    const y0 = Number(m[2]);
    pts.push([x0, y0]);
    if (m[3] !== undefined) {
      const cx = x0 + Number(m[3]);
      const cy = y0 + Number(m[4]);
      const ex = x0 + Number(m[5]);
      const ey = y0 + Number(m[6]);
      for (let k = 1; k <= 20; k++) { const u = k / 20; pts.push([(1 - u) ** 2 * x0 + 2 * u * (1 - u) * cx + u * u * ex, (1 - u) ** 2 * y0 + 2 * u * (1 - u) * cy + u * u * ey]); }
    } else if (m[7] !== undefined) {
      for (let k = 1; k <= 20; k++) pts.push([x0 + (Number(m[7]) * k) / 20, y0]);
    }
  }
  return pts;
}
/**
 * Щетина (32-Ж): зернистая полупрозрачная фактура (точки и короткие штрихи, прозрачность 0,25–0,4) без заливки и контура.
 * Зона — та же, что у короткой бороды (щёки до висков, челюсть, подбородок) плюс полоска над верхней губой; плотность плавно растёт от скул (0,3) к челюсти и подбородку (1).
 * Область рта и складок (расстояние до линий рта, носогубных складок и мешков не меньше STUBBLE_CLEAR) и нос остаются чистыми.
 * Раскладка детерминирована (сетка с дрожанием и матрицей Байера, свой генератор чисел).
 */
export const STUBBLE_GRID = 1.65;
export const STUBBLE_ALPHA_MIN = 0.25;
export const STUBBLE_ALPHA_MAX = 0.4;
export const STUBBLE_CLEAR = 1.75;
/** Плотность падает только у края зоны: на расстоянии STUBBLE_FADE и дальше от края зерно стоит в каждой клетке сетки. */
export const STUBBLE_FADE = 2;
/** Линии, возле которых щетина не рисуется: рты всех настроений. */
export const MOUTH_KEEP_OUT = 'M-6 450q6 3 12 0M-8 447q8 9 16 0M-10 446q10 14 20 0M-5 451h10M-7 454q7 -5 14 0M-8 456q8 -8 16 0';
/** Складки пожилых (носогубные, угловые, мешки под глазами) и нос. */
export const FOLD_KEEP_OUT = [-1, 1].map((sg) => `M${5.6 * sg} 443.9q${5.2 * sg} 1.3 ${6.6 * sg} 8.7M${9.6 * sg} 449.8q${0.8 * sg} 1.8 ${0.4 * sg} 3.6M${5.2 * sg} 443.8q${5.8 * sg} 2.3 ${11.6 * sg} 0`).join('') + 'M-2.6 441.9q2.6 2.2 5.2 0';
export interface StubbleDot { x: number; y: number; r: number; a: number; dx: number; dy: number }
const stubbleCache = new Map<string, StubbleDot[]>();
/** Зерно щетины для конкретного человека: seed считается из Look (stubbleSeed), чисел у Math.random не берёт. */
export const stubbleSeed = (o: Pick<Look, 'skin' | 'hairCol' | 'hair' | 'outfit' | 'cloth' | 'face'>): number => {
  let h = 2166136261;
  for (const ch of `${o.skin}|${o.hairCol}|${o.hair}|${o.outfit}|${o.cloth}|${o.face?.shape ?? ''}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
/**
 * Зерно щетины в координатах анфаса (dx, dy ненулевые — короткий штрих, иначе точка радиуса r).
 * Сетка со сдвигом рядов на полклетки (шестиугольная) и дрожанием ±0,3: нет ни кучек, ни пустот; плотность падает плавно только у края зоны (inclusion по расстоянию до края).
 */
export function stubbleDots(seed = 0, mood: MoodId = 'neutral', senior = false): StubbleDot[] {
  const key = `${seed}|${mood}|${senior ? 1 : 0}`;
  const cached = stubbleCache.get(key);
  if (cached) return cached;
  const zone = samplePath(BEARD_SHORT_D);
  const round = Array.from({ length: 72 }, (_, k): XY => [28 * Math.cos((k / 72) * 6.2832), 432 + 28 * Math.sin((k / 72) * 6.2832)]);
  const oval = Array.from({ length: 72 }, (_, k): XY => [FACE_DIM.oval.rx * Math.cos((k / 72) * 6.2832), 432 + FACE_DIM.oval.ry * Math.sin((k / 72) * 6.2832)]);
  const faces = [round, oval, samplePath(FACE_SQUARE_D)];
  /* чисто только вокруг рта текущего настроения и (у пожилых) складок; сетка и числа те же у всех настроений, поэтому зерно вдали от рта не меняется */
  const keep = [...relPoints(MOOD[mood].m), ...(senior ? relPoints(FOLD_KEEP_OUT) : relPoints('M-2.6 441.9q2.6 2.2 5.2 0'))];
  let st = (20240732 ^ seed) | 0;
  const rnd = (): number => {
    st = (st + 0x6d2b79f5) | 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: StubbleDot[] = [];
  const G = STUBBLE_GRID;
  const rowH = G * 0.866;
  const ox = rnd() * G;
  const oy = rnd() * rowH;
  for (let iy = 0; iy < 28; iy++) for (let ix = -20; ix <= 20; ix++) {
    const jx = (rnd() - 0.5) * 0.4;
    const jy = (rnd() - 0.5) * 0.4;
    const x = ix * G + jx + (iy % 2) * G * 0.5 + ox - G / 2;
    const y = 434 + iy * rowH + jy + oy;
    const r0 = 0.44 + rnd() * 0.14;
    const kind = rnd();
    const alpha = STUBBLE_ALPHA_MIN + rnd() * (STUBBLE_ALPHA_MAX - STUBBLE_ALPHA_MIN);
    const ang = rnd() * 3.1416;
    const len = 1.1 + rnd() * 0.5;
    const pick = rnd();
    /* зона: короткая борода плюс полоска над губой */
    const inZone = inPolyXY(zone, x, y) || (Math.abs(x) < 11 && y > 441.8 && y < 446.4);
    if (!inZone) continue;
    if (Math.abs(x) < 4.4 && y < 444.6) continue; /* нос */
    /* плавное убывание только у края зоны (к скулам и к шее) */
    const e = inPolyXY(zone, x, y) ? Math.min(1, distToPoly(zone.map(([zx, zy]): XY => [zx, zy]), x, y) / STUBBLE_FADE) : 1;
    if (pick >= 0.4 + 0.6 * e * e * (3 - 2 * e)) continue;
    const m = r0 + 0.35;
    /* зерно остаётся внутри контура и после сдвига при повороте (fx = ±TURN_SHIFT) */
    if (!faces.every((f) => [x, beardWarpX(x, TURN_SHIFT), beardWarpX(x, -TURN_SHIFT)].every((xx) => inPolyXY(f, xx, y) && distToPoly(f, xx, y) > m))) continue;
    if (keep.some((q) => Math.hypot(q[0] - x, q[1] - y) < STUBBLE_CLEAR + r0)) continue;
    const stroke = kind < 0.4;
    out.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +r0.toFixed(2), a: +alpha.toFixed(2), dx: stroke ? +(Math.cos(ang) * len).toFixed(2) : 0, dy: stroke ? +(Math.sin(ang) * len * 0.8).toFixed(2) : 0 });
  }
  stubbleCache.set(key, out);
  return out;
}
/** Цвет щетины: у седых серый, у остальных цвет волос. */
export const stubbleColor = (hairCol: string, age: Age): string => (age === 'senior' ? '#8F8A86' : hairCol);
export const STUBBLE_PATH = (c: string, fx = 0, seed = 0, mood: MoodId = 'neutral', senior = false): string => {
  const dots = stubbleDots(seed, mood, senior);
  const wx = (x: number): number => (fx === 0 ? x : +beardWarpX(x, fx).toFixed(2));
  const circles = dots.filter((d) => !d.dx && !d.dy).map((d) => `<circle cx="${wx(d.x)}" cy="${d.y}" r="${d.r}" fill-opacity="${d.a}"/>`).join('');
  const strokes = dots.filter((d) => d.dx || d.dy).map((d) => `<path d="M${wx(d.x - d.dx / 2)} ${+(d.y - d.dy / 2).toFixed(2)}l${d.dx} ${d.dy}" fill="none" stroke="${c}" stroke-opacity="${d.a}" stroke-width="0.9" stroke-linecap="round"/>`).join('');
  return `<g fill="${c}" stroke="none">${circles}</g>${strokes}`;
};
/** Борода отличается от волос по светлоте не меньше чем на BEARD_DE (ΔE76), тон тот же: чуть темнее (у очень тёмных волос светлее), чтобы борода и причёска читались как две детали. */
export const BEARD_DE = 7;
const beardColors = new Map<string, string>();
export function beardColor(hair: string): string {
  const hit = beardColors.get(hair);
  if (hit) return hit;
  const target = labOf(hair)[0] > 30 ? '#000000' : '#FFFFFF';
  let c = mix(hair, target, 0.6);
  for (let t = 0.04; t <= 0.6; t += 0.02) {
    const m = mix(hair, target, t);
    if (deltaE(m, hair) >= BEARD_DE) { c = m; break; }
  }
  beardColors.set(hair, c);
  return c;
}
/** Линия-разделитель борода / волосы: верхний край щеки от виска (контур лица) до скулы, обе стороны; толщина как у линий черт лица. */
export const SEAM_D = 'M-26.5 434Q-26.775 440.325 -22.97 443.2M26.5 434Q26.775 440.325 22.97 443.2';
export const SEAM_W = 2.5;
/** У квадратного лица борода шире на 6 % (контур лица у висков 28,8–29,6, у круглого 28): иначе между бородой и контуром видна кожа. */
export const SQUARE_BEARD_K = 1.06;
/** Контур бороды (полной или короткой) для формы лица и сдвига черт fx (0 — анфас). */
export const beardD = (kind: 'beard' | 'short', shape: FaceSpec['shape'], fx = 0): string => {
  const base = kind === 'beard' ? BEARD_D : BEARD_SHORT_D;
  return warped(shape === 'square' ? mapPath(base, (x, y) => [x * SQUARE_BEARD_K, y]) : base, fx);
};
/** Разделитель с учётом формы лица и сдвига при повороте (те же преобразования, что у бороды). */
export const seamSvg = (shape: FaceSpec['shape'], fx = 0): string => `<path d="${warped(shape === 'square' ? mapPath(SEAM_D, (x, y) => [x * SQUARE_BEARD_K, y]) : SEAM_D, fx)}" fill="none" stroke-width="${SEAM_W}" data-seam="1"/>`;
/** Растительность по виду: слой beard; fx — сдвиг черт при повороте головы (0 — анфас). */
export const beardLayer = (facial: Facial, hairCol: string, age: Age, fx = 0, shape: FaceSpec['shape'] = 'round', seed = 0, mood: MoodId = 'neutral'): string =>
  facial === 'beard' ? `<path d="${beardD('beard', shape, fx)}" fill="${beardColor(hairCol)}"/>${seamSvg(shape, fx)}` : facial === 'short' ? `<path d="${beardD('short', shape, fx)}" fill="${beardColor(hairCol)}" stroke-width="2.5"/>${seamSvg(shape, fx)}` : facial === 'stubble' ? STUBBLE_PATH(stubbleColor(hairCol, age), fx, seed, mood, age === 'senior') : '';
/** Усы рисуются у усатых, с короткой и полной бородой (срастаются с бородой), у щетины нет. */
export const hasMustache = (f: Facial): boolean => f === 'mustache' || f === 'short' || f === 'beard';
/** Ширина рта по настроению и светлая полоска губ: не толще 40 % ширины рта, без своего контура; у открытого рта (joy) губ нет. */
export const MOUTH_WIDTH: Readonly<Record<MoodId, number>> = { neutral: 12, happy: 16, joy: 20, wait: 10, annoyed: 14, angry: 16 };
export const LIPS_SHARE = 0.4;
export const lipsWidth = (m: MoodId): number => (m === 'joy' ? 0 : Math.floor(MOUTH_WIDTH[m] * LIPS_SHARE * 10) / 10);
export const MOUSTACHE_D = 'M-11 446Q-5 440 0 444Q5 440 11 446Q5 451 0 447Q-5 451 -11 446Z';
export const MOUSTACHE_PATH = (c: string): string => `<path d="${MOUSTACHE_D}" fill="${c}" stroke-width="2"/>`;
export const MOODS_FOR_TEST: readonly MoodId[] = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];

/** Порядок слоёв головы снизу вверх (docs/design/people.md, таблица); hairBack — отдельный спрайт под головой. */
export const HEAD_LAYER_ORDER = ['neck', 'ears', 'face', 'beard', 'features', 'glasses', 'hair', 'band', 'bun', 'cups'] as const;
export type HeadLayer = (typeof HEAD_LAYER_ORDER)[number];

/**
 * Силуэты нарядов (32-Е). Мужской торс прямой: плечи ±30·w на y 496, низ ±29·w (отношение плечи / низ около 1,0, не меньше 0,95).
 * Женский торс «трапеция»: плечи ±22·w, талия ±17·w на y 526, низ ±34…38·w (отношение 0,6…0,65, не больше 0,8).
 * Верх (шея, воротник на y 458–462) у всех один, поэтому шея и румянец работают как раньше.
 */
export const MALE_BODY = { shoulder: 30, hem: 29 } as const;
export const FEMALE_BODY: Readonly<Record<string, { shoulder: number; hem: number; hemY: number }>> = {
  dress: { shoulder: 22, hem: 36, hemY: 584 },
  cardigan: { shoulder: 22, hem: 36, hemY: 584 },
  blouse: { shoulder: 22, hem: 33, hemY: 580 },
  beltcoat: { shoulder: 22, hem: 38, hemY: 588 },
  sweaterdress: { shoulder: 22, hem: 34, hemY: 582 }
};
/** Высота низа торса мужских нарядов: пальто длиннее. */
/** 32-Ж: подол мужских пальто и куртки выше (до бедра), брюки и ботинки видны; hoodie общий с женщинами и не менялся. */
export const MALE_HEM_Y: Readonly<Record<string, number>> = { hoodie: 572, coat: 558, jacket: 554, suit: 560, vest: 560 };
/** Доля видимой части ног ниже подола (лента ноги от y 557 до щиколотки 592; низ подола на 5 ниже hemY из-за дуги). */
export const legVisibleShare = (hemY: number): number => Math.max(0, Math.min(1, (592 - (hemY + 5)) / 35));
/** Контур мужского торса. */
export function maleOutline(w: number, hemY: number): string {
  const S = MALE_BODY.shoulder * w;
  const H = MALE_BODY.hem * w;
  return `M${-H} ${hemY}L${-H} 538L${-S} 496Q${-S} 468 -12 461Q0 458 12 461Q${S} 468 ${S} 496L${H} 538L${H} ${hemY}Q0 ${hemY + 10} ${-H} ${hemY}Z`;
}
/** Контур женского торса: платье-трапеция с талией. */
export function femaleOutline(kind: string, w: number): string {
  const f = FEMALE_BODY[kind] ?? (FEMALE_BODY['dress'] as { shoulder: number; hem: number; hemY: number });
  const S = f.shoulder * w;
  const W = 17 * w;
  const H = f.hem * w;
  return `M${-H} ${f.hemY}Q${-W - 8 * w} 556 ${-W} 526Q${-W} 506 ${-S} 492Q${-S - 0.5} 468 -12 461Q0 458 12 461Q${S + 0.5} 468 ${S} 492Q${W} 506 ${W} 526Q${W + 8 * w} 556 ${H} ${f.hemY}Q0 ${f.hemY + 10} ${-H} ${f.hemY}Z`;
}

function outfit(kind: string, c: string, w: number): { back: string; torso: string } {
  const cd = dk(c, 0.25);
  const cl = lt(c, 0.3);
  const torso = `M${-30 * w} 572Q${-34 * w} 464 0 458Q${34 * w} 464 ${30 * w} 572Q0 582 ${-30 * w} 572Z`;
  const shadeR = `<path d="M${30 * w} 570Q${34 * w} 466 0 458Q${24 * w} 470 ${20 * w} 574Z" fill="${cd}" fill-opacity=".38" stroke="none"/>`;
  const male = (hemY: number): string => maleOutline(w, hemY);
  const maleShade = (hemY: number): string => `<path d="M${29 * w} ${hemY - 2}L${30 * w} 498Q${30 * w} 470 14 463Q${21 * w} 490 ${21 * w} 540Z" fill="${cd}" fill-opacity=".34" stroke="none"/>`;
  const fem = (k: string): string => femaleOutline(k, w);
  const femShade = (k: string): string => {
    const f = FEMALE_BODY[k] as { shoulder: number; hem: number; hemY: number };
    return `<path d="M${f.hem * w} ${f.hemY - 2}Q${25 * w} 556 ${17 * w} 526Q${17 * w} 506 ${22 * w} 492Q${22 * w} 478 12 463Q${12 * w} 500 ${12 * w} 530Q${14 * w} 556 ${22 * w} ${f.hemY - 2}Z" fill="${cd}" fill-opacity=".3" stroke="none"/>`;
  };
  switch (kind) {
    case 'hoodie': return { back: `<ellipse cx="0" cy="464" rx="26" ry="11" fill="${cd}"/>`, torso: `<path d="${male(572)}" fill="${c}"/>${maleShade(572)}<path d="M${-18 * w} 538Q0 548 ${18 * w} 538L${21 * w} 562Q0 570 ${-21 * w} 562Z" fill="${cd}" stroke-width="2.5"/><path d="M-6 470v18M6 470v18" stroke-width="2.5" fill="none"/>` };
    case 'coat': return { back: '', torso: `<path d="${male(MALE_HEM_Y['coat'] as number)}" fill="${c}"/>${maleShade(MALE_HEM_Y['coat'] as number)}<path d="M-14 460L0 494L14 460Z" fill="#FBF4E8" stroke-width="2.5"/><path d="M-14 460L-7 504M14 460L7 504" fill="none" stroke-width="2.5"/><circle cx="0" cy="518" r="2.6" fill="${INK}" stroke="none"/><circle cx="0" cy="533" r="2.6" fill="${INK}" stroke="none"/><circle cx="0" cy="548" r="2.6" fill="${INK}" stroke="none"/>` };
    case 'sweater': return { back: '', torso: `<path d="${torso}" fill="${c}"/>${shadeR}<path d="M${-29 * w} 520Q0 530 ${29 * w} 520" fill="none" stroke="${cl}" stroke-width="9" stroke-linecap="butt"/><path d="M${-30 * w} 544Q0 554 ${30 * w} 544" fill="none" stroke="${cl}" stroke-width="9" stroke-linecap="butt"/>` };
    case 'jacket': return { back: '', torso: `<path d="${male(MALE_HEM_Y['jacket'] as number)}" fill="${c}"/>${maleShade(MALE_HEM_Y['jacket'] as number)}<path d="M-15 460L-9 474L0 466L9 474L15 460" fill="${cd}" stroke-width="2.5"/><path d="M0 466V556" fill="none" stroke-width="2.5"/><path d="M${-29 * w} 548Q0 558 ${29 * w} 548" fill="none" stroke="${cd}" stroke-width="8" stroke-linecap="butt"/>` };
    case 'vest': {
      /* рубашка с жилетом: белые рукава и ворот, жилет цвета наряда с V-образным вырезом */
      const vest = `M-12 461Q${-26 * w} 468 ${-26 * w} 500L${-25 * w} 554Q0 564 ${25 * w} 554L${26 * w} 500Q${26 * w} 468 12 461L0 496Z`;
      return { back: '', torso: `<path d="${male(MALE_HEM_Y['vest'] as number)}" fill="#FBF4E8"/>${maleShade(MALE_HEM_Y['vest'] as number)}<path d="${vest}" fill="${c}" stroke-width="2.5"/><path d="M-6 506v0M0 520v0M0 538v0" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M-10 460L0 478L10 460" fill="#FBF4E8" stroke-width="2.5"/>` };
    }
    case 'dress': return { back: '', torso: `<path d="${fem('dress')}" fill="${c}"/>${femShade('dress')}<path d="M-11 461Q0 472 11 461" fill="none" stroke-width="2.5"/><path d="M${-17 * w} 526Q0 534 ${17 * w} 526" fill="none" stroke="${cd}" stroke-width="3"/><path d="M${-35 * w} 578Q0 589 ${35 * w} 578" fill="none" stroke="${cl}" stroke-width="6" stroke-linecap="butt"/>` };
    case 'cardigan': {
      /* кардиган поверх платья: платье светлее, кардиган цвета наряда с открытой полосой по центру и пуговицами */
      const inner = `M-9 463L${-15 * w} 526Q${-22 * w} 556 ${-33 * w} 584Q0 593 ${33 * w} 584Q${22 * w} 556 ${15 * w} 526L9 463Q0 470 -9 463Z`;
      return { back: '', torso: `<path d="${fem('cardigan')}" fill="${c}"/>${femShade('cardigan')}<path d="${inner}" fill="${lt(c, 0.6)}" stroke-width="2.5"/><circle cx="${-13 * w}" cy="500" r="2.2" fill="${INK}" stroke="none"/><circle cx="${-14 * w}" cy="528" r="2.2" fill="${INK}" stroke="none"/><circle cx="${-18 * w}" cy="556" r="2.2" fill="${INK}" stroke="none"/>` };
    }
    case 'blouse': {
      /* блузка с юбкой: верх светлый с бантом, юбка цвета наряда */
      const top = `M${-22 * w} 492Q${-22.5 * w} 468 -12 461Q0 458 12 461Q${22.5 * w} 468 ${22 * w} 492Q${17 * w} 506 ${17 * w} 528L${-17 * w} 528Q${-17 * w} 506 ${-22 * w} 492Z`;
      return { back: '', torso: `<path d="${fem('blouse')}" fill="${dk(c, 0.12)}"/>${femShade('blouse')}<path d="${top}" fill="${lt(c, 0.72)}" stroke-width="2.5"/><path d="M-3 466Q-8 472 -3 478L0 472L3 478Q8 472 3 466L0 471Z" fill="${c}" stroke-width="2"/><path d="M${-17 * w} 528H${17 * w}" stroke-width="3" fill="none"/><path d="M${-31 * w} 574Q0 584 ${31 * w} 574" fill="none" stroke="${cd}" stroke-width="5" stroke-linecap="butt"/>` };
    }
    case 'beltcoat': return { back: '', torso: `<path d="${fem('beltcoat')}" fill="${c}"/>${femShade('beltcoat')}<path d="M-12 461L0 498L12 461" fill="${lt(c, 0.35)}" stroke-width="2.5"/><path d="M0 498V588" fill="none" stroke-width="2.5"/><path d="M${-19 * w} 518H${19 * w}L${19.5 * w} 531H${-19.5 * w}Z" fill="${cd}" stroke-width="2.5"/><rect x="-3.5" y="519" width="7" height="11" rx="2" fill="${lt(c, 0.5)}" stroke-width="2"/><circle cx="-6" cy="548" r="2.4" fill="${INK}" stroke="none"/><circle cx="6" cy="548" r="2.4" fill="${INK}" stroke="none"/><circle cx="-6" cy="568" r="2.4" fill="${INK}" stroke="none"/><circle cx="6" cy="568" r="2.4" fill="${INK}" stroke="none"/>` };
    case 'sweaterdress': return { back: '', torso: `<path d="${fem('sweaterdress')}" fill="${c}"/>${femShade('sweaterdress')}<path d="M-12 461Q0 471 12 461" fill="none" stroke="${cl}" stroke-width="6" stroke-linecap="butt"/><path d="${`M${-18 * w} 512Q0 520 ${18 * w} 512`}" fill="none" stroke="${cl}" stroke-width="8" stroke-linecap="butt"/><path d="M${-27 * w} 548Q0 558 ${27 * w} 548" fill="none" stroke="${cl}" stroke-width="8" stroke-linecap="butt"/><path d="M${-33 * w} 572Q0 582 ${33 * w} 572" fill="none" stroke="${cl}" stroke-width="8" stroke-linecap="butt"/>` };
    default: return { back: '', torso: `<path d="${male(MALE_HEM_Y[kind] ?? 572)}" fill="${c}"/>${maleShade(MALE_HEM_Y[kind] ?? 572)}<path d="M-10 460L10 460L0 494Z" fill="#FBF4E8" stroke-width="2.5"/><path d="M-3 470H3L5 496L0 503L-5 496Z" fill="#C4694A" stroke-width="2.5"/>` };
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
  head: (mood: MoodId, blink?: boolean | 'half', gaze?: Gaze, view?: number) => string;
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

/** Размеры головы по форме: round — прежний круг r 28; oval — на 4 % уже и выше; square — челюсть шире на 6 %, плоский подбородок. */
export const FACE_DIM = { round: { rx: 28, ry: 28 }, oval: { rx: 26.88, ry: 29.12 } } as const;
/**
 * Квадратное лицо (32-Ж): верх широкий (полукруг r 28), на уровне глаз (y 437) ширина ≈ 57,5, к рту (y 451) сужается на ≈ 11,5 % (отношение 0,886; в 32-Е было 0,915),
 * нижние углы скруглены ещё сильнее (горизонтальный вынос дуги 0,50 ширины на уровне рта, в 32-Е 0,43), ровного участка внизу ≈ 2,4, самая нижняя точка 461,25.
 */
export const FACE_SQUARE_D = 'M-28 432Q-28 420.4 -19.8 412.2Q-11.6 404 0 404Q11.6 404 19.8 412.2Q28 420.4 28 432Q29.6 438.75 27.4 443.5Q26.6 460.3 1.2 460.7Q0 461.8 -1.2 460.7Q-26.6 460.3 -27.4 443.5Q-29.6 438.75 -28 432Z';
export const chinY = (shape: FaceSpec['shape']): number => (shape === 'oval' ? 432 + FACE_DIM.oval.ry : shape === 'square' ? 461.25 : 460);
/** Шея: ширина лица 56, доля 40 % (мужчины 44 %, женщины 36 %); видимая высота от подбородка по возрасту, ед. рисунка (× 1,76 в пикселях игры: 4,6 / 5,6 / 6,7 px). */
export const NECK_FACE_W = 56;
export const NECK_BASE = 0.4;
export const NECK_SEX = 0.04;
export const NECK_VISIBLE: Readonly<Record<Age, number>> = { young: 2.6, adult: 3.2, senior: 3.8 };
/** Румянец: центр (±16,5; 445,5), радиус 2…5, непрозрачность 0,25…0,5. */
/** Морщины: тонкие (1,2), полупрозрачные (0,38), тоном темнее кожи на ΔE76 22. */
export const WRINKLE_W = 1.2;
export const WRINKLE_ALPHA = 0.38;
export const WRINKLE_DE = 22;
export const BLUSH_X = 16.5;
export const BLUSH_Y = 445.5;
export function blushOf(face: FaceSpec, mood: MoodId, facial: Facial): { visible: boolean; r: number; alpha: number; eff: number } {
  const eff = hasBeard(facial) ? 0 : Math.min(1, face.blush + (mood === 'happy' || mood === 'joy' ? BLUSH_MOOD : 0));
  return { visible: eff > BLUSH_MIN, r: +(2 + 3 * eff).toFixed(2), alpha: +(0.25 + 0.25 * eff).toFixed(2), eff };
}
/** Поворот головы при ходьбе вбок: черты сдвигаются на 7,5 в сторону движения, дальний глаз (с зрачком, бликом, ресницами, бровью и линзой очков) уже на 25 %, дальнее ухо скрыто. */
export const TURN_SHIFT = 7.5;
export const TURN_FAR_EYE = 0.75;
/** Доля сдвига черт, на которую смещается рот (с усами) при повороте. */
export const TURN_MOUTH = 0.5;
/** Торс при повороте вбок уже на 6 % (дальнее плечо ближе к оси). */
export const TURN_TORSO = 0.06;
/** Тон кожи, затемнённый на заданную ΔE76 (морщины, тень под подбородком). */
export function tone(c: string, target: number): string {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (deltaE(c, mix(c, '#3A1F18', mid)) < target) lo = mid;
    else hi = mid;
  }
  return mix(c, '#3A1F18', (lo + hi) / 2);
}

export function personParts(o: Look, seat = false): PersonParts {
  const w = o.build === 'round' ? 1.12 : o.build === 'slim' ? 0.93 : 1;
  const sk = o.skin;
  const skd = dk(sk, 0.2);
  const ou = outfit(o.outfit, o.cloth, w);
  const hr = hairLayers(o.hair, o.hairCol, o.hat ?? o.cloth);
  const slv = o.outfit === 'suit' ? dk(o.cloth, 0.1) : o.outfit === 'vest' ? '#FBF4E8' : o.cloth;
  const pants = o.pants ?? '#4F4A5A';
  const shoe = o.shoe ?? '#2F211B';
  const item = seat ? 'none' : o.item;
  const back = o.acc === 'backpack' ? `<rect x="-46" y="468" width="38" height="78" rx="14" fill="${dk(o.cloth, 0.12)}"/><rect x="-42" y="520" width="20" height="18" rx="6" fill="${lt(o.cloth, 0.15)}" stroke-width="2.5"/>` : '';
  /* то, что человек держит в руке: рисуется вокруг кисти (0,0) */
  const caseL =
    item === 'briefcase' ? `<rect x="-17" y="8" width="34" height="26" rx="5" fill="#C98B5A"/><path d="M-8 8q8 -13 16 0" fill="none" stroke-width="2.5"/><path d="M-17 20h34" stroke-width="2" fill="none"/>`
    : item === 'tote' ? `<rect x="-15" y="8" width="30" height="28" rx="6" fill="#E7D3AE"/><path d="M-9 8q9 -15 18 0" fill="none" stroke-width="2.5"/><circle cx="0" cy="22" r="5" fill="${lt(o.cloth, 0.1)}" stroke-width="2"/>`
    : item === 'purse' ? `<rect x="-11" y="8" width="22" height="17" rx="4.5" fill="#B85C3F"/><path d="M-6 8q6 -11 12 0" fill="none" stroke-width="2.2"/><circle cx="0" cy="17" r="2.4" fill="#E8B04A" stroke-width="1.6"/>`
    : '';
  const phoneR = item === 'phone' ? `<rect x="-7" y="-17" width="13" height="22" rx="3.5" fill="#2F2B3A"/><rect x="-5" y="-14" width="9" height="14" rx="2" fill="#9FC3C7" stroke="none"/>` : '';
  const hand = (extra: string) => `${extra}<circle cx="0" cy="0" r="8.5" fill="${sk}"/>`;
  const face = o.face ?? DEFAULT_FACE;
  const dark = o.skin === SKIN[4] || o.skin === SKIN[3];
  const stache = hasMustache(o.facial) ? MOUSTACHE_PATH(beardColor(o.hairCol)) : '';
  const sSeed = stubbleSeed(o);

  /* губы светлой линией нужны там, где рот лежит внутри плотной бороды */
  const beardMass = o.facial === 'beard' || o.facial === 'short';
  /** Глаз; k < 1 — дальний при повороте: белок, зрачок и блик сужены по ширине вместе (высота прежняя), зрачок целиком внутри белка, блик внутри зрачка. */
  const eye = (cx: number, hl: number, g: Gaze, k = 1) => {
    if (k === 1) return `<g><ellipse cx="${cx}" cy="437" rx="4.7" ry="5" fill="#FFFDF6" stroke-width="1.8"/><circle cx="${cx + 0.4 + g.x}" cy="${438 + g.y}" r="2.8" fill="#2F211B" stroke="none"/><circle cx="${hl + g.x}" cy="${436.6 + g.y}" r="1" fill="#fff" stroke="none"/></g>`;
    const rx = +(4.7 * k).toFixed(2);
    /* зрачок целиком внутри белка (с запасом на контур 0,9): взгляд ослабляется, пока эллипс зрачка не поместится */
    const fits = (dx: number, dy: number): boolean => Array.from({ length: 32 }, (_, i) => i / 32 * 6.2832).every((a) => ((dx + 2.8 * k * Math.cos(a)) / (rx - 0.9)) ** 2 + ((dy + 2.8 * Math.sin(a)) / 4.1) ** 2 <= 1);
    let t = 1;
    while (t > 0 && !fits((0.4 + g.x * t) * k, 1 + g.y * t)) t = Math.max(0, +(t - 0.1).toFixed(1));
    const px = (0.4 + g.x * t) * k;
    const py = 438 + g.y * t;
    const hx = px + (hl - cx - 0.4) * k;
    return `<g><ellipse cx="${cx}" cy="437" rx="${+rx.toFixed(2)}" ry="5" fill="#FFFDF6" stroke-width="1.8"/><ellipse cx="${+(cx + px).toFixed(2)}" cy="${+py.toFixed(2)}" rx="${+(2.8 * k).toFixed(2)}" ry="2.8" fill="#2F211B" stroke="none"/><ellipse cx="${+(cx + hx).toFixed(2)}" cy="${+(py - 1.4).toFixed(2)}" rx="${+k.toFixed(2)}" ry="1" fill="#fff" stroke="none"/></g>`;
  };
  /* очки: при повороте обе линзы едут вместе с глазами (сдвиг fx), дальняя линза уже в TURN_FAR_EYE раз; дужка только у ближней стороны, до уха */
  const glassesSvg = (view: number): string => {
    if (o.acc !== 'glasses') return '';
    if (view === 0) return `<circle cx="-11" cy="437" r="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><circle cx="11" cy="437" r="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><path d="M-3 436H3M-19 435L-28 432M19 435L28 432" stroke-width="2.5" fill="none"/>`;
    const fx = view * TURN_SHIFT;
    const nearC = -view * 11 + fx;
    const farC = view * 10 + fx;
    const k = TURN_FAR_EYE;
    const nearEdge = nearC + view * 8;
    const farEdge = farC - view * 8 * k;
    return `<circle cx="${nearC}" cy="437" r="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><ellipse cx="${farC}" cy="437" rx="${+(8 * k).toFixed(2)}" ry="8" fill="#fff" fill-opacity=".28" stroke-width="2.5"/><path d="M${nearEdge} 436H${farEdge}M${nearC - view * 8} 435L${-view * 28} 432" stroke-width="2.5" fill="none"/>`;
  };
  const glasses = glassesSvg(0);
  /* шарф закрывает шею: верх шарфа уходит под подбородок (32-Д) */
  const scarf = o.acc === 'scarf' ? `<path d="M-22 457Q0 463 22 457L26 478Q0 494 -26 478Z" fill="${lt('#C4694A', 0.05)}" stroke-width="2.8"/><path d="M14 478L20 512L30 508L24 476Z" fill="${lt('#C4694A', 0.05)}" stroke-width="2.8"/><path d="M-12 474v8M0 478v8M12 476v8" stroke="${lt('#C4694A', 0.45)}" stroke-width="2" fill="none"/>` : '';
  const band = o.acc === 'headphones' ? `<path d="M-27 428Q-28 396 0 394Q28 396 27 428" fill="none" stroke-width="8"/><path d="M-27 428Q-28 396 0 394Q28 396 27 428" fill="none" stroke="#4A6B72" stroke-width="4"/>` : '';
  const cups = o.acc === 'headphones' ? `<rect x="-35" y="422" width="12" height="22" rx="6" fill="#4A6B72"/><rect x="23" y="422" width="12" height="22" rx="6" fill="#4A6B72"/>` : '';
  const earsSvg = (hide: number) => [-1, 1].map((sg) => (sg === hide ? '' : `<circle cx="${27 * sg}" cy="438" r="5.5" fill="${sk}"/>${o.earrings && o.acc !== 'headphones' ? `<circle cx="${27.4 * sg}" cy="447.4" r="2.1" fill="#E8B04A" stroke-width="1.6"/>` : ''}`)).join('');
  /* у бородача рот лежит внутри бороды: узкая светлая полоска губ вдоль рта, без контура */
  const lips = (mood: MoodId): string => (beardMass && lipsWidth(mood) > 0 ? `<path d="${MOOD[mood].m}" fill="none" stroke="${sk}" stroke-width="${lipsWidth(mood)}" stroke-linecap="round"/>` : '');
  const halfEye = (cx: number, g: Gaze, k = 1): string => (k === 1
    ? `<g><ellipse cx="${cx}" cy="438" rx="4.7" ry="2.4" fill="#FFFDF6" stroke-width="1.8"/><ellipse cx="${cx + 0.4 + g.x}" cy="438.3" rx="2.5" ry="1.8" fill="#2F211B" stroke="none"/><path d="M${cx - 5.2} 436.6q5.2 -3 10.4 0" fill="none" stroke-width="2"/></g>`
    : `<g><ellipse cx="${cx}" cy="438" rx="${+(4.7 * k).toFixed(2)}" ry="2.4" fill="#FFFDF6" stroke-width="1.8"/><ellipse cx="${+(cx + (0.4 + g.x) * k).toFixed(2)}" cy="438.3" rx="${+(2.5 * k).toFixed(2)}" ry="1.8" fill="#2F211B" stroke="none"/><path d="M${+(cx - 5.2 * k).toFixed(2)} 436.6q${+(5.2 * k).toFixed(2)} -3 ${+(10.4 * k).toFixed(2)} 0" fill="none" stroke-width="2"/></g>`);
  const wrinkleTone = tone(sk, WRINKLE_DE);
  const neckTone = tone(sk, 10);
  /* шея: отдельная форма под лицом (слой neck), видимая высота от подбородка по возрасту, ширина 36–44 % ширины лица */
  const nw = NECK_FACE_W * (NECK_BASE + (o.sex === 'm' ? NECK_SEX : -NECK_SEX));
  const chin = chinY(face.shape);
  const yc = chin + NECK_VISIBLE[o.age];
  const neck = o.acc === 'scarf' ? '' : `<path d="M${-nw / 2} 450L${-nw / 2} ${yc - 1.2}Q0 ${yc + 1.2} ${nw / 2} ${yc - 1.2}L${nw / 2} 450Z" fill="${sk}"/><ellipse cx="0" cy="${chin + 0.55}" rx="${(nw * 0.42).toFixed(1)}" ry="0.9" fill="${neckTone}" stroke="none"/>`;
  const faceBase = face.shape === 'round' ? `<circle cx="0" cy="432" r="28" fill="${sk}"/>` : face.shape === 'oval' ? `<ellipse cx="0" cy="432" rx="${FACE_DIM.oval.rx}" ry="${FACE_DIM.oval.ry}" fill="${sk}"/>` : `<path d="${FACE_SQUARE_D}" fill="${sk}"/>`;
  /** Лицо в зависимости от поворота: view = −1 или 1 (голова повёрнута в сторону движения), 0 — анфас. */
  const headLayers = (mood: MoodId, blink: boolean | 'half', gaze: Gaze, view = 0): Record<HeadLayer, string> => {
    const m = MOOD[mood];
    const brows = browSpec(mood, o.acc === 'glasses', o.hairCol, o.hair === 'beanie', face.brow);
    const closed = m.h || blink === true;
    const fx = view * TURN_SHIFT;
    /* дальний при повороте — глаз со стороны движения: он уже в TURN_FAR_EYE раз, всё его окружение (ресницы, бровь) вместе с ним */
    const kOf = (cx: number): number => (view !== 0 && Math.sign(cx) === view ? TURN_FAR_EYE : 1);
    const closedEye = (cx: number): string => { const k = kOf(cx); return `M${+(cx - 5 * k).toFixed(2)} 438q${+(5 * k).toFixed(2)} -7 ${+(10 * k).toFixed(2)} 0`; };
    const eyes = closed ? `<path d="${closedEye(-10)}${closedEye(10)}" fill="none" stroke-width="2.6"/>` : blink === 'half' ? `${halfEye(-10, gaze, kOf(-10))}${halfEye(10, gaze, kOf(10))}` : `${eye(-10, -8.5, gaze, kOf(-10))}${eye(10, 11.5, gaze, kOf(10))}`;
    const lashSide = (cx: number, sg: number): string => {
      const k = kOf(cx);
      const y1 = blink === 'half' ? 436 : 434.4;
      const y2 = blink === 'half' ? 434.6 : 432.8;
      const n = (v: number): number => +v.toFixed(2);
      return `M${n(cx + 4.8 * sg * k)} ${y1}l${n(2.3 * sg * k)} -2.2M${n(cx + 2.8 * sg * k)} ${y2}l${n(1.6 * sg * k)} -2.6`;
    };
    const lash = face.lashes && !closed ? `<path d="${lashSide(-10, -1)}${lashSide(10, 1)}" fill="none" stroke-width="1.5" stroke-linecap="round"/>` : '';
    /* при повороте бровь дальнего глаза сужается вместе с ним (вокруг его центра) */
    const browPath = (d: string, attrs: string): string => (view === 0 ? `<path d="${d}" fill="none" ${attrs}/>` : d.split(/(?=M)/).filter(Boolean).map((part) => {
      const cx = (Number((/^M(-?[\d.]+)/.exec(part) ?? [])[1]) || 0) > 0 ? 10 : -10;
      const k = kOf(cx);
      return `<path d="${part}" fill="none" ${attrs}${k === 1 ? '' : ` transform="translate(${cx} 0) scale(${k} 1) translate(${-cx} 0)"`}/>`;
    }).join(''));
    const browSvg = brows ? browPath(brows.d, `stroke="${brows.color}" stroke-width="${brows.w}" stroke-linecap="round"`) : browPath(m.b, `stroke-width="${OTHER_BROW_W[face.brow]}"`);
    /* возрастные черты (32-Е): мягкие короткие дуги вместо веера; тонкие, полупрозрачные, цвет кожи на тон темнее; при повороте дальняя сторона скрыта */
    const WL = `fill="none" stroke="${wrinkleTone}" stroke-opacity="${WRINKLE_ALPHA}" stroke-width="${WRINKLE_W}" stroke-linecap="round"`;
    const sides = [-1, 1].filter((sg) => sg !== view);
    const wr = face.wrinkles >= 1 ? `<path d="${sides.map((sg) => `M${17.4 * sg} 436.2q${2.3 * sg} -1.4 ${4.2 * sg} -0.4M${17.6 * sg} 439.6q${1.8 * sg} 0.8 ${2.8 * sg} 1.9`).join('')}" ${WL}/>` : '';
    /* у пожилых всегда: мешки под глазами, носогубные складки (не у бородачей) и одна линия на лбу; морщины 2 добавляют вторую линию на лбу */
    const old = o.age === 'senior' ? `<path d="${[-1, 1].map((sg) => `M${5.2 * sg} 443.8q${5.8 * sg} 2.3 ${11.6 * sg} 0`).join('')}${beardMass ? '' : sides.map((sg) => `M${5.6 * sg} 443.9q${5.2 * sg} 1.3 ${6.6 * sg} 8.7M${9.6 * sg} 449.8q${0.8 * sg} 1.8 ${0.4 * sg} 3.6`).join('')}M-9 423.6q9 -2.2 18 0" ${WL}/>` : '';
    const wr2 = face.wrinkles >= 2 ? `<path d="M-5.5 419.8q5.5 -1.4 11 0" ${WL}/>` : '';
    const nose = `<path d="${face.nose === 'small' ? 'M-1.6 442.3q1.6 1.5 3.2 0' : 'M-2.6 441.9q2.6 2.2 5.2 0'}" fill="none" stroke-width="1.5" stroke-linecap="round"/>`;
    const eb = blushOf(face, mood, o.facial);
    const blushSvg = eb.visible ? `<ellipse cx="${-BLUSH_X + fx * 0.35}" cy="${BLUSH_Y}" rx="${eb.r}" ry="${(eb.r * 0.62).toFixed(2)}" fill="#E3806C" fill-opacity="${(eb.alpha * (dark ? 0.75 : 1)).toFixed(2)}" stroke="none"/><ellipse cx="${BLUSH_X + fx * 0.35}" cy="${BLUSH_Y}" rx="${eb.r}" ry="${(eb.r * 0.62).toFixed(2)}" fill="#E3806C" fill-opacity="${(eb.alpha * (dark ? 0.75 : 1)).toFixed(2)}" stroke="none"/>` : '';
    /* рот и усы ближе к оси головы: при повороте сдвигаются на 50 % сдвига черт (иначе уголок рта выходит за контур) */
    const mouth = `${lips(mood)}<path d="${m.m}" fill="${m.f ?? 'none'}" stroke-width="2.5"/>`;
    const mouthG = view !== 0 ? `<g transform="translate(${-(fx * (1 - TURN_MOUTH)).toFixed(2)} 0)">${mouth}${stache}</g>` : `${mouth}${stache}`;
    const feat = `${eyes}${lash}${browSvg}${wr}${old}${wr2}${nose}${blushSvg}${mouthG}`;
    return {
      neck,
      ears: earsSvg(view),
      face: `${faceBase}<path d="M14 408Q34 424 20 452Q28 432 14 408Z" fill="${skd}" fill-opacity=".35" stroke="none"/><path d="M-26 424Q-24 414 -18 410" fill="none" stroke="${lt(sk, 0.5)}" stroke-width="3" stroke-opacity=".7"/>`,
      beard: beardLayer(o.facial, o.hairCol, o.age, fx, face.shape, sSeed, mood),
      features: view !== 0 ? `<g transform="translate(${fx} 0)">${feat}</g>` : feat,
      glasses: view !== 0 ? glassesSvg(view) : glasses,
      hair: hr.f,
      band,
      bun: hr.o,
      cups
    };
  };
  const head = (mood: MoodId, blink: boolean | 'half' = false, gaze: Gaze = { x: 0, y: 0 }, view = 0): string => {
    const L = headLayers(mood, blink, gaze, view);
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
  if (hb) cells.push({ id: 'hairBack', box: { x: -48, y: 392, w: 114, h: 110 }, svg: `<g transform="translate(0 458) scale(1.1) translate(0 -458)">${seat && hr.bs ? hr.bs : hr.b}</g>` });
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
