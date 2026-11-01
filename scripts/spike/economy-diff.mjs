// 33-Б: сравнение таблиц аудита до/после (out/economy/before/*.md и out/economy/*.md). Печатает markdown для docs/design/economy.md.
import { readFileSync } from 'node:fs';
const rd = (d, f) => readFileSync(`out/economy/${d}${f}`, 'utf8').split('\n');
const rows = (lines, start) => lines.filter((l) => l.startsWith('| ')).map((l) => l.split('|').slice(1, -1).map((x) => x.trim()));
const days = [1, 5, 13, 25, 40];
const out = [];
const dayTable = (lines, which) => { const idx = lines.findIndex((l) => l.startsWith('**' + which)); const tbl = []; for (let i = idx; i < lines.length && tbl.length < 42; i++) { if (lines[i].startsWith('| ') && /^\| \d+ /.test(lines[i])) tbl.push(lines[i].split('|').slice(1, -1).map((x) => x.trim())); else if (tbl.length && !lines[i].startsWith('|')) break; } return tbl; };
for (const prof of ['средний игрок', 'уверенный игрок']) {
  const b = dayTable(rd((process.env.BEFORE ?? 'before') + '/', '03-days.md'), prof), a = dayTable(rd('', '03-days.md'), prof);
  out.push(`**${prof}** (медианы; выручка с чаевыми; «чистый» = выручка − расходы − аренда − зарплата):`, '', '| День | Выручка до → после | Расходы до → после | Чистый до → после | Ранг | Деньги до → после |', '|---|---|---|---|---|---|');
  for (const d of days) { const x = b[d - 1], y = a[d - 1]; out.push(`| ${d} | ${x[5]} → ${y[5]} | ${x[6]} → ${y[6]} | ${x[8]} → ${y[8]} | ${y[9]} | ${x[10]} → ${y[10]} |`); }
  out.push('');
}
const eq = (dir) => { const t = rd(dir, '02-equipment.md'); const res = {}; let cur = ''; for (const l of t) { if (l.startsWith('**')) cur = l.includes('средний') ? 'm' : 'c'; else if (l.startsWith('| ') && !l.startsWith('| Позиция') && !l.startsWith('|---')) { const c = l.split('|').slice(1, -1).map((x) => x.trim()); res[cur + c[0]] = c; } } return res; };
const eb = eq((process.env.BEFORE ?? 'before') + '/'), ea = eq('');
out.push('**Окупаемость позиций (прирост ₽/день ± SE → дней), до → после:**', '', '| Позиция | Цена | «Средний» | «Уверенный» |', '|---|---|---|---|');
const names = Object.keys(eb).filter((k) => k[0] === 'm').map((k) => k.slice(1));
for (const n of names) { const f = (p) => { const x = eb[p + n], y = ea[p + n]; return x && y ? `${x[5]} → ${y[5]}; ${x[7]} → ${y[7]}` : '—'; }; out.push(`| ${n} | ${eb['m' + n][1]} | ${f('m')} | ${f('c')} |`); }
console.log(out.join('\n'));
