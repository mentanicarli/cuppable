/* Копия цикла дня и прогона из src/game/playerModel.ts со счётчиками, работой помощника и подменой правил (аренда, приход гостей, цены магазина).
   Без подмены правил даёт те же доходы и снимки, что simulate() (проверяет economy-audit.ts). Только для скриптов аудита, в игру не входит. */
import { drinkCost, helperWage, ratingAfterLoss, rentFor, settle, settleDay, DEBT_LIMIT } from '../../src/game/economy';
import { EQ_IMPL, MAX_RANK, nextRank, rankInfo } from '../../src/game/menu';
import { estimatedPrepSeconds, patienceMax, queueDecayRate } from '../../src/game/patience';
import { CLOSING_LIMIT, DAY_LEN, arrivalRange, isRush } from '../../src/game/shift';
import { FOOD_COST_SHARE } from '../../src/game/food';
import { rollOrder } from '../../src/game/orders';
import { HELPER_KEYS, HELPER_MIN_RANK, HELPER_TEA_MINUTES, helperPrepTime, helperQuality } from '../../src/game/helper';
import { PRIORITY, isPurchasable, seeded } from '../../src/game/playerModel';
import type { Profile, Run } from '../../src/game/playerModel';
import type { CustomerType, Order, Quality } from '../../src/game/types';

/** Подмена правил для проб (по умолчанию всё как в игре). */
export interface Rules {
  /** аренда за день по рангу */
  rent?: (rank: number) => number;
  /** границы паузы между гостями по дню */
  arrival?: (day: number) => [number, number];
  /** цены позиций магазина по id */
  cost?: Readonly<Record<string, number>>;
  /** зарплата помощника по рангу */
  wage?: (rank: number) => number;
  /** рейтинг после потерянного гостя (по умолчанию ratingAfterLoss) */
  loss?: (rating: number, day: number, rank: number) => number;
  /** день, по которому считается поддержка новичков в терпении (по умолчанию сам день) */
  newbieDay?: (day: number) => number;
  /** пороги рейтинга рангов вместо progression.json */
  rankRating?: Readonly<Record<number, number>>;
  /** гости не уходят (бесконечное терпение): сколько дней шёл бы игрок без потерь */
  noLoss?: boolean;
}

/* ---------- копия дня модели с счётчиками ---------- */
export interface DayState { day: number; rank: number; rating: number; owned: Record<string, boolean> }
export interface DayOut { revenue: number; price: number; tips: number; costs: number; served: number; lost: number; guests: number; rating: number; byHelper: number; foodGuests: number; hlpCosts: number; hTea: number; lostPos: number[]; lostLen: number[]; gotLen: number[] }
export interface Guest { type: CustomerType; pat: number; order: Order; taken?: boolean; len: number }
const STEP = 0.5;
export interface Opt { helperWork?: boolean; extraKeys?: ReadonlySet<string>; rules?: Rules }

function gap(day: number, rating: number, t: number, wifi: boolean, rng: () => number, rules?: Rules): number {
  const [a, b] = rules?.arrival ? rules.arrival(day) : arrivalRange(day);
  let k = 1.25 - 0.1 * rating;
  if (isRush(t)) k *= 0.6;
  if (wifi) k *= 0.88;
  return (a + rng() * (b - a)) * k;
}

