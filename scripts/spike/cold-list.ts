/* 35-А: точный список напитков «и горячий, и холодный» без холодной механики в баре. Запуск: node scripts/spike/econ-run.mjs cold-list */
import { DRINKS, ICED } from '../../src/game/menu';
import { variantsOf, sizesOf } from '../../src/game/drinkModel';
import { buildTasks, coldVariantOk } from '../../src/game/recipes';
import { recipeNumbers } from '../../src/game/volumes';
const ICED_KEY: Readonly<Record<string, string>> = { americano: 'icedamericano', cappuccino: 'icedcappuccino', latte: 'icedlatte' };
console.log('ICED(menu.ts)=', JSON.stringify(ICED));
const both = DRINKS.filter((d) => d.temp === 'both');
console.log('temp both:', both.length, both.map((d) => d.id).join(','));
const rows: string[] = [];
for (const d of both) {
  const hasCold = d.coldSizes.length > 0;
  const mech = !!ICED_KEY[d.id] || coldVariantOk(d);
  const sizes = sizesOf(d.id, true);
  const hasIceStep = sizes.some((s) => { const r = recipeNumbers(d, s, true); return buildTasks(d.id, { cold: true, syrup: false, shots: r.shots }).includes('ice'); });
  const iceTarget = sizes.some((s) => (recipeNumbers(d, s, true).ice ?? 0) > 0);
  rows.push(`${d.id} family=${d.family} rank=${d.rank} coldSizes=[${d.coldSizes}] variantsOf=${JSON.stringify(variantsOf(d))} mech=${mech} iceStep=${hasIceStep} iceTarget=${iceTarget}`);
}
console.log(rows.join('\n'));
