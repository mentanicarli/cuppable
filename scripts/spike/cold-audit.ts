/* 35-А: аудит холодных вариантов напитков «и горячий, и холодный» без холодной механики в баре.
   Запуск: node scripts/spike/econ-run.mjs cold-audit → out/economy/35a-*.md. Игру не меняет. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { DRINKS, DRINK_NEEDS, FORCED_SYRUP, drinkById } from '../../src/game/menu';
import { recipeCost } from '../../src/game/economy';
import { DRINK_TEXTS } from '../../src/game/content/generated';
import { COLD_MODEL_GROUPS, isColdModel, sizesOf } from '../../src/game/drinkModel';
import { estimatedPrepSeconds } from '../../src/game/patience';
import { TASK_ZONE, buildTasks, coldVariantOk } from '../../src/game/recipes';
import { recipeNumbers } from '../../src/game/volumes';
import type { Drink } from '../../src/game/menu';
import type { Size } from '../../src/game/types';

const ICED_KEY: Readonly<Record<string, string>> = { americano: 'icedamericano', cappuccino: 'icedcappuccino', latte: 'icedlatte' };
const md = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
const f0 = (x: number): string => (Number.isFinite(x) ? String(Math.round(x)) : '—');

/** Точный список: temp both, есть холодные размеры, нет холодной механики в баре (ни ICED, ни чай). */
export const COLD_BOOK_ONLY: Drink[] = DRINKS.filter((d) => d.temp === 'both' && d.coldSizes.length > 0 && !ICED_KEY[d.id] && !coldVariantOk(d));

const out: Record<string, string[]> = {};
const sep = (d: Drink): string => `${d.name} (${d.id})`;

/* 1. точный список и объяснение 9 / 12 */
{
  const rows = COLD_BOOK_ONLY.map((d) => {
    const sizes = sizesOf(d.id, true);
    const stepIce = sizes.some((s) => buildTasks(d.id, { cold: true, syrup: false, shots: recipeNumbers(d, s, true).shots }).includes('ice'));
    const target = sizes.some((s) => (recipeNumbers(d, s, true).ice ?? 0) > 0);
    const same = sizes.every((s) => JSON.stringify(recipeNumbers(d, s, true).parts.map((p) => [p.task, p.amount])) === JSON.stringify(recipeNumbers(d, s, false).parts.map((p) => [p.task, p.amount])));
    return [sep(d), d.family, String(d.rank), sizes.join('/'), stepIce ? 'да' : 'нет', target ? 'да' : 'нет', same ? 'да' : 'нет'];
  });
  out['35a-list'] = md(['Напиток', 'Семейство', 'Ранг', 'Холодные размеры', 'Шаг «лёд» в холодном', 'Цель льда в рецепте', 'Холодный рецепт = горячему'], rows);
}

/* 2. таблица */
{
  const rows: string[][] = [];
  for (const d of COLD_BOOK_ONLY) {
    const sizes = sizesOf(d.id, true);
    const hotPrice = (s: Size): number => d.sizes[s] ?? 0;
    const cost = (s: Size, cold: boolean): number => recipeCost(recipeNumbers(d, s, cold));
    const first = sizes[0] as Size;
    const tasksCold = buildTasks(d.id, { cold: true, syrup: !!FORCED_SYRUP[d.id], shots: recipeNumbers(d, first, true).shots });
    const tasksHot = buildTasks(d.id, { cold: false, syrup: !!FORCED_SYRUP[d.id], shots: recipeNumbers(d, first, false).shots });
    const secCold = estimatedPrepSeconds({ key: d.id, cold: true, shots: recipeNumbers(d, first, true).shots, syrup: FORCED_SYRUP[d.id] ? true : null, food: null });
    const secHot = estimatedPrepSeconds({ key: d.id, cold: false, shots: recipeNumbers(d, first, false).shots, syrup: FORCED_SYRUP[d.id] ? true : null, food: null });
    const stations = [...new Set(tasksCold.map((t) => TASK_ZONE[t] ?? t))].join(', ');
    const needs = [...(DRINK_NEEDS[d.id] ?? []), 'ice'].join(', ');
    const pm = sizes.map((s) => `${s}: ${hotPrice(s)}/${cost(s, true)}/${hotPrice(s) - cost(s, true)}`).join('; ');
    rows.push([sep(d), String(d.rank), `${hotPrice(first)}`, pm, `${tasksCold.join(' → ')}${tasksCold.join() === tasksHot.join() ? '' : ` (горячий: ${tasksHot.join(' → ')})`}`, needs, stations, isColdModel(d) ? 'да' : 'нет', (DRINK_TEXTS[d.id]?.ice.length ?? 0) > 0 ? 'да' : 'нет', `${f0(secHot)} → ${f0(secCold)}`, f0(((hotPrice(first) - cost(first, true)) / secCold) * 60)]);
  }
  out['35a-table'] = md(['Напиток', 'Ранг', 'Цена гор. (малый хол. размер)', 'Холодные: размер: цена / себестоимость / маржа', 'Шаги холодного (buildTasks)', 'Оборудование', 'Станции (зоны)', 'Модель холодного', 'Текст «Если со льдом»', 'Время гор. → хол., с', '₽/мин (маржа хол.)'], rows);
  out['35a-groups'] = [`COLD_MODEL_GROUPS = ${[...COLD_MODEL_GROUPS].join(', ')}; isColdModel по напиткам: ${COLD_BOOK_ONLY.map((d) => `${d.id}=${isColdModel(d)}`).join(', ')}`];
}

mkdirSync('out/economy', { recursive: true });
for (const [k, v] of Object.entries(out)) writeFileSync(`out/economy/${k}.md`, v.join('\n') + '\n');
console.log(COLD_BOOK_ONLY.length, 'напитков:', COLD_BOOK_ONLY.map((d) => d.id).join(', '));
for (const v of Object.values(out)) console.log(v.join('\n'), '\n');
void drinkById;
