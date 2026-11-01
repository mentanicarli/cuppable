/* Аудит экономики (блок 33-А). Только чтение: игру, цены и модель не меняет, data/typical-progress.json не пишет.
   Запуск: node scripts/spike/economy-audit.mjs  → out/economy/*.md (+ out/economy/summary.json).
   Здесь лежит копия цикла дня из src/game/playerModel.ts с счётчиками (выручка/чаевые/расходы/потери по дням) и необязательной работой помощника;
   без помощника копия обязана давать те же доходы и снимки, что simulate() — это проверяется в начале (check «копия == модель»). */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DRINKS, DRINK_NEEDS, ENGINE, EQ_IMPL, EQUIPMENT, ICED, RANKS, drinkById, nextRank } from '../../src/game/menu';
import { COST, DEBT_LIMIT, RENT_BASE, drinkCost, helperWage, ratingAfterLoss, recipeCost, rentFor, settle, settleDay } from '../../src/game/economy';
import { estimatedPrepSeconds, patienceMax, queueDecayRate } from '../../src/game/patience';
import { CLOSING_LIMIT, DAY_LEN, arrivalInterval } from '../../src/game/shift';
import { FOOD_COST_SHARE } from '../../src/game/food';
import { RAF_NO_VANILLA_SHARE, rollOrder } from '../../src/game/orders';
import { cardVariants } from '../../src/game/recipeCard';
import { recipeNumbers } from '../../src/game/volumes';
import { BATCHES, CARAFE_ML } from '../../src/game/stations/drip';
import { HELPER_KEYS, helperPrepTime, helperQuality } from '../../src/game/helper';
import { PRIORITY, PROFILES, SHOP_DEFS, isPurchasable, seeded, simulate } from '../../src/game/playerModel';
import type { Profile, Run, ShopDef } from '../../src/game/playerModel';
import type { CustomerType, Order, Quality, Size } from '../../src/game/types';

const med = (a: number[]): number => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number : NaN);
const mean = (a: number[]): number => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const q = (a: number[], p: number): number => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] as number : NaN);
const sd = (a: number[]): number => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const f0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');
const f1 = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : '—');
const f2 = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 100) / 100).toFixed(2) : '—');
const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const RUNS = 60;
const DAYS = 60;
const SHOWN = 40;
const nameOf = (id: string): string => SHOP_DEFS.find((x) => x.id === id)?.name ?? id;

/* ---------- копия дня модели с счётчиками ---------- */
interface DayState { day: number; rank: number; rating: number; owned: Record<string, boolean> }
interface DayOut { revenue: number; price: number; tips: number; costs: number; served: number; lost: number; guests: number; rating: number; byHelper: number; foodGuests: number; hlpCosts: number }
interface Guest { type: CustomerType; pat: number; order: Order; taken?: boolean }
const STEP = 0.5;
interface Opt { helperWork?: boolean }

