/* Состояние до 35-Б (коммит 6c4fe9b): после 35-Б холодные 7 заказываются, 4 убраны, список «без механики» пуст. */
/* 35-А: влияние на экономику, если холодные варианты станут заказываемыми. Модель: при льдогенераторе гость заказывает холодный вариант
   с вероятностью coldShare (0,3 — как у чаёв), цена того же размера, шаг «лёд» в оценке времени. Игру не меняет; PROFILES не трогаются.
   Запуск: node scripts/spike/econ-run.mjs cold-econ → out/economy/35a-econ.md */
import { mkdirSync, writeFileSync } from 'node:fs';
import { EQ_IMPL } from '../../src/game/menu';
import { drinkCost } from '../../src/game/economy';
import { estimatedPrepSeconds } from '../../src/game/patience';
import { rollOrder } from '../../src/game/orders';
import { seeded } from '../../src/game/playerModel';
import { PROFILE_SET, mean, runProfile, summarize } from './econ-profiles';
import { COLD_BOOK_ONLY } from './cold-audit';
import type { Profile } from '../../src/game/playerModel';
import type { Rules } from './econ-sim';

const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const n0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');
const n1 = (x: number): string => (Number.isFinite(x) ? x.toFixed(1) : '—');
const pc = (x: number): string => (Number.isFinite(x) ? (Math.round(x * 1000) / 10).toFixed(1) + '%' : '—');

/** Рекомендация 35-А: заказываемыми делаем 7 напитков (холодное молоко без пара есть как готовый приём у холодного латте). */
export const RECOMMENDED = ['cappuccino_pumpkin', 'matcha_latte', 'matcha_coconut', 'latte_sakura', 'latte_banana', 'latte_lemon', 'latte_coconut'];
const ALL = COLD_BOOK_ONLY.map((d) => d.id);

const out: string[] = [];
const sets: Array<[string, ReadonlySet<string> | undefined]> = [['как сейчас', undefined], ['7 рекомендованных', new Set(RECOMMENDED)], ['все 11 из списка', new Set(ALL)]];

/* 1. средний заказ при полном оборудовании: время, выручка, маржа */
{
  const rows: string[][] = [];
  for (const rank of [6, 7, 9]) for (const [lab, set] of sets) {
    const rng = seeded(31 + rank), eq = Object.fromEntries(EQ_IMPL.map((e) => [e, true]));
    let n = 0, sec = 0, price = 0, cost = 0, coldN = 0;
    for (let i = 0; i < 20000; i++) {
      const o = rollOrder({ rank, day: 30, milk: true, eq }, 'regular', rng);
      if (set && set.has(o.id) && !o.cold && seeded(i + 1)() < 0.3) { o.cold = true; }
      n++; sec += estimatedPrepSeconds(o); price += o.base + (o.syrup && !o.syrupImplied ? 20 : 0); cost += drinkCost(o.key, false, { size: o.size, cold: o.cold }); if (o.cold) coldN++;
    }
    rows.push([String(rank), lab, n1(sec / n), n1(price / n), n1((price - cost) / n), pc(coldN / n)]);
  }
  out.push('**Средний заказ гостя при полном оборудовании (20 000 заказов; для холодного добавляются шаг «лёд» и цена за холодный размер как у горячего того же размера):**', '', ...md(['Ранг', 'Набор', 'Время заказа, с', 'Цена, ₽', 'Маржа, ₽', 'Холодных заказов'], rows), '');
}

/* 2. профили: сутки */
{
  const base = new Map<string, ReturnType<typeof summarize>>();
  const rows: string[][] = [];
  for (const p of PROFILE_SET.filter((x) => x.key !== '1.40')) {
    const prof: Profile = p.key === '1.00' || p.key === '1.20' ? { ...p.prof, q: [0.1, 0.495, 0.405] } : p.prof;
    for (const [lab, set] of sets) {
      const rules: Rules = set ? { coldBook: set, coldShare: 0.3 } : {};
      const sims = runProfile(prof, 40, { rules });
      const sm = summarize(sims);
      if (!set) base.set(p.key, sm);
      const b = base.get(p.key) as ReturnType<typeof summarize>;
      const d25 = sims.flatMap((s) => s.days.filter((d) => d.day >= 25 && d.day <= 40));
      rows.push([p.key, lab, n0(sm.net2540), set ? `${sm.net2540 - b.net2540 >= 0 ? '+' : ''}${n0(sm.net2540 - b.net2540)}` : '—', n1(mean(d25.map((d) => d.served))), pc(sm.lostShare), set ? `${(sm.lostShare - b.lostShare) * 100 >= 0 ? '+' : ''}${n1((sm.lostShare - b.lostShare) * 100)} п. п.` : '—', n0(sm.rank9Day), pc(sm.over[40] as number)]);
    }
  }
  out.push('**Профили (60 прогонов, 40 дней; для 1,00 и 1,20 брак 10 %):**', '', ...md(['Профиль', 'Набор', 'Чистый д25–40, ₽/день', 'Δ', 'Обслужено д25–40', 'Потеряно гостей', 'Δ потерь', 'Ранг 9, день', 'Конец игры д40'], rows));
}

mkdirSync('out/economy', { recursive: true });
writeFileSync('out/economy/35a-econ.md', out.join('\n') + '\n');
console.log(out.join('\n'));
