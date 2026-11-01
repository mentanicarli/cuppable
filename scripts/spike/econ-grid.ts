/* 33-Г: прогон набора профилей. MODE=base — таблица «профиль × метрики» на текущих правилах; MODE=rent — сетка параметров аренды.
   Запуск: MODE=base node scripts/spike/econ-run.mjs econ-grid  → out/economy/33g-<mode>.md */
import { mkdirSync, writeFileSync } from 'node:fs';
import { RENT_BASE, rentFor } from '../../src/game/economy';
import { PROFILE_SET, STRESS, runProfile, summarize } from './econ-profiles';
import type { Summary } from './econ-profiles';
import type { Rules } from './econ-sim';

const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const pc = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 1000) / 10).toFixed(1) + '%' : '—');
const n0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');

/** Аренда с коэффициентом роста g за ранг начиная с 5-го и надбавкой s ₽ с 5-го ранга; ранги 1–4 как в игре. */
export const rentWith = (g: number, s: number) => (rank: number): number => (rank <= 4 ? rentFor(rank) : Math.round((RENT_BASE * (1 + 0.45 * 3 + g * (rank - 4)) + s) / 10) * 10);

const mode = process.env['MODE'] ?? 'base';
const out: string[] = [];
const run = (rules: Rules, days = 40): Array<{ key: string; sm: Summary }> => PROFILE_SET.map((p) => ({ key: p.key, sm: summarize(runProfile(p.prof, days, { rules })) }));

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
mkdirSync('out/economy', { recursive: true });
writeFileSync(`out/economy/33g-${mode}.md`, out.join('\n') + '\n');
console.log(out.join('\n'));
