/* 33-Д: рейтинг и застревание медленных игроков. MODE=diag — диагностика потерь по профилям и допущениям качества (шаг 1);
   MODE=variants — варианты правки и критерии (шаг 2); MODE=rent — сетка аренды после правки (шаг 4).
   Запуск: MODE=diag node scripts/spike/econ-run.mjs econ-rating → out/economy/33d-<режим>.md */
import { mkdirSync, writeFileSync } from 'node:fs';
import { RENT_BASE, rentFor } from '../../src/game/economy';
import { PROFILE_SET, median, runProfile, summarize } from './econ-profiles';
import type { Policy, Rules, Sim } from './econ-sim';
import type { Profile } from '../../src/game/playerModel';

const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const n0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');
const n2 = (x: number): string => (Number.isFinite(x) ? x.toFixed(2) : '—');
const pc = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 1000) / 10).toFixed(1) + '%' : '—');

/** Допущения качества для медленных: доля брака b, остальное нормально/идеально как 55 / 45. */
const qOf = (b: number): [number, number, number] => [b, 0.55 * (1 - b), 0.45 * (1 - b)];
const BADS = [0.05, 0.1, 0.2];
const slow = (key: string): Profile => (PROFILE_SET.find((p) => p.key === key) as { prof: Profile }).prof;
const withQ = (prof: Profile, b: number): Profile => ({ ...prof, q: qOf(b) });

const runs = (prof: Profile, days: number, rules: Rules = {}, pol: Policy = {}): Sim[] => runProfile(prof, days, { ...pol, rules });
const rankDay = (sims: Sim[], r: number): number => median(sims.map((s) => (s.run.rank.has(r) ? (s.run.rank.get(r) as number) + 1 : Infinity)));
const ratingAt = (sims: Sim[], d: number): number => median(sims.map((s) => s.run.snaps[d - 1]?.rating ?? NaN));
const rankAt = (sims: Sim[], d: number): number => median(sims.map((s) => s.run.snaps[d - 1]?.rank ?? NaN));
const dayStr = (x: number): string => (Number.isFinite(x) ? String(x) : '—');

const mode = process.env['MODE'] ?? 'diag';
const out: string[] = [];

if (mode === 'diag') {
  const rows: string[][] = [];
  const rows2: string[][] = [];
  for (const key of ['1.00', '1.20', '1.40']) for (const b of BADS) {
    const prof = withQ(slow(key), b);
    const s = runs(prof, 60), z = runs(prof, 60, { noLoss: true });
    const days = (d: number): string => `${n0(rankAt(s, d))} / ${n2(ratingAt(s, d))}`;
    const guests = s.reduce((a, x) => a + x.run.guests, 0), lost = s.reduce((a, x) => a + x.run.lost, 0);
    const recs = s.flatMap((x) => x.days.filter((d) => d.day <= 40));
    const sum = (f: (d: (typeof recs)[number]) => number[]): number[] => [0, 1, 2].map((i) => recs.reduce((a, d) => a + (f(d)[i] ?? 0), 0));
    const lp = sum((d) => d.lostPos), ll = sum((d) => d.lostLen), gl = sum((d) => d.gotLen);
    const lt = lp.reduce((a, x) => a + x, 0) || 1, gt = gl.reduce((a, x) => a + x, 0) || 1;
    const at = (a: number[], i: number): number => a[i] as number;
    rows.push([key, pc(b), days(5), days(10), days(15), days(20), days(30), days(40), pc(lost / guests), [2, 3, 4, 5].map((r) => dayStr(rankDay(s, r))).join(' / '), [2, 3, 4, 5].map((r) => dayStr(rankDay(z, r))).join(' / ')]);
    rows2.push([key, pc(b), `${pc(at(lp, 0) / lt)} / ${pc(at(lp, 1) / lt)} / ${pc(at(lp, 2) / lt)}`, `${pc(at(ll, 0) / at(gl, 0))} / ${pc(at(ll, 1) / at(gl, 1))} / ${pc(at(ll, 2) / at(gl, 2))}`, `${pc(at(gl, 0) / gt)} / ${pc(at(gl, 1) / gt)} / ${pc(at(gl, 2) / gt)}`]);
  }
  out.push('**Профили × доля брака: ранг / рейтинг (медианы) на днях, доля потерянных гостей (дни 1–60), день вступления рангов 2 / 3 / 4 / 5 как есть и без потерь (гости не уходят):**', '', ...md(['Профиль', 'Брак', 'д5', 'д10', 'д15', 'д20', 'д30', 'д40', 'Потеряно', 'Ранги 2/3/4/5, день', 'без потерь'], rows), '');
  out.push('**Где теряются гости (дни 1–40): доля потерь по месту в очереди (первый / второй / третий и дальше); доля потерянных от пришедших по длине заказа (короткий ≤ 40 с / средний ≤ 70 с / длинный); структура прихода по длине:**', '', ...md(['Профиль', 'Брак', 'Потери по месту', 'Потеряно от пришедших по длине', 'Структура прихода'], rows2));
}

