/* 33-Б.2: шаги buildTasks и оценка времени по напиткам; сверка с карточкой рецепта (recipeCard). Запуск: node scripts/spike/tasks-dump.mjs [id,id] */
import { DRINKS, ENGINE } from '../../src/game/menu';
import { buildTasks } from '../../src/game/recipes';
import { estimatedPrepSeconds } from '../../src/game/patience';
import { recipeCard, cardVariants } from '../../src/game/recipeCard';
import { recipeNumbers } from '../../src/game/volumes';
const only = (process.argv[2] ?? '').split(',').filter(Boolean);
for (const d of DRINKS) {
  if (only.length && !only.includes(d.id)) continue;
  if (!(d.id in ENGINE)) continue;
  for (const v of cardVariants(d)) {
    const key = ENGINE[d.id] as string;
    const r = recipeNumbers(d, v.size, v.cold);
    const tasks = buildTasks(key, { cold: v.cold, syrup: false, shots: r.shots });
    const sec = estimatedPrepSeconds({ key, cold: v.cold, shots: r.shots, syrup: null, food: null });
    let card = '';
    try { const c = recipeCard(d, v.size, v.cold) as unknown as { steps?: Array<{ label?: string; task?: string }> }; card = (c.steps ?? []).map((s) => s.task ?? s.label ?? '?').join(',') } catch (e) { card = 'ERR ' + String(e) }
    console.log(`${d.id} key=${key} ${v.size}${v.cold ? 'x' : ''} shots=${r.shots} sec=${sec} tasks=[${tasks.join(',')}] card=[${card}] book=${d.steps.map((s) => s.st).join(',')}`);
  }
}
