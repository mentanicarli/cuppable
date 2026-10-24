// Листы для работы над 32-Е (форма лица, морщины, ступени бороды, наряды по полу). Кадры приёмки из сцены снимает e2e/people_shot.js.
// node scripts/spike/people-sheet-f.cjs out/people-f   ("до" — сборка fe880e0..209dc6a: коммит 209dc6a = после 32-Д)
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people-f'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people-fs'); fs.mkdirSync(path.join(tmp, 'old'), { recursive: true });
const BEFORE = '209dc6a';
const old = execSync(`git show ${BEFORE}:src/render/world/art.ts`, { encoding: 'utf8' }).replace(/'\.\.\/\.\.\/game\//g, "'../../../src/game/");
fs.writeFileSync(path.join(tmp, 'old', 'art_old.ts'), old);
fs.writeFileSync(path.join(tmp, 'entry.ts'), "export * as NEW from '../../src/render/world/art';\nexport * as OLD from './old/art_old';\nexport { SKIN, lookFor } from '../../src/game/look';\n");
const bundle = path.join(tmp, 'f.cjs');
execSync(`npx esbuild "${path.join(tmp, 'entry.ts')}" --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const { NEW, OLD, SKIN } = require(bundle);
const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${NEW.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const headS = (mod, look, view = 0) => mod.personParts(look).head(look.mood || 'neutral', false, { x: 0, y: 0 }, view);
const head = (mod, look, px, view = 0) => { const p = mod.personParts(look); const k = px / 61.6; const hb = (p.cells.find((c) => c.id === 'hairBack') || {}).svg || ''; return svgBox(hb + headS(mod, look, view), -52, 380, 112, 100, 112 * k, 100 * k); };
function figInner(mod, look) {
  const p = mod.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  const slv = look.outfit === 'vest' ? '#FBF4E8' : look.cloth;
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, slv, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  return cell('hairBack') + legs + shoes + cell('torso') + headS(mod, look) + arms + hands;
}
const fig = (mod, look, s) => svgBox(figInner(mod, look), -80, 356, 160, 264, 160 * s, 264 * s);
const base = { skin: SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'coat', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none', hat: '#5F7A8A' };
const F = (o) => ({ shape: 'round', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1, ...o });
const L = (o) => ({ ...base, ...o });
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:90px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 11px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:200px}</style>`;
const sheets = {};
/* форма лица */
sheets.f_shapes = css + '<h2>Формы лица: м и ж, round / oval / square; 200 px и 99 px (до — 209dc6a)</h2>' + [['м', 'm'], ['ж', 'f']].map(([n, sex]) => `<div class="row"><div class="lab">${n}</div>${['round', 'oval', 'square'].map((shape) => { const l = L({ sex, hair: sex === 'f' ? 'bob' : 'short', hairCol: '#7A3E2B', skin: SKIN[2], face: F({ shape, lashes: sex === 'f', brow: sex === 'f' ? 'thin' : 'thick', nose: sex === 'f' ? 'small' : 'normal' }) }); return `<div class="c">${head(NEW, l, 200)}<small>${shape}</small></div><div class="c">${head(NEW, l, 99)}<small>99 px</small></div><div class="c">${head(OLD, l, 99)}<small>до 99 px</small></div>`; }).join('')}</div>`).join('');
/* морщины */
sheets.f_wrinkles = css + '<h2>Морщины: young / adult / senior, м и ж; 200 px и 99 px; до (справа)</h2>' + [['м', 'm'], ['ж', 'f']].map(([n, sex]) => `<div class="row"><div class="lab">${n}</div>${[['young', 0], ['adult', 1], ['senior', 1], ['senior', 2]].map(([age, wr]) => { const l = L({ sex, age, hair: age === 'senior' ? 'grey' : sex === 'f' ? 'bob' : 'short', hairCol: age === 'senior' ? '#CFC4B4' : '#7A3E2B', skin: SKIN[1], face: F({ shape: sex === 'f' ? 'oval' : 'square', lashes: sex === 'f', brow: sex === 'f' ? 'thin' : 'thick', nose: sex === 'f' ? 'small' : 'normal', wrinkles: wr, blush: 0.2 }) }); return `<div class="c">${head(NEW, l, 200)}<small>${age} ${wr}</small></div><div class="c">${head(NEW, l, 99)}<small>99 px</small></div><div class="c">${head(OLD, l, 99)}<small>до</small></div>`; }).join('')}</div>`).join('');
/* ступени бороды */
const STAGES = ['none', 'stubble', 'short', 'mustache', 'beard'];
sheets.f_beards = css + '<h2>Растительность: нет, щетина, короткая борода, усы, полная; анфас, вправо, влево; тёмная и седая (200 px)</h2>' + [['#3A2A22', 'adult'], ['#CFC4B4', 'senior']].map(([col, age]) => `<div class="row"><div class="lab">${age}</div>${STAGES.map((st) => { const l = L({ facial: st, age, hairCol: col, hair: age === 'senior' ? 'grey' : 'short', skin: SKIN[2], face: F({ shape: 'square', brow: 'thick', wrinkles: age === 'senior' ? 1 : 0 }) }); return `<div class="c">${head(NEW, l, 170)}<small>${st}</small></div><div class="c">${head(NEW, l, 170, 1)}<small>вправо</small></div><div class="c">${head(NEW, l, 170, -1)}<small>влево</small></div>`; }).join('')}</div>`).join('');
/* наряды */
const OUTM = [['coat', '#7FA3A8'], ['jacket', '#B85C3F'], ['vest', '#5F7A8A'], ['suit', '#4A5568'], ['hoodie', '#E8B04A']];
const OUTF = [['dress', '#8A5A6E'], ['cardigan', '#93A684'], ['blouse', '#C4694A'], ['beltcoat', '#D98C5F'], ['sweaterdress', '#7FA3A8'], ['hoodie', '#E8B04A']];
sheets.f_outfits = css + '<h2>Наряды: мужские и женские (×1,6), хуже всего — слева направо: coat, jacket, vest, suit, hoodie / dress, cardigan, blouse, beltcoat, sweaterdress, hoodie</h2><div class="row"><div class="lab">м</div>' + OUTM.map(([o, c]) => `<div class="c">${fig(NEW, L({ outfit: o, cloth: c, sex: 'm', hair: 'sidepart', hairCol: '#3A2A22', pants: '#4F4A5A', face: F({ shape: 'square', brow: 'thick' }) }), 1.2)}<small>${o}</small></div>`).join('') + '</div><div class="row"><div class="lab">ж</div>' + OUTF.map(([o, c]) => `<div class="c">${fig(NEW, L({ outfit: o, cloth: c, sex: 'f', hair: 'bob', hairCol: '#7A3E2B', pants: '#3A3440', shoe: '#3A2A22', earrings: true, face: F({ shape: 'oval', lashes: true, brow: 'thin', nose: 'small' }) }), 1.2)}<small>${o}</small></div>`).join('') + '</div>';
(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: 1500, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