/* ---- варианты ---- */
const LOSS = 0.15;
const lossFn = (hi: number, lowRank: number | null, lo: number | null, newbieK: number | null = null) => (rating: number, day: number, rank: number): number => {
  let pen = lowRank !== null && lo !== null && rank <= lowRank ? lo : hi;
  if (newbieK !== null && day <= 5) pen *= newbieK;
  return Math.max(1, rating - pen);
};
const stretch = (d: number): number => (d > 5 && d <= 8 ? 5 : d); // поддержка новичков (×1,1) продлена до 8-го дня
const THR = { 3: 2.3, 4: 2.8 };
export const VARIANTS: Array<{ id: string; text: string; rules: Rules }> = [
  { id: 'base', text: 'как сейчас', rules: {} },
  { id: 'a10', text: 'штраф 0,10 на рангах ≤ 3', rules: { loss: lossFn(LOSS, 3, 0.1) } },
  { id: 'a08', text: 'штраф 0,08 на рангах ≤ 3', rules: { loss: lossFn(LOSS, 3, 0.08) } },
  { id: 'a10all', text: 'штраф 0,10 на всех рангах', rules: { loss: lossFn(0.1, null, null) } },
  { id: 'b', text: 'штраф ×0,5 в дни 1–5', rules: { loss: lossFn(LOSS, null, null, 0.5) } },
  { id: 'c', text: 'поддержка новичков в терпении до 8-го дня', rules: { newbieDay: stretch } },
  { id: 'd', text: 'пороги рейтинга рангов 3 и 4 ниже на 0,2 (2,3 и 2,8)', rules: { rankRating: THR } },
  { id: 'a10+d', text: 'штраф 0,10 на рангах ≤ 3 + пороги 2,3 и 2,8', rules: { loss: lossFn(LOSS, 3, 0.1), rankRating: THR } },
  { id: 'a08+d', text: 'штраф 0,08 на рангах ≤ 3 + пороги', rules: { loss: lossFn(LOSS, 3, 0.08), rankRating: THR } },
  { id: 'a10+c', text: 'штраф 0,10 на рангах ≤ 3 + новички до 8-го дня', rules: { loss: lossFn(LOSS, 3, 0.1), newbieDay: stretch } },
  { id: 'c+d', text: 'новички до 8-го дня + пороги', rules: { newbieDay: stretch, rankRating: THR } },
  { id: 'a10+c+d', text: 'штраф 0,10 ≤ 3 + новички до 8-го дня + пороги', rules: { loss: lossFn(LOSS, 3, 0.1), newbieDay: stretch, rankRating: THR } },
  { id: 'a08+c+d', text: 'штраф 0,08 ≤ 3 + новички до 8-го дня + пороги', rules: { loss: lossFn(LOSS, 3, 0.08), newbieDay: stretch, rankRating: THR } }
];

interface Cell { r2: number; r3: number; r4: number; r5: number; rate20: number; over: number }
const cell = (prof: Profile, rules: Rules): Cell => {
  const s = runs(prof, 60, rules);
  return { r2: rankDay(s, 2), r3: rankDay(s, 3), r4: rankDay(s, 4), r5: rankDay(s, 5), rate20: ratingAt(s, 20), over: s.filter((x) => x.run.over).length / s.length };
};

