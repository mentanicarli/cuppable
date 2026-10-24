// Листы приёмки 32-В: причёски, борода × настроения, наушники, grey/long/curly до и после, гости в масштабе игры, hurry и senior.
// node scripts/spike/people-sheet-b.cjs docs/art/people/b   (сид 3201 — результат повторяется; в игре гость ×1,6 от исходного рисунка)
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people-b'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people-b'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'people.cjs');
execSync(`npx esbuild scripts/spike/people-entry.ts --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const M = require(bundle);
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SEED = 3201; const rng = mulberry(SEED);

const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
const wrapH = (b) => `<g transform="translate(0 458) scale(1.1) translate(0 -458)">${b}</g>`;
/* прежние рисунки grey, long, curly (до 32-В) для листа b4 */
const OLD = {
  grey: (h) => ({ b: '', f: `<path d="M-28 434Q-30 410 -20 404Q-26 420 -22 438Z" fill="${h}"/><path d="M28 434Q30 410 20 404Q26 420 22 438Z" fill="${h}"/><path d="M-20 404Q0 396 20 404Q0 408 -20 404Z" fill="${h}"/>` }),
  long: (h) => ({ b: `<path d="M-30 432Q-35 402 0 398Q35 402 30 432L35 482Q22 490 18 472L-18 472Q-22 490 -35 482Z" fill="${h}"/>`, f: `<path d="M-28 430Q-31 398 0 397Q31 398 28 430Q10 410 -9 419Q-21 421 -28 430Z" fill="${h}"/>` }),
  curly: (h) => ({ b: '', f: [[-22, 414], [-12, 402], [0, 398], [12, 402], [22, 414], [-27, 428], [27, 428]].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="11" fill="${h}"/>`).join('') })
};
const LID = '<rect x="-60" y="492" width="120" height="70" fill="#7C8C93" stroke="#4A2F25" stroke-width="3"/><rect x="-60" y="486" width="120" height="8" rx="3" fill="#A9B7BC" stroke="#4A2F25" stroke-width="3"/>';

