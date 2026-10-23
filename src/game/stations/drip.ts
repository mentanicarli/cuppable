/* ---------- Капельная кофеварка: колба и заварка (31-8Б) ----------
   Чистая логика без DOM. Колба живёт в D (смена), в сохранение не пишется: в начале дня она пуста.
   Числа — docs/design/filter-coffee.md, разделы 2.2 и 2.3: кофе : вода около 1 : 16,5, сухой кофе впитывает около 2 мл воды на грамм,
   поэтому выход напитка = вода − 2 · кофе. Время заварки сжато до 20–40 с реального времени игры. */

export type BatchSize = '0.6' | '0.9' | '1.2';
export interface Batch {
  /** сухой кофе, г */
  coffeeG: number;
  /** вода в колбу, мл */
  waterMl: number;
  /** сколько напитка выйдет, мл */
  outMl: number;
  /** время ожидания, с */
  seconds: number;
}
export const BATCH_SIZES: readonly BatchSize[] = ['0.6', '0.9', '1.2'];
export const BATCHES: Readonly<Record<BatchSize, Batch>> = {
  '0.6': { coffeeG: 41, waterMl: 680, outMl: 598, seconds: 20 },
  '0.9': { coffeeG: 62, waterMl: 1025, outMl: 901, seconds: 30 },
  '1.2': { coffeeG: 83, waterMl: 1365, outMl: 1199, seconds: 40 }
};
/** Вместимость колбы, мл (бытовая капельная кофеварка 1,2–1,25 л). */
export const CARAFE_ML = 1200;
/** Кофе на чашку, г, и вода на чашку, мл, по размеру напитка (для себестоимости и книги): те же 1 : 16,4. */
export const CUP_COFFEE_G: Readonly<Record<string, number>> = { '0.2': 14, '0.3': 21, '0.4': 28 };
export const CUP_WATER_ML: Readonly<Record<string, number>> = { '0.2': 230, '0.3': 345, '0.4': 460 };

export interface Carafe {
  /** налито в колбу, мл (готово к подаче) */
  ml: number;
  /** идёт заварка: порция и сколько секунд прошло */
  brew: { size: BatchSize; t: number } | null;
}
export const newCarafe = (): Carafe => ({ ml: 0, brew: null });

/** Можно ли начать заварку порции: нет другой заварки и результат помещается в колбу (долив, пока есть место). */
export function brewCheck(c: Carafe, size: BatchSize): 'ok' | 'brewing' | 'full' {
  if (c.brew) return 'brewing';
  return c.ml + BATCHES[size].outMl > CARAFE_ML ? 'full' : 'ok';
}
/** Запустить заварку: колба занята `seconds` секунд, потом в неё добавится `outMl`. */
export function startBrew(c: Carafe, size: BatchSize): boolean {
  if (brewCheck(c, size) !== 'ok') return false;
  c.brew = { size, t: 0 };
  return true;
}
/** Время идёт (dt, с реального времени смены). Возвращает true в кадре, когда заварка закончилась. */
export function tickBrew(c: Carafe, dt: number): boolean {
  const b = c.brew;
  if (!b) return false;
  b.t += dt;
  const batch = BATCHES[b.size];
  if (b.t < batch.seconds) return false;
  c.ml = Math.min(CARAFE_ML, c.ml + batch.outMl);
  c.brew = null;
  return true;
}
/** Доля готовности заварки 0..1 (0, когда заварки нет). */
export const brewProgress = (c: Carafe): number => (c.brew ? Math.min(1, c.brew.t / BATCHES[c.brew.size].seconds) : 0);
/** Сколько секунд осталось. */
export const brewLeft = (c: Carafe): number => (c.brew ? Math.max(0, BATCHES[c.brew.size].seconds - c.brew.t) : 0);
/** Уровень для картинки: готовый кофе плюс то, что уже накапало за время заварки. */
export const levelMl = (c: Carafe): number => (c.brew ? Math.min(CARAFE_ML, c.ml + BATCHES[c.brew.size].outMl * brewProgress(c)) : c.ml);

/** Можно ли налить чашку: ok; идёт заварка; колба пуста; мало (есть кофе, но меньше чашки). */
export function pourCheck(c: Carafe, ml: number): 'ok' | 'brewing' | 'empty' | 'low' {
  if (c.ml >= ml) return 'ok';
  if (c.brew) return 'brewing';
  return c.ml <= 0 ? 'empty' : 'low';
}
/** Налить чашку: объём вычитается из колбы. */
export function pour(c: Carafe, ml: number): boolean {
  if (c.ml < ml) return false;
  c.ml -= ml;
  return true;
}
/** Вернуть в колбу (гость ушёл, или помощник отдал резерв), не больше вместимости. */
export function unpour(c: Carafe, ml: number): void {
  c.ml = Math.min(CARAFE_ML, c.ml + ml);
}
/** Тост, если налить нельзя (тексты по разделу 3.3 документа). */
export const POUR_MSG: Readonly<Record<'brewing' | 'empty' | 'low', string>> = {
  brewing: 'Фильтр-кофе ещё готовится',
  empty: 'Колба пуста: заварите кофе',
  low: 'В колбе мало кофе: заварите ещё'
};