if (mode === 'variants') {
  const fast = ['0.70', '0.88', '1.00'];
  const baseC: Record<string, Cell> = {};
  const key = (k: string, b: number | null): string => `${k}|${b}`;
  const profFor = (k: string, b: number | null): Profile => (b === null ? slow(k) : withQ(slow(k), b));
  const combos: Array<[string, number | null]> = [['0.70', null], ['0.88', null], ...BADS.map((b) => ['1.00', b] as [string, number | null]), ...BADS.map((b) => ['1.20', b] as [string, number | null]), ...BADS.map((b) => ['1.40', b] as [string, number | null])];
  for (const [k, b] of combos) baseC[key(k, b)] = cell(profFor(k, b), {});
  const only = process.env['ONLY'] ? process.env['ONLY'].split(',') : null;
  const rows: string[][] = [];
  const detail: string[][] = [];
  for (const v of VARIANTS) {
    if (only && !only.includes(v.id)) continue;
    const res: Record<string, Cell> = {};
    for (const [k, b] of combos) res[key(k, b)] = cell(profFor(k, b), v.rules);
    let c1 = true, c2 = true, c3 = true, c4 = true;
    for (const b of BADS) {
      const x = res[key('1.20', b)] as Cell, y = res[key('1.40', b)] as Cell;
      if (!(x.r4 <= 16 && x.r5 <= 30)) c1 = false;
      if (!(y.r3 <= 14 && y.r4 <= 30)) c2 = false;
    }
    for (const [k, b] of combos.filter(([k2]) => fast.includes(k2))) {
      const x = res[key(k, b)] as Cell, y = baseC[key(k, b)] as Cell;
      for (const r of ['r2', 'r3', 'r4', 'r5'] as const) if (x[r] !== y[r] && Math.abs(x[r] - y[r]) > 1) c3 = false;
      if (x.rate20 - y.rate20 > 0.1) c3 = false;
    }
    for (const [k, b] of combos) if ((res[key(k, b)] as Cell).over > (baseC[key(k, b)] as Cell).over) c4 = false;
    rows.push([v.id, v.text, c1 ? 'да' : 'нет', c2 ? 'да' : 'нет', c3 ? 'да' : 'нет', c4 ? 'да' : 'нет']);
    for (const [k, b] of combos.filter(([k2]) => ['1.20', '1.40'].includes(k2))) {
      const x = res[key(k, b)] as Cell;
      detail.push([v.id, k, b === null ? '' : pc(b), `${dayStr(x.r3)} / ${dayStr(x.r4)} / ${dayStr(x.r5)}`, n2(x.rate20), pc(x.over)]);
    }
  }
  out.push('**Критерии: 1 — 1,20: 4-й ранг к д16, 5-й к д30; 2 — 1,40: 3-й к д14, 4-й к д30 (все три допущения брака); 3 — быстрые (0,70, 0,88, 1,00 при трёх допущениях) меняются не больше чем на день, рейтинг д20 не выше более чем на 0,1; 4 — конец игры не растёт:**', '', ...md(['Вариант', 'Правка', '1', '2', '3', '4'], rows), '');
  out.push('**Детали: день вступления рангов 3 / 4 / 5 и рейтинг на 20-й день у медленных:**', '', ...md(['Вариант', 'Профиль', 'Брак', 'Ранги 3 / 4 / 5, день', 'Рейтинг д20', 'Конец игры к д60'], detail));
  out.push('', '**Базовые сроки рангов 2–5 по профилям (для критерия 3):**', '', ...md(['Профиль', 'Брак', 'Ранги 2 / 3 / 4 / 5, день', 'Рейтинг д20', 'Конец игры к д60'], combos.map(([k, b]) => { const x = baseC[key(k, b)] as Cell; return [k, b === null ? '—' : pc(b), `${dayStr(x.r2)} / ${dayStr(x.r3)} / ${dayStr(x.r4)} / ${dayStr(x.r5)}`, n2(x.rate20), pc(x.over)]; })));
}

if (mode === 'rent') {
  const rentWith = (g: number) => (rank: number): number => (rank <= 4 ? rentFor(rank) : Math.round((RENT_BASE * (1 + 0.45 * 3 + g * (rank - 4))) / 10) * 10);
  const grid = (process.env['GRID'] ?? '0.45,1.0,1.5,2.0,2.5,3.0').split(',').map(Number);
  const combos: Array<[string, number | null]> = [['0.88', null], ...BADS.map((b) => ['1.00', b] as [string, number | null]), ...BADS.map((b) => ['1.20', b] as [string, number | null]), ...BADS.map((b) => ['1.40', b] as [string, number | null])];
  const head = ['g', 'аренда р5/р7/р9'];
  const rows: string[][] = [];
  for (const g of grid) {
    const row = [String(g), [5, 7, 9].map((r) => rentWith(g)(r)).join('/')];
    for (const [k, b] of combos) {
      const prof = b === null ? slow(k) : withQ(slow(k), b);
      const sims = runs(prof, 60, { rent: rentWith(g) });
      const sm = summarize(sims, [40, 60]);
      row.push(`${pc(sm.over[40] as number)} / ${pc(sm.over[60] as number)}; ${n0(sm.money[40] as number)}`);
    }
    rows.push(row);
  }
  out.push('**Аренда после правки штрафа: конец игры к 40-му / 60-му дню; деньги на 40-й день (медиана, ₽). Профили скорости × доля брака:**', '', ...md([...head, ...combos.map(([k, b]) => (b === null ? k : `${k} / ${pc(b)}`))], rows));
}
void RENT_BASE; void summarize;
mkdirSync('out/economy', { recursive: true });
writeFileSync(`out/economy/33d-${mode}.md`, out.join('\n') + '\n');
console.log(out.join('\n'));
