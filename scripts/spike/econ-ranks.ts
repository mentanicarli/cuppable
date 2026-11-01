/* 33-Г: ранги профилей набора на 20/40/60-й день (медиана) и день достижения 5-го ранга; рейтинг и «подано» на 40-й день. */
import { PROFILE_SET, median, runProfile } from './econ-profiles';
for (const p of PROFILE_SET) {
  const sims = runProfile(p.prof, 60);
  const at = (d: number) => median(sims.map((s) => (s.run.snaps[d - 1]?.rank ?? NaN)));
  const r5 = sims.map((s) => s.run.rank.get(5)).filter((x): x is number => x !== undefined).map((x) => x + 1);
  const s40 = sims.map((s) => s.run.snaps[39]).filter((x): x is NonNullable<typeof x> => !!x);
  console.log(p.key, 'ранг д20/д40/д60:', at(20), at(40), at(60), '| ранг 5 достигли', r5.length + '/60, медиана дня', median(r5), '| д40 рейтинг', median(s40.map((x) => x.rating)).toFixed(2), 'подано', median(s40.map((x) => x.served)));
}