export function playDay(s: DayState, prof: Profile, rng: () => number, opt: Opt = {}): DayOut {
  const { day, rank } = s;
  let { rating } = s;
  const owned = s.owned;
  const eq = Object.fromEntries(EQ_IMPL.map((e) => [e, !!owned['eq_' + e]]));
  const typeOf = (): CustomerType => { const r = rng(); return day === 1 ? (r < 0.6 ? 'regular' : 'student') : r < 0.45 ? 'regular' : r < 0.75 ? 'student' : 'hurry'; };
  const out: DayOut = { revenue: 0, price: 0, tips: 0, costs: 0, served: 0, lost: 0, guests: 0, rating, byHelper: 0, foodGuests: 0, hlpCosts: 0, hTea: 0, lostPos: [0, 0, 0], lostLen: [0, 0, 0], gotLen: [0, 0, 0] };
  const queue: Guest[] = [];
  let nextArr = 4, prep: Guest | null = null, prepLeft = 0, prepCost = 0;
  let hg: Guest | null = null, hLeft = 0, hCost = 0;
  const lose = (g: Guest): void => {
    rating = opt.rules?.loss ? opt.rules.loss(rating, day, rank) : ratingAfterLoss(rating, rank);
    out.lost++;
    out.lostPos[Math.min(2, queue.indexOf(g))]++;
    out.lostLen[g.len]++;
    queue.splice(queue.indexOf(g), 1);
    if (g === prep) { prep = null; out.costs -= prepCost; }
    if (g === hg) { hg = null; out.costs -= hCost; out.hlpCosts -= hCost; }
  };
  for (let t = 0; t < DAY_LEN + CLOSING_LIMIT; t += STEP) {
    if (t >= DAY_LEN && !queue.length && !prep) break;
    if (t < DAY_LEN) {
      nextArr -= STEP;
      if (nextArr <= 0) {
        if (queue.length >= 3) nextArr = 1.2;
        else {
          nextArr = gap(day, rating, t, !!owned['wifi'], rng, opt.rules);
          const type = typeOf();
          const ord = rollOrder({ rank, day, milk: !!owned['milk'], eq }, type, rng);
          const prepS = estimatedPrepSeconds(ord);
          const pat0 = patienceMax(type, { cozy: !!owned['cozy'], helper: !!owned['helper'], prep: prepS, day: opt.rules?.newbieDay ? opt.rules.newbieDay(day) : day, rng });
          const len = prepS <= 40 ? 0 : prepS <= 70 ? 1 : 2;
          out.gotLen[len]++;
          queue.push({ type, pat: opt.rules?.noLoss ? 1e9 : pat0, order: ord, len });
          out.guests++;
          if (ord.food) out.foodGuests++;
        }
      }
    }
    for (const g of queue.slice()) {
      g.pat -= STEP * queueDecayRate(queue.indexOf(g));
      if (g.pat <= 0) lose(g);
    }
    const settleGuest = (g: Guest, quality: Quality, flawless: boolean): void => {
      const st = settle({ basePrice: g.order.base, beans: !!owned['beans'], paidSyrup: !!g.order.syrup && !g.order.syrupImplied, quality, type: g.type, flawless, cards: !!owned['cards'], rating, extra: g.order.food?.price ?? 0 });
      out.revenue += st.total; out.price += st.price; out.tips += st.tip;
      rating = st.rating;
      out.served++;
      queue.splice(queue.indexOf(g), 1);
    };
    /* помощник (только в варианте helperWork): берёт самого нетерпеливого из простых, кого не готовит игрок */
    if (opt.helperWork && owned['helper'] && rank >= HELPER_MIN_RANK) {
      if (!hg) {
        let best: Guest | null = null;
        for (const g of queue) {
          if (g === prep || g.taken || g.order.syrup || g.order.food || !(g.order.key !== 'filter_coffee' && (HELPER_KEYS.has(g.order.key) || !!opt.extraKeys?.has(g.order.key)))) continue;
          if (!best || g.pat < best.pat) best = g;
        }
        if (best) {
          hg = best; best.taken = true;
          hLeft = helperPrepTime(best.order.key, best.order.shots);
          hCost = drinkCost(best.order.key, !!owned['beans'], { size: best.order.size, cold: best.order.cold });
          out.costs += hCost; out.hlpCosts += hCost;
        }
      } else {
        hLeft -= STEP;
        if (hLeft <= 0) { const g: Guest = hg; hg = null; out.byHelper++; if (g.order.key in HELPER_TEA_MINUTES) out.hTea++; settleGuest(g, helperQuality(rank, rng), false); }
      }
    }
    if (!prep) {
      const first = queue.find((g) => !g.taken) ?? null;
      if (first) {
        prep = first;
        prepLeft = estimatedPrepSeconds(first.order) * prof.speed;
        prepCost = drinkCost(first.order.key, !!owned['beans'], { size: first.order.size, cold: first.order.cold }) + (first.order.food ? Math.round(first.order.food.price * FOOD_COST_SHARE) : 0);
        out.costs += prepCost;
      }
    } else {
      prepLeft -= STEP;
      if (prepLeft <= 0) {
        const g: Guest = prep;
        const r = rng();
        const quality = (r < prof.q[0] ? 0 : r < prof.q[0] + prof.q[1] ? 1 : 2) as Quality;
        const flawless = quality === 2 && rng() < 0.5;
        prep = null;
        settleGuest(g, quality, flawless);
      }
    }
  }
  if (prep) out.costs -= prepCost;
  if (hg) { out.costs -= hCost; out.hlpCosts -= hCost; }
  out.rating = rating;
  return out;
}