function playDay(s: DayState, prof: Profile, rng: () => number, opt: Opt = {}): DayOut {
  const { day, rank } = s;
  let { rating } = s;
  const owned = s.owned;
  const eq = Object.fromEntries(EQ_IMPL.map((e) => [e, !!owned['eq_' + e]]));
  const typeOf = (): CustomerType => { const r = rng(); return day === 1 ? (r < 0.6 ? 'regular' : 'student') : r < 0.45 ? 'regular' : r < 0.75 ? 'student' : 'hurry'; };
  const out: DayOut = { revenue: 0, price: 0, tips: 0, costs: 0, served: 0, lost: 0, guests: 0, rating, byHelper: 0, foodGuests: 0, hlpCosts: 0 };
  const queue: Guest[] = [];
  let nextArr = 4, prep: Guest | null = null, prepLeft = 0, prepCost = 0;
  let hg: Guest | null = null, hLeft = 0, hCost = 0;
  const lose = (g: Guest): void => {
    rating = ratingAfterLoss(rating);
    out.lost++;
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
          nextArr = arrivalInterval({ day, rating, t, wifi: !!owned['wifi'] }, rng);
          const type = typeOf();
          const ord = rollOrder({ rank, day, milk: !!owned['milk'], eq }, type, rng);
          const pat = patienceMax(type, { cozy: !!owned['cozy'], helper: !!owned['helper'], prep: estimatedPrepSeconds(ord), day, rng });
          queue.push({ type, pat, order: ord });
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
    if (opt.helperWork && owned['helper']) {
      if (!hg) {
        let best: Guest | null = null;
        for (const g of queue) {
          if (g === prep || g.taken || g.order.syrup || g.order.food || !HELPER_KEYS.has(g.order.key)) continue;
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
        if (hLeft <= 0) { const g: Guest = hg; hg = null; out.byHelper++; settleGuest(g, helperQuality(rank, rng), false); }
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
interface DayRec { day: number; rank: number; revenue: number; price: number; tips: number; costs: number; rent: number; net: number; moneyEnd: number; served: number; lost: number; guests: number; byHelper: number; owned: number }
interface Sim { run: Run; days: DayRec[]; overDay: number; moneyOver: number; minMoney: number; helperDay: number }
interface Policy { noReserve?: boolean; noHelper?: boolean; helperWork?: boolean; helperAt?: number }
function simFull(seed: number, prof: Profile, days: number, pol: Policy = {}): Sim {
  const rng = seeded(seed);
  const owned: Record<string, boolean> = {};
  const order: string[] = [];
  const run: Run = { avail: new Map(), afford: new Map(), bought: new Map(), rank: new Map([[1, 1]]), income: [], over: false, snaps: [], idle: [], guests: 0, lost: 0 };
  const rec: DayRec[] = [];
  let money = 500, rank = 1, rating = 3, served = 0, overDay = 0, moneyOver = 0, minMoney = 500, helperDay = 0;
  for (let day = 1; day <= days; day++) {
    run.snaps.push({ day, rank, rating, served, money, owned: [...order] });
    const o = playDay({ day, rank, rating, owned }, prof, rng, { helperWork: pol.helperWork });
    rating = o.rating; served += o.served;
    run.guests += o.guests; run.lost += o.lost;
    const fin = settleDay({ money: money + o.revenue - o.costs, rank, wage: owned['helper'] ? helperWage(rank) : 0 });
    money = fin.money;
    run.income.push(o.revenue - o.costs - fin.rent);
    minMoney = Math.min(minMoney, money);
    rec.push({ day, rank, revenue: o.revenue, price: o.price, tips: o.tips, costs: o.costs, rent: fin.rent, net: o.revenue - o.costs - fin.rent, moneyEnd: money, served: o.served, lost: o.lost, guests: o.guests, byHelper: o.byHelper, owned: order.length });
    if (fin.over) { run.over = true; overDay = day; moneyOver = money; break; }
    const nr = nextRank(rank, { day: day + 1, rating, served });
    if (nr) { rank = nr.rank; run.rank.set(rank, day); }
    const eveningRent = rentFor(rank);
    let blocked = false;
    for (const it of PRIORITY) {
      if (owned[it.id]) continue;
      if (pol.noHelper && it.id === 'helper') continue;
      if (it.id === 'helper' && pol.helperAt && day + 1 < pol.helperAt) continue;
      if (!isPurchasable(it, day + 1, rank, owned)) continue;
      if (!run.avail.has(it.id)) run.avail.set(it.id, day);
      if (money >= it.cost && !run.afford.has(it.id)) run.afford.set(it.id, day);
      if (blocked && it.progression) continue;
      if (money - it.cost >= (pol.noReserve ? 0 : eveningRent)) {
        money -= it.cost; owned[it.id] = true; order.push(it.id); run.bought.set(it.id, day);
        if (it.id === 'helper') helperDay = day;
      } else if (it.progression) blocked = true;
    }
    run.idle.push(!PRIORITY.some((it) => !owned[it.id] && isPurchasable(it, day + 1, rank, owned)));
  }
  if (!run.over) run.snaps.push({ day: days + 1, rank, rating, served, money, owned: [...order] });
  return { run, days: rec, overDay, moneyOver, minMoney, helperDay };
}

const out: Record<string, string[]> = {};
const summary: Record<string, unknown> = {};

/* ---------- 0. проверка копии ---------- */
{
  let bad = 0;
  for (const prof of PROFILES) for (let i = 1; i <= RUNS; i++) {
    const a = simulate(i, prof, DAYS);
    const b = simFull(i, prof, DAYS).run;
    if (a.over !== b.over || JSON.stringify(a.income) !== JSON.stringify(b.income) || JSON.stringify(a.snaps) !== JSON.stringify(b.snaps)) bad++;
  }
  out['00-check'] = [`Копия цикла дня в скрипте == simulate() из playerModel.ts: расхождений ${bad} из ${PROFILES.length * RUNS} прогонов (доходы по дням и снимки совпадают побитно).`];
  summary['copyMismatch'] = bad;
  if (bad) throw new Error('копия модели расходится с simulate(): ' + bad);
}

/* ---------- 1. таблица напитков ---------- */
const coldKey = (d: (typeof DRINKS)[number], cold: boolean): string => { const k = ENGINE[d.id] ?? d.id; return cold && ICED[k] ? (ICED[k] as string) : k; };
interface DRow { id: string; name: string; family: string; rank: number; size: Size; cold: boolean; price: number; cost: number; margin: number; pct: number; sec: number; perMin: number; shots: number }
const drows: DRow[] = [];
for (const d of DRINKS) {
  if (!(d.id in ENGINE)) continue;
  for (const v of cardVariants(d)) {
    const price = d.sizes[v.size] ?? 0;
    const r = recipeNumbers(d, v.size, v.cold);
    const cost = recipeCost(r);
    let sec = NaN;
    try { sec = estimatedPrepSeconds({ key: coldKey(d, v.cold), cold: v.cold, shots: r.shots, syrup: null, food: null }); } catch { /* нет шагов */ }
    drows.push({ id: d.id, name: d.name, family: d.family, rank: d.rank, size: v.size, cold: v.cold, price, cost, margin: price - cost, pct: ((price - cost) / price) * 100, sec, perMin: ((price - cost) / sec) * 60, shots: r.shots });
  }
}
{
  const famMed: Record<string, number> = {};
  for (const fam of new Set(drows.map((x) => x.family))) famMed[fam] = med(drows.filter((x) => x.family === fam && x.size === '0.2' || x.family === fam && x.size === '0.3').map((x) => x.pct));
  const flag = (x: DRow): string => { const f: string[] = []; if (x.pct < 30) f.push('<30%'); if (x.pct > 80) f.push('>80%'); if (Math.abs(x.pct - (famMed[x.family] as number)) > 15) f.push(`±${f0(Math.abs(x.pct - (famMed[x.family] as number)))}пп к семейству`); return f.join(', '); };
  const rows = drows.map((x) => [x.name, x.family, String(x.rank), x.size + (x.cold ? ' хол.' : ''), String(x.shots), String(x.price), String(x.cost), String(x.margin), f0(x.pct) + '%', f0(x.sec), f0(x.perMin), flag(x)]);
  out['01-drinks'] = [...md(['Напиток', 'Семейство', 'Ранг', 'Размер', 'Шоты', 'Цена ₽', 'Себест. ₽', 'Маржа ₽', 'Маржа %', 'Время, с', '₽/мин', 'Отметка'], rows)];
  const lowRows = drows.filter((x) => x.pct < 30 || x.pct > 80);
  out['01-outliers'] = md(['Напиток', 'Размер', 'Цена', 'Себест.', 'Маржа %'], lowRows.map((x) => [x.name, x.size + (x.cold ? ' хол.' : ''), String(x.price), String(x.cost), f0(x.pct) + '%']));
  const fam = [...new Set(drows.map((x) => x.family))].map((f) => { const xs = drows.filter((x) => x.family === f); return [f, String(xs.length), f0(Math.min(...xs.map((x) => x.pct))) + '–' + f0(Math.max(...xs.map((x) => x.pct))) + '%', f0(med(xs.map((x) => x.pct))) + '%', f0(med(xs.map((x) => x.perMin)))]; });
  out['01-families'] = md(['Семейство', 'Вариантов', 'Маржа % (мин–макс)', 'Медиана %', 'Медиана ₽/мин'], fam);
  summary['drinkVariants'] = drows.length;
  summary['below30'] = drows.filter((x) => x.pct < 30).length;
  summary['above80'] = drows.filter((x) => x.pct > 80).length;
  summary['marginMedian'] = med(drows.map((x) => x.pct));
}

/* по каждому размеру: цена за мл (дороже/дешевле соседей по размеру) */
{
  const rows: string[][] = [];
  for (const d of DRINKS.filter((x) => x.id in ENGINE)) {
    const sz = Object.entries(d.sizes) as [Size, number][];
    if (sz.length < 2) continue;
    const per = sz.map(([s, p]) => (p / ({ '0.2': 200, '0.3': 300, '0.4': 400, '0.6': 600 } as Record<string, number>)[s]!) * 1000);
    rows.push([d.name, sz.map(([s, p]) => `${s}: ${p}`).join(', '), per.map((x) => f0(x)).join(' / ')]);
  }
  out['01-sizeprice'] = md(['Напиток', 'Цены по размерам', '₽ за литр (по размерам)'], rows);
}

/* ---------- 1б. проверяемые числа ---------- */
{
  const L: string[] = [];
  const row = (id: string, size: Size, cold = false) => drows.find((x) => x.id === id && x.size === size && x.cold === cold);
  /* доли заказов: сэмплируем rollOrder в состоянии «всё куплено» на ранге r */
  const share = (rank: number, id: string, n = 30000): number => {
    const rng = seeded(7); const eq = Object.fromEntries(EQ_IMPL.map((e) => [e, true]));
    let c = 0, tot = 0;
    for (let i = 0; i < n; i++) { const o = rollOrder({ rank, day: 30, milk: true, eq }, 'regular', rng); tot++; if (o.id === id) c++; }
    return (c / tot) * 100;
  };
  const shareMilkOnly = (rank: number, id: string, n = 30000): number => {
    const rng = seeded(8); const eq = Object.fromEntries(EQ_IMPL.map((e) => [e, e === 'cream']));
    let c = 0;
    for (let i = 0; i < n; i++) if (rollOrder({ rank, day: 10, milk: true, eq }, 'regular', rng).id === id) c++;
    return (c / n) * 100;
  };
  L.push('**Раф** (`raf`, ранг 3, вес 0,2; сироп «ваниль» входит в цену, доплаты нет):', '');
  L.push(...md(['Размер', 'Цена', 'Себест. с ваниль-сиропом', 'Маржа ₽', 'Маржа %', 'Себест. «без ванильного сахара»'], (['0.2', '0.3', '0.4', '0.6'] as Size[]).map((s) => {
    const r = row('raf', s); if (!r) return [s, '—', '—', '—', '—', '—'];
    const d = drinkById['raf']!; const rn = recipeNumbers(d, s, false);
    const without = r.cost - rn.pumps * 2.5;
    return [s, String(r.price), String(r.cost), String(r.margin), f0(r.pct) + '%', `${f0(without)} (маржа ${f0(((r.price - without) / r.price) * 100)}%)`];
  })));
  const rafW = (rk: number) => f1(share(rk, 'raf'));
  L.push('', `Доля рафа среди заказов гостя «обычный» (всё оборудование куплено): ранг 3 — ${rafW(3)}%, ранг 5 — ${rafW(5)}%, ранг 9 — ${rafW(9)}%; при только сливках (без остального) на ранге 3 — ${f1(shareMilkOnly(3, 'raf'))}%.`);
  const r2 = row('raf', '0.2')!;
  const eff = (1 - RAF_NO_VANILLA_SHARE) * r2.cost + RAF_NO_VANILLA_SHARE * (r2.cost - 2 * 2.5);
  L.push(`Доля «без ванильного сахара» ${RAF_NO_VANILLA_SHARE * 100}%: ожидаемая себестоимость 0,2 л = ${f1(eff)} ₽ (с сиропом ${r2.cost}, без ${r2.cost - 5}); сироп стоит 2 помпы × 2,5 = 5 ₽, то есть разница 1,6 п. п. маржи — на экономику не влияет.`);
  L.push('', '**Фильтр-кофе** (`filter_coffee`, ранг 3, вес 0,4):', '');
  L.push(...md(['Размер', 'Цена', 'Себест.', 'Маржа ₽', 'Маржа %', 'Время, с', '₽/мин'], (['0.2', '0.3', '0.4'] as Size[]).map((s) => { const r = row('filter_coffee', s); return r ? [s, String(r.price), String(r.cost), String(r.margin), f0(r.pct) + '%', f0(r.sec), f0(r.perMin)] : [s, '—', '—', '—', '—', '—', '—']; })));
  L.push('', `Доля среди заказов (всё куплено): ранг 3 — ${f1(share(3, 'filter_coffee'))}%, ранг 5 — ${f1(share(5, 'filter_coffee'))}%, ранг 9 — ${f1(share(9, 'filter_coffee'))}%. В комментарии кода заявлено «около 18% на ранге 3 и 5% на ранге 9».`);
  L.push('', `Колба ${CARAFE_ML} мл. Заварка (кофе г / вода мл / выход мл / секунд): ` + (['0.6', '0.9', '1.2'] as const).map((k) => `${k} л: ${BATCHES[k].coffeeG} г / ${BATCHES[k].waterMl} / ${BATCHES[k].outMl} / ${BATCHES[k].seconds} с, цена кофе+воды ${f0(BATCHES[k].coffeeG * 2 + BATCHES[k].waterMl * COST.W)} ₽ (${f2((BATCHES[k].coffeeG * 2 + BATCHES[k].waterMl * COST.W) / BATCHES[k].outMl * 1000)} ₽/л)`).join('; ') + '.');
  L.push(`Расход по чашке (рецепт 14/21/28 г и 230/345/460 мл воды) — 2 ₽/г, вода 0,03 ₽/мл; заварка целой колбы 1,2 л даёт ${BATCHES['1.2'].outMl} мл ≈ ${f1(BATCHES['1.2'].outMl / 200)} чашки 0,2 л / ${f1(BATCHES['1.2'].outMl / 300)} 0,3 л / ${f1(BATCHES['1.2'].outMl / 400)} 0,4 л. Выход ${f0((BATCHES['1.2'].outMl / BATCHES['1.2'].waterMl) * 100)}% от воды (потери на фильтре), а в рецепте чашки вода 230 мл на 200 мл напитка (+15%) — те же потери.`);
  L.push('', '**Эспрессо** (допущение 70 ₽):', '');
  { const r = row('espresso', '0.2'); const r2b = row('espresso_double', '0.2'); L.push(...md(['Напиток', 'Цена', 'Себест.', 'Маржа ₽', 'Маржа %', 'Время, с', '₽/мин'], [r, r2b].filter((x): x is DRow => !!x).map((x) => [x.name, String(x.price), String(x.cost), String(x.margin), f0(x.pct) + '%', f0(x.sec), f0(x.perMin)]))); }
  L.push('', `Доля одиночного эспрессо среди заказов: ранг 1 — ${f1(share(1, 'espresso'))}%, ранг 3 — ${f1(share(3, 'espresso'))}%, ранг 9 — ${f1(share(9, 'espresso'))}%.`);
  L.push('', '**Сифон для пены** (`eq_whipper`, ранг 6, 1800 ₽): напитки, которым он нужен:', '');
  const needW = DRINKS.filter((d) => d.id in ENGINE && d.steps.some((s) => s.st === 'foam'));
  L.push(...md(['Напиток', 'Ранг', 'Размеры → маржа ₽'], needW.map((d) => [d.name, String(d.rank), drows.filter((x) => x.id === d.id).map((x) => `${x.size}${x.cold ? 'х' : ''}: ${x.margin}`).join('; ')])));
  const sumShare = (rk: number) => needW.reduce((a, d) => a + share(rk, d.id, 20000), 0);
  L.push('', `Суммарная доля заказов таких напитков (все остальные станции куплены): ранг 6 — ${f1(sumShare(6))}%, ранг 9 — ${f1(sumShare(9))}%.`);
  out['01-checks'] = L;
}

/* ---------- 2. оборудование и магазин: окупаемость A/B ---------- */
interface TypState { rank: number; rating: number; served: number; day: number; owned: string[] }
const table = JSON.parse(readFileSync('data/typical-progress.json', 'utf8')) as { profiles: Record<string, { days: Array<{ day: number; rank: number; rating: number; served: number }>; purchases: Array<{ id: string; day: number }> }> };
const AB_SEEDS = 150, AB_DAYS = 4;
function abItem(item: ShopDef, prof: Profile, availDay: number): { dGain: number; se: number; guests: number; baseNet: number } | null {
  const t = table.profiles[prof.id]!;
  const day = Math.min(DAYS, Math.max(2, availDay + 1));
  const st = t.days[day - 1]!;
  const owned: Record<string, boolean> = {};
  for (const p of t.purchases) if (p.day <= day && p.id !== item.id) owned[p.id] = true;
  const diffs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let sd0 = 1; sd0 <= AB_SEEDS; sd0++) {
    const arm = (own: Record<string, boolean>): { net: number; guests: number } => {
      const rng = seeded(9000 + sd0);
      let rating = st.rating, net = 0, guests = 0;
      for (let k = 0; k < AB_DAYS; k++) {
        const o = playDay({ day: day + k, rank: st.rank, rating, owned: own }, prof, rng);
        rating = o.rating; net += o.revenue - o.costs; guests += o.served;
      }
      return { net: net / AB_DAYS, guests: guests / AB_DAYS };
    };
    const a = arm(owned);
    const b = arm({ ...owned, [item.id]: true });
    diffs.push(b.net - a.net); gs.push(b.guests - a.guests); bs.push(a.net);
  }
  return { dGain: mean(diffs), se: sd(diffs) / Math.sqrt(diffs.length), guests: mean(gs), baseNet: mean(bs) };
}
const runsByProf: Record<string, Sim[]> = {};
for (const p of PROFILES) runsByProf[p.id] = Array.from({ length: RUNS }, (_, i) => simFull(i + 1, p, DAYS));

{
  const L: string[] = [];
  const blind = new Set(['stencil', 'grinderPro', 'tamper', 'thermo', 'machine', 'helper']);
  const head = ['Позиция', 'Цена ₽', 'Ранг/день открытия (правило)', 'Откр. в модели (день, мед.)', 'Что открывает/даёт', 'Прирост ₽/день (±SE)', 'Гостей/день', 'Окупается, дней', 'Вывод'];
  const rowsByProf: Record<string, string[][]> = { medium: [], confident: [] };
  const sumRows: Array<{ prof: string; id: string; payback: number; gain: number }> = [];
  for (const prof of PROFILES) {
    const t = table.profiles[prof.id]!;
    for (const it of SHOP_DEFS) {
      const avail = runsByProf[prof.id]!.map((s) => s.run.avail.get(it.id)).filter((x): x is number => x !== undefined);
      const eqDef = EQUIPMENT.find((e) => 'eq_' + e.id === it.id);
      const rule = eqDef ? `ранг ${eqDef.rank}` : `${it.minRank ? 'ранг ' + it.minRank : ''}${it.minDay ? 'день ' + it.minDay : ''}` || 'сразу';
      const gives = eqDef ? DRINKS.filter((d) => d.id in ENGINE && (DRINK_NEEDSOF(d.id)).includes(eqDef.id)).length + ' напитк.' : it.id === 'milk' ? 'молочные напитки' : it.id === 'beans' ? '+15% к цене, +6 ₽/шот' : it.id === 'wifi' ? 'приход гостей ×0,88 пауза' : it.id === 'cozy' ? 'терпение ×1,15' : it.id === 'cards' ? 'рейтинг ×1,6 к плюсу' : it.id === 'helper' ? 'готовит простые, терпение ×1,2' : 'качество (в модели не виден)';
      let cellGain = '—', cellG = '—', pay = '—', verdict = '';
      if (!avail.length) { verdict = 'в модели не открывается за ' + DAYS + ' дн.'; }
      else if (blind.has(it.id) && it.id !== 'helper') { verdict = 'эффект — только качество шагов; модель его не видит'; }
      else if (it.id === 'helper') { verdict = 'см. раздел 6'; }
      else {
        const r = abItem(it, prof, med(avail));
        if (r) {
          cellGain = `${f0(r.dGain)} (±${f0(r.se)})`; cellG = f1(r.guests);
          const sig = r.dGain > 2 * r.se;
          const days = r.dGain > 0 ? it.cost / r.dGain : Infinity;
          pay = sig && Number.isFinite(days) ? f1(days) : r.dGain <= 0 ? 'никогда' : f1(days) + '?';
          verdict = !sig ? 'эффект в пределах шума' : days < 1 ? 'меньше суток' : days > 10 ? 'дольше 10 дней' : '';
          sumRows.push({ prof: prof.id, id: it.id, payback: sig ? days : Infinity, gain: r.dGain });
        }
      }
      rowsByProf[prof.id]!.push([it.name, String(it.cost), rule, avail.length ? String(med(avail)) : '—', gives, cellGain, cellG, pay, verdict]);
    }
    L.push(`**${prof.name}** (состояние дня открытия — медианное из таблицы песочницы; ${AB_SEEDS} пар прогонов по ${AB_DAYS} дня, одинаковые семена):`, '', ...md(head, rowsByProf[prof.id]!), '');
    void t;
  }
  out['02-equipment'] = L;
  summary['paybackRows'] = sumRows;
}
function DRINK_NEEDSOF(id: string): string[] { return [...(DRINK_NEEDS[id] ?? [])]; }

/* ---------- 3. доход по дням ---------- */
{
  const L: string[] = [];
  for (const prof of PROFILES) {
    const sims = runsByProf[prof.id]!;
    const rows: string[][] = [];
    const nets: number[] = [];
    for (let d = 1; d <= SHOWN; d++) {
      const xs = sims.map((s) => s.days[d - 1]).filter((x): x is DayRec => !!x);
      if (!xs.length) { rows.push([String(d), '0', ...Array(11).fill('—')]); nets.push(NaN); continue; }
      const gross = med(xs.map((x) => x.revenue - x.costs));
      const rent = med(xs.map((x) => x.rent));
      nets.push(med(xs.map((x) => x.net)));
      rows.push([String(d), String(xs.length), f0(med(xs.map((x) => x.guests))), f0(med(xs.map((x) => x.served))), f1(mean(xs.map((x) => x.lost))), f0(med(xs.map((x) => x.revenue))), f0(med(xs.map((x) => x.costs))), f0(rent), f0(med(xs.map((x) => x.net))), f0(med(xs.map((x) => x.rank))), f0(med(xs.map((x) => x.moneyEnd))), gross > 0 ? f0((rent / gross) * 100) + '%' : '—']);
    }
    L.push(`**${prof.name}**, медианы по живым прогонам (из ${RUNS}); выручка включает чаевые; «Чистый» = выручка − расходы − аренда (− зарплата помощника); «Деньги» — на конец дня после аренды, до вечерних покупок; «Потеряно» — среднее:`, '', ...md(['День', 'Живых', 'Гостей', 'Обслужено', 'Потеряно', 'Выручка', 'Расходы', 'Аренда(+зп)', 'Чистый', 'Ранг', 'Деньги', 'Аренда/маржа'], rows), '');
    const jumps: string[] = [];
    for (let d = 2; d <= SHOWN; d++) { const a = nets[d - 2]!, b = nets[d - 1]!; if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) > 20 && Math.abs(b - a) / Math.abs(a) > 0.3 && Math.abs(b - a) > 60) jumps.push(`день ${d}: ${f0(a)} → ${f0(b)} (${b > a ? '+' : ''}${f0(((b - a) / Math.abs(a)) * 100)}%)`); }
    L.push(`Скачки чистого дохода (> 30% и > 60 ₽ к прошлому дню): ${jumps.length ? jumps.join('; ') : 'нет'}.`, '');
    summary['jumps_' + prof.id] = jumps;
  }
  L.push('**Аренда по рангам** (`rentFor`), и какую долю выручки она съедает при типичной выручке на дне ранга:', '');
  const rr: string[][] = [];
  for (let r = 1; r <= 9; r++) {
    const row = [String(r), String(rentFor(r))];
    for (const prof of PROFILES) {
      const xs = runsByProf[prof.id]!.flatMap((s) => s.days.filter((x) => x.rank === r));
      row.push(xs.length ? `${f0(med(xs.map((x) => x.revenue - x.costs)))} / ${f0((rentFor(r) / med(xs.map((x) => x.revenue - x.costs))) * 100)}%` : '—');
    }
    rr.push(row);
  }
  L.push(...md(['Ранг', 'Аренда ₽', 'Средний: маржа дня / доля аренды', 'Уверенный: маржа дня / доля аренды'], rr));
  out['03-days'] = L;
}

/* ---------- 4. ранги ---------- */
{
  const L: string[] = [];
  const goals: string[] = [];
  for (const prof of PROFILES) {
    const sims = runsByProf[prof.id]!;
    const rows: string[][] = [];
    for (const info of RANKS.filter((x) => x.rank >= 2)) {
      const ds = sims.map((s) => s.run.rank.get(info.rank)).filter((x): x is number => x !== undefined).map((x) => x + 1);
      rows.push([`${info.rank} ${info.title}`, `${ds.length}/${RUNS}`, ds.length ? f0(med(ds)) : '—', ds.length ? `${f0(q(ds, 0.1))}–${f0(q(ds, 0.9))}` : '—', ds.length ? `${f0(Math.min(...ds))}–${f0(Math.max(...ds))}` : '—', String(info.minDay)]);
    }
    L.push(`**${prof.name}** (день, когда ранг уже действует; ${RUNS} прогонов, горизонт ${DAYS} дн.):`, '', ...md(['Ранг', 'Достигли', 'Медиана дня', 'P10–P90', 'Мин–макс', 'minDay ранга'], rows), '');
    const r9 = sims.filter((s) => s.run.rank.has(9));
    const r4 = sims.map((s) => s.run.rank.get(4)).filter((x): x is number => x !== undefined).map((x) => x + 1);
    const r9d = r9.map((s) => (s.run.rank.get(9) as number) + 1);
    const over = sims.filter((s) => s.run.over).length;
    const stuck = sims.filter((s) => !s.run.over && !s.run.rank.has(9)).length;
    if (prof.id === 'medium') {
      goals.push(`«Средний»: ранг 4 к дню 9–10 — медиана ${f0(med(r4))} (${r4.length}/${RUNS} достигли) → ${med(r4) >= 9 && med(r4) <= 10 ? 'выполнено' : med(r4) < 9 ? 'раньше цели (выполнено «к дню 10»)' : 'НЕ выполнено'}.`);
      goals.push(`«Средний»: ранг 9 минимум в 40 из ${RUNS} — ${r9.length}/${RUNS} (за ${DAYS} дн.) → ${r9.length >= 40 ? 'выполнено' : 'НЕ выполнено'}; медиана дня ранга 9: ${f0(med(r9d))}.`);
    } else {
      goals.push(`«Уверенный»: ранг 9 к дню ≤ 40 — достигли ${r9.length}/${RUNS}, медиана ${f0(med(r9d))}, макс ${f0(Math.max(...r9d))}, ≤ 40 у ${r9d.filter((x) => x <= 40).length}/${RUNS} → ${r9d.filter((x) => x <= 40).length === RUNS ? 'выполнено' : 'НЕ выполнено полностью'}.`);
    }
    goals.push(`«${prof.name}»: банкротств ${over}/${RUNS}; застрявших (живы, но ранг 9 не достигнут за ${DAYS} дн.) ${stuck}/${RUNS}.`);
    summary['rank9_' + prof.id] = r9.length;
  }
  L.push('**Сверка с целями из `scripts/shop-sim.test.ts`:**', '', ...goals.map((g) => '- ' + g));
  out['04-ranks'] = L;
}

/* ---------- 5. банкротство ---------- */
{
  const L: string[] = [];
  for (const prof of PROFILES) {
    const sims = runsByProf[prof.id]!;
    const overs = sims.filter((s) => s.run.over);
    const byDay = new Map<number, number>();
    for (const s of overs) byDay.set(s.overDay, (byDay.get(s.overDay) ?? 0) + 1);
    const neg = sims.filter((s) => s.minMoney < 0).length;
    const negDays = mean(sims.map((s) => s.days.filter((x) => x.moneyEnd < 0).length));
    L.push(`**${prof.name}:** конец игры (счёт < ${DEBT_LIMIT} ₽ после аренды) в ${overs.length}/${RUNS} прогонов (${f0((overs.length / RUNS) * 100)}%). Уходили в минус хотя бы раз: ${neg}/${RUNS}; дней с отрицательным счётом на прогон: ${f1(negDays)}. Дни конца игры: ${overs.length ? [...byDay].sort((a, b) => a[0] - b[0]).map(([d, n]) => `д${d}: ${n}`).join(', ') : '—'}.`);
    if (overs.length) L.push(`В день конца игры: денег после аренды медиана ${f0(med(overs.map((s) => s.moneyOver)))} ₽, ранг ${f0(med(overs.map((s) => s.days[s.days.length - 1]!.rank)))}, купленных позиций ${f0(med(overs.map((s) => s.days[s.days.length - 1]!.owned)))}.`);
    L.push('');
  }
  /* день 1–3: сколько денег остаётся к вечеру 1-го дня и сколько нужно до аренды */
  const m1 = runsByProf['medium']!;
  L.push(`Старт: 500 ₽, аренда ранга 1 — ${rentFor(1)} ₽. Минимум счёта по прогонам (средний): ${f0(Math.min(...m1.map((s) => s.minMoney)))} ₽ (медиана ${f0(med(m1.map((s) => s.minMoney)))}); у «уверенного»: ${f0(Math.min(...runsByProf['confident']!.map((s) => s.minMoney)))} ₽.`);
  L.push('Модель покупает только если после покупки остаётся не меньше аренды следующего дня (`money − цена ≥ rentFor(rank)`), то есть «в долг» покупок в модели нет; в долг игрок уходит только из-за слабого дня. Реальное правило магазина в игре: см. ниже (проверено чтением кода).');

  /* стресс: слабый игрок (медленнее и чаще брак) и покупки без резерва на аренду (как позволяет игра: money >= cost) */
  const WEAK: Profile = { id: 'medium', name: 'слабый игрок (стресс-профиль скрипта)', speed: 1.3, q: [0.3, 0.5, 0.2] };
  L.push('', '**Стресс-проверка** (профиль не из `PROFILES`, задан в скрипте: speed 1,3; брак/норма/отлично 0,30/0,50/0,20; 120 прогонов):', '');
  const srows: string[][] = [];
  for (const [name, pol] of [['покупки с резервом на аренду (как модель)', {}], ['покупки до нуля (как позволяет игра)', { noReserve: true }]] as Array<[string, Policy]>) {
    for (const [pn, pf] of [['слабый', WEAK], ['средний', PROFILES[0]!], ['уверенный', PROFILES[1]!]] as Array<[string, Profile]>) {
      const sims = Array.from({ length: 120 }, (_, i) => simFull(i + 1, pf, DAYS, pol));
      const ov = sims.filter((x) => x.run.over);
      srows.push([name, pn, `${ov.length}/120`, ov.length ? [...new Set(ov.map((x) => x.overDay))].sort((a, b) => a - b).map((d) => `д${d}:${ov.filter((x) => x.overDay === d).length}`).join(' ') : '—', String(sims.filter((x) => x.minMoney < 0).length), f0(med(sims.map((x) => x.minMoney)))]);
    }
  }
  L.push(...md(['Политика покупок', 'Игрок', 'Конец игры', 'Дни конца игры', 'Уходили в минус', 'Мин. счёт (мед.), ₽'], srows));
  out['05-bankrupt'] = L;
}

/* ---------- 6. помощник ---------- */
{
  const L: string[] = [];
  const N = 120;
  const wageRows = [5, 6, 7, 8, 9].map((r) => [String(r), String(helperWage(r)), String(rentFor(r))]);
  L.push(...md(['Ранг', 'Зарплата/день', 'Аренда/день'], wageRows), '');
  const base: Policy = {};
  for (const prof of PROFILES) {
    const variants: Array<[string, Policy]> = [['без помощника', { noHelper: true }], ['помощник: только терпение +20% и зарплата (как в playerModel)', {}], ['помощник работает (готовит простые, 16–26 с, качество helperQuality)', { helperWork: true }]];
    const res = variants.map(([name, pol]) => {
      const sims = Array.from({ length: N }, (_, i) => simFull(i + 1, prof, DAYS, { ...base, ...pol }));
      /* сравниваем дни с 12-го по 40-й (после покупки у «помощниковых» вариантов); цель — чистый доход за день и обслуженные */
      const per = (f: (d: DayRec) => number, a: number, b: number): number => mean(sims.flatMap((s) => s.days.filter((x) => x.day >= a && x.day <= b).map(f)));
      const buy = sims.map((s) => s.helperDay).filter((x) => x > 0);
      return { name, sims, buy, net: per((x) => x.net, 14, 40), served: per((x) => x.served, 14, 40), lost: per((x) => x.lost, 14, 40), byH: per((x) => x.byHelper, 14, 40), over: sims.filter((s) => s.run.over).length, money40: med(sims.map((s) => s.run.snaps[Math.min(40, s.run.snaps.length - 1)]!.money)) };
    });
    L.push(`**${prof.name}** (${N} прогонов; дни 14–40; сравниваем одни и те же семена):`, '', ...md(['Вариант', 'Купили помощника (прогонов, мед. день)', 'Чистый ₽/день', 'Обслужено/день', 'Потеряно/день', 'Из них помощником', 'Банкротств', 'Деньги на д40 (мед.)'], res.map((r) => [r.name, `${r.buy.length}/${N} (д${r.buy.length ? f0(med(r.buy)) : '—'})`, f0(r.net), f1(r.served), f2(r.lost), f1(r.byH), String(r.over), f0(r.money40)])), '');
    const d1 = res[1]!.net - res[0]!.net, d2 = res[2]!.net - res[0]!.net;
    L.push(`Эффект к «без помощника» (₽/день, уже за вычетом зарплаты и аренды): только терпение и зарплата ${d1 >= 0 ? '+' : ''}${f0(d1)}; с работой помощника ${d2 >= 0 ? '+' : ''}${f0(d2)}. Окупаемость цены 1500 ₽ при работающем помощнике: ${d2 > 0 ? f1(1500 / d2) + ' дн.' : 'не окупается'}; в варианте «как в модели»: ${d1 > 0 ? f1(1500 / d1) + ' дн.' : 'не окупается'}.`, '');
    summary['helper_' + prof.id] = { d1, d2 };
    /* по рангам */
    const rr: string[][] = [];
    for (let r = 5; r <= 9; r++) {
      const a = res[0]!.sims.flatMap((s) => s.days.filter((x) => x.rank === r)); const b = res[2]!.sims.flatMap((s) => s.days.filter((x) => x.rank === r));
      const c = res[1]!.sims.flatMap((s) => s.days.filter((x) => x.rank === r));
      rr.push([String(r), String(helperWage(r)), a.length ? f0(mean(a.map((x) => x.net))) : '—', c.length ? f0(mean(c.map((x) => x.net))) : '—', b.length ? f0(mean(b.map((x) => x.net))) : '—', b.length ? f1(mean(b.map((x) => x.byHelper))) : '—']);
    }
    L.push(...md(['Ранг', 'Зарплата', 'Чистый без помощника', 'Чистый (как в модели)', 'Чистый с работой', 'Гостей у помощника/день'], rr), '');
  }
  out['06-helper'] = L;
}

/* ---------- 7. калибровка по реальным сменам ---------- */
{
  const L: string[] = [];
  const real = JSON.parse(readFileSync('data/real-shifts.json', 'utf8')) as Array<{ label: string; json: { profile: { speed: number; q: number[] }; served: number; lost: number; income: number; revenue: number; tips: number; costs: number; prepTime: { mean: number }; serveTime: { mean: number } } }>;
  const rows: string[][] = [];
  const cmp: string[][] = [];
  for (const r of real) {
    const m = /день (\d+), ранг (\d+)/.exec(r.label)!;
    const day = Number(m[1]), rank = Number(m[2]);
    const t = table.profiles['medium']!;
    const st = t.days[day - 1]!;
    const owned: Record<string, boolean> = {};
    for (const p of t.purchases) if (p.day <= day) owned[p.id] = true;
    const x = r.json;
    const runArm = (prof: Profile) => {
      const outs = Array.from({ length: 300 }, (_, i) => playDay({ day, rank, rating: st.rating, owned }, prof, seeded(500 + i)));
      return { served: mean(outs.map((o) => o.served)), lost: mean(outs.map((o) => o.lost)), guests: mean(outs.map((o) => o.guests)), rev: mean(outs.map((o) => o.price)) / Math.max(1e-9, mean(outs.map((o) => o.served))), tip: mean(outs.map((o) => o.tips)) / Math.max(1e-9, mean(outs.map((o) => o.served))), cost: mean(outs.map((o) => o.costs)) / Math.max(1e-9, mean(outs.map((o) => o.served))), net: mean(outs.map((o) => o.revenue - o.costs)) };
    };
    const mp = runArm(PROFILES[0]!);
    const realProf: Profile = { id: 'medium', name: 'реальный', speed: x.profile.speed, q: x.profile.q as [number, number, number] };
    const rp = runArm(realProf);
    rows.push([r.label, f2(x.profile.speed), x.profile.q.map(f2).join('/'), String(x.served), String(x.lost), f0(x.revenue / x.served), f0(x.tips / x.served), f0(x.costs / x.served), f0(x.income - x.costs)]);
    cmp.push([r.label, 'модель «Средний» (0,88; 0,10/0,50/0,40)', f1(mp.served), f1(mp.lost), f0(mp.rev), f0(mp.tip), f0(mp.cost), f0(mp.net)]);
    cmp.push([r.label, `модель с реальными speed/q (${f2(x.profile.speed)}; ${x.profile.q.map(f2).join('/')})`, f1(rp.served), f1(rp.lost), f0(rp.rev), f0(rp.tip), f0(rp.cost), f0(rp.net)]);
    cmp.push([r.label, '**реальная смена**', String(x.served), String(x.lost), f0(x.revenue / x.served), f0(x.tips / x.served), f0(x.costs / x.served), f0(x.income - x.costs)]);
    summary['real_' + day] = { model: mp, modelRealProf: rp };
  }
  L.push('Реальные смены (`data/real-shifts.json`, профиль, измеренный на смене; «выручка» без чаевых, «чистый» = выручка + чаевые − расходы, без аренды):', '', ...md(['Смена', 'speed', 'q (брак/норма/отлично)', 'Обслужено', 'Потеряно', 'Выручка/гость', 'Чаевые/гость', 'Расходы/гость', 'Чистый ₽'], rows), '');
  L.push('Сравнение с моделью в том же состоянии (день и ранг смены, оборудование и рейтинг из таблицы «Средний», 300 прогонов дня):', '', ...md(['Смена', 'Источник', 'Обслужено', 'Потеряно', 'Цена/гость', 'Чаевые/гость', 'Расходы/гость', 'Чистый ₽/день'], cmp));
  out['07-real'] = L;
}

mkdirSync('out/economy', { recursive: true });
for (const [k, v] of Object.entries(out)) writeFileSync(`out/economy/${k}.md`, v.join('\n') + '\n');
writeFileSync('out/economy/summary.json', JSON.stringify(summary, null, 1));
console.log('готово:', Object.keys(out).join(', '));
void RENT_BASE;
