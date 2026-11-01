/* 33-Г: прогон набора профилей. MODE=base — таблица «профиль × метрики» на текущих правилах; MODE=rent — сетка параметров аренды.
   Запуск: MODE=base node scripts/spike/econ-run.mjs econ-grid  → out/economy/33g-<mode>.md */
import { mkdirSync, writeFileSync } from 'node:fs';
import { RENT_BASE, rentFor } from '../../src/game/economy';
import { arrivalRange } from '../../src/game/shift';
import { playDay } from './econ-sim';
import { seeded } from '../../src/game/playerModel';
import { SHOP_DEFS } from '../../src/game/playerModel';
import { PROFILE_SET, STRESS, mean, runProfile, summarize } from './econ-profiles';
import type { Summary } from './econ-profiles';
import type { Rules } from './econ-sim';

const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const pc = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 1000) / 10).toFixed(1) + '%' : '—');
const n0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');

/** Аренда с коэффициентом роста g за ранг начиная с 5-го и надбавкой s ₽ с 5-го ранга; ранги 1–4 как в игре. */
export const rentWith = (g: number, s: number) => (rank: number): number => (rank <= 4 ? rentFor(rank) : Math.round((RENT_BASE * (1 + 0.45 * 3 + g * (rank - 4)) + s) / 10) * 10);

/** Пауза между гостями: как arrivalRange до 10-го дня, дальше продолжает снижаться до 25-го дня на долю s от прежних полов (20 и 28 с). */
export const arrivalWith = (sCut: number, until = 25) => (day: number): [number, number] => {
  const [a, b] = arrivalRange(day);
  if (day <= 10 || sCut === 0) return [a, b];
  const k = Math.min(1, (day - 10) / (until - 10));
  return [20 * (1 - sCut * k), 28 * (1 - sCut * k)];
};

const mode = process.env['MODE'] ?? 'base';
const out: string[] = [];
const run = (rules: Rules, days = 40): Array<{ key: string; sm: Summary }> => PROFILE_SET.map((p) => ({ key: p.key, sm: summarize(runProfile(p.prof, days, { rules }, Number(process.env['RUNS'] ?? 60))) }));

if (mode === 'base') {
  const res = run({});
  out.push('**Профили × метрики на текущих правилах (60 прогонов, 40 дней):**', '', ...md(['Профиль', 'Деньги д10', 'д20', 'д30', 'д40', 'Конец игры к д40', 'Ранг 9, день', 'Потеряно гостей', 'Чистый д25–40, ₽/день', 'Ожидание покупки, макс/P90 дн.'], res.map(({ key, sm }) => [key, n0(sm.money[10] as number), n0(sm.money[20] as number), n0(sm.money[30] as number), n0(sm.money[40] as number), pc(sm.over[40] as number), n0(sm.rank9Day), pc(sm.lostShare), n0(sm.net2540), `${n0(sm.waitMax)} / ${n0(sm.waitP90)}`])));
}
if (mode === 'rent') {
  const base = run({});
  const baseWait = Math.max(...base.map((b) => b.sm.waitMax));
  out.push(`Базовое максимальное ожидание покупки (медианы по позициям, макс по профилям): ${baseWait} дн.`, '');
  const rows: string[][] = [];
  for (const g of [0.45, 0.8, 1.2, 1.6, 2.0, 2.5, 3.0]) for (const s of [0, 200, 400]) {
    const r = rentWith(g, s);
    const res = run({ rent: r });
    const by = Object.fromEntries(res.map((x) => [x.key, x.sm]));
    const a = (by['1.40'] as Summary).over[40] as number;
    const b = Math.max((by['1.00'] as Summary).over[40] as number, (by['1.20'] as Summary).over[40] as number);
    const c = Math.max((by['0.70'] as Summary).money[40] as number, (by['0.88'] as Summary).money[40] as number);
    const d = Math.max(...res.map((x) => x.sm.waitMax));
    const st = summarize(runProfile(STRESS.prof, 40, { rules: r })).over[40] as number;
    rows.push([String(g), String(s), `${r(5)}/${r(7)}/${r(9)}`, pc(a), pc(b), n0(c), n0(d), a <= 0.05 ? 'да' : 'нет', b <= 0.01 ? 'да' : 'нет', c <= 15000 ? 'да' : 'нет', d <= baseWait ? 'да' : 'нет', pc(st)]);
  }
  out.push(...md(['g (за ранг)', 'надбавка', 'аренда р5/р7/р9', '1,40: конец игры', '1,00–1,20: макс', '0,70–0,88: деньги д40 (макс)', 'ожидание покупки', 'а', 'б', 'в', 'г', 'запас: профиль 1,70, конец игры'], rows));
}

if (mode === 'cmp') {
  /* до/после для аренды: RENT_G, RENT_S (по умолчанию как в игре) */
  const g = Number(process.env['RENT_G'] ?? 0.45), sx = Number(process.env['RENT_S'] ?? 0);
  const rows: string[][] = [];
  for (const p of [...PROFILE_SET, STRESS]) {
    for (const [lab, rules] of [['до', { rent: rentWith(0.45, 0) }], ['после', { rent: rentWith(g, sx) }]] as Array<[string, Rules]>) {
      const sm = summarize(runProfile(p.prof, 60, { rules }), [10, 20, 30, 40, 60]);
      rows.push([p.key, lab, ...[10, 20, 30, 40, 60].map((d) => `${n0(sm.money[d] as number)} / ${pc(sm.over[d] as number)}`), n0(sm.rank9Day), `${n0(sm.waitMax)}`]);
    }
  }
  out.push(`Аренда после: g = ${g}, надбавка ${sx}; ранги 5 / 7 / 9: ${[5, 7, 9].map((r) => rentWith(g, sx)(r)).join(' / ')} (было ${[5, 7, 9].map(rentFor).join(' / ')}). Ячейка: деньги на конец дня (медиана), ₽ / доля прогонов с концом игры к этому дню.`, '', ...md(['Профиль', '', 'д10', 'д20', 'д30', 'д40', 'д60', 'Ранг 9, день', 'Ожидание покупки, макс дн.'], rows));
}