function parts(look, old) {
  const p = M.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  let headS = p.head(look.mood || 'neutral', false, { x: 0, y: 0 }); let back = p.cells.find((c) => c.id === 'hairBack')?.svg || '';
  if (old && OLD[look.hair]) {
    const nl = M.hairLayers(look.hair, look.hairCol, look.hat || look.cloth); const ol = OLD[look.hair](look.hairCol);
    headS = headS.replace(nl.f, ol.f); back = ol.b ? wrapH(ol.b) : '';
  }
  return { p, cell, headS, back };
}
function figInner(look, o = {}) {
  const { cell, headS, back } = parts(look, o.old);
  const slv = look.outfit === 'suit' ? M.mix(look.cloth, '#3A1F18', 0.1) : look.cloth;
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, slv, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  if (o.seated) return back + cell('torso') + headS + LID;
  return back + legs + shoes + cell('torso') + headS + arms + hands;
}
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${M.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const fig = (look, scale = 1, o) => svgBox(figInner(look, o), -80, 356, 160, 264, 160 * scale, 264 * scale);
const bust = (look, scale = 1, o = {}) => svgBox(figInner(look, o), -66, 372, 132, o.seated ? 150 : 190, 132 * scale, (o.seated ? 150 : 190) * scale);
/* px — диаметр лица на экране; круг лица 61,6 единицы */
const head = (look, px, o = {}) => { const { headS, back } = parts(look, o.old); const k = px / 61.6; return svgBox(back + headS, -75, 372, 150, 140, 150 * k, 140 * k); };

const base = { skin: M.SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none', hat: '#5F7A8A' };
const L = (o) => ({ ...base, ...o });
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;align-items:flex-end;gap:6px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:76px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 11px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:170px}.g{display:flex;flex-wrap:wrap;gap:10px}.pair{display:flex;gap:2px;align-items:flex-end}</style>`;
const sheets = {};
const STYLES = ['short', 'grey', 'crop', 'sidepart', 'bob', 'bun', 'braid', 'pony', 'long', 'curly', 'wavy', 'beanie'];
const COL = { short: '#3A2A22', grey: '#CFC4B4', crop: '#2E2E3A', sidepart: '#7A3E2B', bob: '#C99028', bun: '#A55B3A', braid: '#7A3E2B', pony: '#3A2A22', long: '#2E2E3A', curly: '#A55B3A', wavy: '#C99028', beanie: '#3A2A22' };
/* b1 */
sheets.b1_hairstyles = css + '<h2>B1. Все 12 причёсок на одном лице: стоя (слева) и за ноутбуком (справа, серая крышка). Вида сбоку в игре нет: гости рисуются только анфас</h2><div class="g">' + STYLES.map((s, i) => `<div class="c"><div class="pair">${bust(L({ hair: s, hairCol: COL[s], skin: M.SKIN[2], sex: ['bob', 'bun', 'braid', 'pony', 'long'].includes(s) ? 'f' : 'm' }), 1.3)}${bust(L({ hair: s, hairCol: COL[s], skin: M.SKIN[2] }), 1.3, { seated: true })}</div><small>${s}</small></div>`).join('') + '</div>';
/* b2 */
const MOODS = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const bcols = [['чёрная', '#2E2E3A'], ['каштановая', '#7A3E2B'], ['седая', '#CFC4B4']];
sheets.b2_beard_mood = css + '<h2>B2. Борода × 6 настроений (чёрная, каштановая, седая) и усы; рот виден при любом настроении</h2>' + bcols.map(([n, c]) => `<div class="row"><div class="lab">борода ${n}</div>${MOODS.map((m) => `<div class="c">${head(L({ facial: 'beard', hairCol: c, hair: 'short', mood: m, skin: M.SKIN[1] }), 120)}<small>${m}</small></div>`).join('')}</div>`).join('') + `<div class="row"><div class="lab">усы</div>${MOODS.map((m) => `<div class="c">${head(L({ facial: 'mustache', hairCol: '#7A3E2B', hair: 'sidepart', mood: m, skin: M.SKIN[3] }), 120)}<small>${m}</small></div>`).join('')}</div>`;
/* b3 */
const HPS = ['short', 'bun', 'beanie', 'pony', 'long', 'braid', 'wavy'];
sheets.b3_headphones_matrix = css + '<h2>B3. Наушники × причёска: стоя (верх) и за ноутбуком (низ). Дужка идёт по макушке поверх волос и шапки, пучок выше дужки, чашки закрывают уши, задние волосы позади</h2>'
  + `<div class="row"><div class="lab">стоя</div>${HPS.map((s) => `<div class="c">${bust(L({ hair: s, hairCol: COL[s], acc: 'headphones', sex: ['bun', 'pony', 'long', 'braid'].includes(s) ? 'f' : 'm' }), 1.1)}<small>${s}</small></div>`).join('')}</div>`
  + `<div class="row"><div class="lab">сидя</div>${HPS.map((s) => `<div class="c">${bust(L({ hair: s, hairCol: COL[s], acc: 'headphones' }), 1.1, { seated: true })}<small>${s}</small></div>`).join('')}</div>`;
/* b4 */
sheets.b4_old_fixed = css + '<h2>B4. grey, long, curly: до (верх) и после (низ) 32-В; голова 120 px и фигура до пояса</h2>' + ['grey', 'long', 'curly'].map((s) => `<div class="row"><div class="lab">${s}</div>` + [true, false].map((old) => `<div class="c">${head(L({ hair: s, hairCol: s === 'grey' ? '#CFC4B4' : '#7A3E2B', skin: M.SKIN[2], sex: s === 'long' ? 'f' : 'm' }), 150, { old })}<small>${old ? 'до' : 'после'}</small></div><div class="c">${bust(L({ hair: s, hairCol: s === 'grey' ? '#CFC4B4' : '#7A3E2B', skin: M.SKIN[2] }), 1, { old })}<small>${old ? 'до' : 'после'}</small></div>`).join('') + '</div>').join('');
/* b5 */
const types = ['regular', 'student', 'hurry', 'regular', 'student', 'regular', 'hurry', 'student', 'regular', 'regular', 'student', 'hurry'];
const guests = types.map((t) => M.lookFor(t, rng));
sheets.b5_ingame = css + `<h2>B5. 12 гостей в масштабе игры (×1,6: фигура 256×422 px, как при 1280×720), сид ${SEED}, типы: ${types.join(', ')}</h2><div class="g">` + guests.map((l, i) => `<div class="c">${fig(l, 1.6)}<small>${types[i]} · ${l.sex}/${l.age}/${l.hair}${l.facial !== 'none' ? '/' + l.facial : ''}${l.acc === 'headphones' ? '/наушники' : ''}</small></div>`).join('') + '</div>';
/* b6 */
const man = { sex: 'm', age: 'adult', hair: 'sidepart', hairCol: '#3A2A22', skin: M.SKIN[1], build: 'mid', pants: '#3A3440', item: 'briefcase', acc: 'none' };
const hurry = [['suit', 'none'], ['suit', 'beard'], ['coat', 'none'], ['coat', 'beard']].map(([o, f]) => L({ ...man, outfit: o, cloth: o === 'suit' ? '#4A5568' : '#6B4A44', facial: f }));
const sen = [L({ sex: 'm', age: 'senior', hair: 'grey', hairCol: '#CFC4B4', facial: 'none', outfit: 'coat', cloth: '#7FA3A8' }), L({ sex: 'm', age: 'senior', hair: 'grey', hairCol: '#CFC4B4', facial: 'beard', outfit: 'sweater', cloth: '#93A684', acc: 'glasses', build: 'round' }), L({ sex: 'm', age: 'senior', hair: 'sidepart', hairCol: '#CFC4B4', facial: 'mustache', outfit: 'jacket', cloth: '#B85C3F', acc: 'glasses' }), L({ sex: 'f', age: 'senior', hair: 'bun', hairCol: '#CFC4B4', outfit: 'coat', cloth: '#8A5A6E', acc: 'scarf', build: 'round' })];
sheets.b6_hurry_senior = css + '<h2>B6. hurry: костюм и пальто, с бородой и без (верх). senior: седой «grey» с бородой и без, седой пробор с усами, седой пучок (низ)</h2><div class="g">' + hurry.map((l, i) => `<div class="c">${fig(l, 1.3)}<small>${l.outfit} ${l.facial === 'beard' ? '+ борода' : ''}</small></div>`).join('') + '</div><div class="g" style="margin-top:12px">' + sen.map((l) => `<div class="c">${fig(l, 1.3)}<small>${l.hair} ${l.facial !== 'none' ? '+ ' + l.facial : ''}</small></div>`).join('') + '</div>';

(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: name === 'b5_ingame' ? 1600 : 1200, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