/** Полный прогон по дням (копия simulate); policy.noHelper — помощник не покупается; policy.helperWork — помощник готовит сам. */
export interface DayRec { lostPos: number[]; lostLen: number[]; gotLen: number[]; day: number; rank: number; revenue: number; price: number; tips: number; costs: number; rent: number; net: number; moneyEnd: number; served: number; lost: number; guests: number; byHelper: number; teaH: number; owned: number }
export interface Sim { run: Run; days: DayRec[]; overDay: number; moneyOver: number; minMoney: number; helperDay: number }
export interface Policy { rules?: Rules; extraKeys?: ReadonlySet<string>; noReserve?: boolean; noHelper?: boolean; helperWork?: boolean; helperAt?: number }
export function simFull(seed: number, prof: Profile, days: number, pol: Policy = {}): Sim {
  const rng = seeded(seed);
  const owned: Record<string, boolean> = {};
  const order: string[] = [];
  const run: Run = { avail: new Map(), afford: new Map(), bought: new Map(), rank: new Map([[1, 1]]), income: [], over: false, snaps: [], idle: [], guests: 0, lost: 0 };
  const rec: DayRec[] = [];
  let money = 500, rank = 1, rating = 3, served = 0, overDay = 0, moneyOver = 0, minMoney = 500, helperDay = 0;
  for (let day = 1; day <= days; day++) {
    run.snaps.push({ day, rank, rating, served, money, owned: [...order] });
    const o = playDay({ day, rank, rating, owned }, prof, rng, { helperWork: pol.helperWork !== false, extraKeys: pol.extraKeys, rules: pol.rules });
    rating = o.rating; served += o.served;
    run.guests += o.guests; run.lost += o.lost;
    const R = pol.rules;
    const wage = owned['helper'] ? (R?.wage ?? helperWage)(rank) : 0;
    const fin = R?.rent ? (() => { const rent = R.rent(rank) + wage; const m = money + o.revenue - o.costs - rent; return { money: m, over: m < DEBT_LIMIT, rent }; })() : settleDay({ money: money + o.revenue - o.costs, rank, wage });
    money = fin.money;
    run.income.push(o.revenue - o.costs - fin.rent);
    minMoney = Math.min(minMoney, money);
    rec.push({ lostPos: o.lostPos, lostLen: o.lostLen, gotLen: o.gotLen, day, rank, revenue: o.revenue, price: o.price, tips: o.tips, costs: o.costs, rent: fin.rent, net: o.revenue - o.costs - fin.rent, moneyEnd: money, served: o.served, lost: o.lost, guests: o.guests, byHelper: o.byHelper, teaH: o.hTea, owned: order.length });
    if (fin.over) { run.over = true; overDay = day; moneyOver = money; break; }
    const nr = pol.rules?.rankRating
      ? (() => { if (rank >= MAX_RANK) return null; const n = rankInfo(rank + 1); return day + 1 >= n.minDay && rating >= (pol.rules?.rankRating?.[n.rank] ?? n.minRating) && served >= n.minServed ? n : null; })()
      : nextRank(rank, { day: day + 1, rating, served });
    if (nr) { rank = nr.rank; run.rank.set(rank, day); }
    const eveningRent = (pol.rules?.rent ?? rentFor)(rank);
    let blocked = false;
    for (const it of PRIORITY) {
      if (owned[it.id]) continue;
      if (pol.noHelper && it.id === 'helper') continue;
      if (it.id === 'helper' && pol.helperAt && day + 1 < pol.helperAt) continue;
      if (!isPurchasable(it, day + 1, rank, owned)) continue;
      if (!run.avail.has(it.id)) run.avail.set(it.id, day);
      const price = pol.rules?.cost?.[it.id] ?? it.cost;
      if (money >= price && !run.afford.has(it.id)) run.afford.set(it.id, day);
      if (blocked && it.progression) continue;
      if (money - price >= (pol.noReserve ? 0 : eveningRent)) {
        money -= price; owned[it.id] = true; order.push(it.id); run.bought.set(it.id, day);
        if (it.id === 'helper') helperDay = day;
      } else if (it.progression) blocked = true;
    }
    run.idle.push(!PRIORITY.some((it) => !owned[it.id] && isPurchasable(it, day + 1, rank, owned)));
  }
  if (!run.over) run.snaps.push({ day: days + 1, rank, rating, served, money, owned: [...order] });
  return { run, days: rec, overDay, moneyOver, minMoney, helperDay };
}