if (mode === 'arrival') {
  const base = run({});
  const rows: string[][] = [];
  for (const sCut of (process.env['CUTS'] ?? '0.1,0.2,0.3,0.4,0.5').split(',').map(Number)) {
    const res = run({ arrival: arrivalWith(sCut) });
    const dl = (k: string): number => ((res.find((x) => x.key === k) as { sm: Summary }).sm.lostShare - (base.find((x) => x.key === k) as { sm: Summary }).sm.lostShare) * 100;
    const dn = (k: string): number => (res.find((x) => x.key === k) as { sm: Summary }).sm.net2540 - (base.find((x) => x.key === k) as { sm: Summary }).sm.net2540;
    const okLost = dl('1.20') <= 3 && dl('1.40') <= 3;
    const okNet = ['0.70', '0.88', '1.00'].every((k) => dn(k) > 0);
    rows.push([String(sCut), `${(20 * (1 - sCut)).toFixed(0)}–${(28 * (1 - sCut)).toFixed(0)}`, ...['0.70', '0.88', '1.00', '1.20', '1.40'].map((k) => `${dn(k) >= 0 ? '+' : ''}${n0(dn(k))}`), ...['1.00', '1.20', '1.40'].map((k) => `${dl(k) >= 0 ? '+' : ''}${dl(k).toFixed(1)}`), okLost ? 'да' : 'нет', okNet ? 'да' : 'нет']);
  }
  out.push('**Приход гостей: продолжение ускорения с 10-го до 25-го дня (доля s от старых полов 20 и 28 с). Изменение чистого дохода д25–40, ₽/день, и потерянных гостей, п. п.:**', '', ...md(['s', 'пол к 25-му дню, с', 'Δ чистый 0,70', '0,88', '1,00', '1,20', '1,40', 'Δ потеряно 1,00', '1,20', '1,40', 'потери ≤ +3 п. п. (1,20 и 1,40)', 'доход растёт (0,70–1,00)'], rows));
}

if (mode === 'cases') {
  /* окупаемость позиций по профилям: в каждом прогоне берётся его состояние на день, когда позиция впервые доступна, и играются AB_DAYS дня с позицией и без (одни семена) */
  const AB_DAYS = 4;
  const ids = (process.env['ITEMS'] ?? 'eq_case_pastry,eq_case_dessert,eq_fridge_deli,eq_microwave,eq_whipper,eq_juice').split(',');
  const rows: string[][] = [];
  for (const id of ids) {
    const def = SHOP_DEFS.find((x) => x.id === id);
    if (!def) throw new Error('нет позиции ' + id);
    for (const p of PROFILE_SET) {
      const sims = runProfile(p.prof, 60, {}, Number(process.env['RUNS'] ?? 60));
      const diffs: number[] = [];
      for (const sm of sims) {
        const av = sm.run.avail.get(id);
        if (av === undefined) continue;
        const snap = sm.run.snaps[av];
        if (!snap) continue;
        const owned: Record<string, boolean> = {};
        for (const o of snap.owned) if (o !== id) owned[o] = true;
        const arm = (own: Record<string, boolean>): number => {
          const rng = seeded(7000 + diffs.length);
          let rating = snap.rating, net = 0;
          for (let k = 0; k < AB_DAYS; k++) { const o = playDay({ day: snap.day + k, rank: snap.rank, rating, owned: own }, p.prof, rng); rating = o.rating; net += o.revenue - o.costs; }
          return net / AB_DAYS;
        };
        diffs.push(arm({ ...owned, [id]: true }) - arm(owned));
      }
      const m = mean(diffs), se = diffs.length > 1 ? Math.sqrt(mean(diffs.map((x) => (x - m) ** 2)) / diffs.length) : NaN;
      const pay = (price: number): string => (diffs.length && m > 2 * se ? (price / m).toFixed(1) : m > 0 ? (price / m).toFixed(1) + '?' : 'никогда');
      rows.push([def.name, String(def.cost), p.key, `${diffs.length}/${process.env['RUNS'] ?? 60}`, diffs.length ? `${n0(m)} (±${n0(se)})` : '—', diffs.length ? pay(def.cost) : '—', diffs.length ? pay(Math.round(def.cost / 2)) : '—']);
    }
  }
  out.push(`**Окупаемость по профилям (${AB_DAYS} дня A/B на состоянии дня открытия каждого прогона), дней; «?» — прирост в пределах шума. Последняя колонка — при цене вдвое ниже:**`, '', ...md(['Позиция', 'Цена', 'Профиль', 'Дошли', 'Прирост ₽/день', 'Окупается, дней', 'при 50 % цены'], rows));
}
mkdirSync('out/economy', { recursive: true });
writeFileSync(`out/economy/33g-${mode}.md`, out.join('\n') + '\n');
console.log(out.join('\n'));
