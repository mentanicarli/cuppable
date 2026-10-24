// Листы приёмки 32-Г: правки crop/grey/long/wavy до и после, моргание, брови. Кадры из самой сцены (посадка, ходьба) снимает e2e/people_shot.js, склеивает e2e/tile.js.
// node scripts/spike/people-sheet-c.cjs docs/art/people/c   ("до" — коммит 9b19921 = состояние после 32-В2)
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people-c-sheets'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people-cs'); fs.mkdirSync(path.join(tmp, 'old'), { recursive: true });
const BEFORE = '9b19921';
const old = execSync(`git show ${BEFORE}:src/render/world/art.ts`, { encoding: 'utf8' }).replace(/'\.\.\/\.\.\/game\//g, "'../../../src/game/");
fs.writeFileSync(path.join(tmp, 'old', 'art_old.ts'), old);
fs.writeFileSync(path.join(tmp, 'entry.ts'), "export * as NEW from '../../src/render/world/art';\nexport * as OLD from './old/art_old';\nexport { SKIN } from '../../src/game/look';\n");
const bundle = path.join(tmp, 'c.cjs');
execSync(`npx esbuild "${path.join(tmp, 'entry.ts')}" --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const { NEW, OLD, SKIN } = require(bundle);
const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
function figInner(mod, look) {
  const p = mod.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, look.cloth, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  return cell('hairBack') + legs + shoes + cell('torso') + p.head(look.mood || 'neutral', look.blink || false, { x: 0, y: 0 }) + arms + hands;
}
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${NEW.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const fig = (mod, look, scale = 1) => svgBox(figInner(mod, look), -80, 356, 160, 264, 160 * scale, 264 * scale);
const head = (mod, look, px) => { const p = mod.personParts(look); const k = px / 61.6; const hb = (p.cells.find((c) => c.id === 'hairBack') || {}).svg || ''; return svgBox(hb + p.head(look.mood || 'neutral', look.blink || false, { x: 0, y: 0 }), -52, 380, 112, 102, 112 * k, 102 * k); };
const base = { skin: SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none', hat: '#5F7A8A' };
const L = (o) => ({ ...base, ...o });
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;align-items:flex-end;gap:8px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:90px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 11px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:200px}</style>`;
const sheets = {};
const cases = [
  ['crop', L({ hair: 'crop', hairCol: '#7A3E2B', skin: SKIN[2] })],
  ['grey', L({ hair: 'grey', hairCol: '#CFC4B4', skin: SKIN[2], age: 'senior' })],
  ['long', L({ hair: 'long', hairCol: '#7A3E2B', skin: SKIN[2], sex: 'f' })],
  ['wavy', L({ hair: 'wavy', hairCol: '#C99028', skin: SKIN[1], sex: 'f' })]
];
sheets.c1_hair_fixes = css + '<h2>C1. crop, grey, long, wavy: до (после 32-В2) и после; лицо 200 px и фигура ×1,6 (как в игре)</h2>' + cases.map(([n, look]) => `<div class="row"><div class="lab">${n}</div>${[[OLD, 'до'], [NEW, 'после']].map(([mod, t]) => `<div class="c">${head(mod, look, 200)}<small>${t}</small></div><div class="c">${fig(mod, look, 1.6)}<small>${t} ×1,6</small></div>`).join('')}</div>`).join('');
/* c3: пять кадров моргания: открыто, полузакрыто, закрыто, полузакрыто, открыто */
const faces = [L({ hair: 'sidepart', skin: SKIN[0] }), L({ hair: 'long', hairCol: '#C99028', skin: SKIN[2], sex: 'f' }), L({ hair: 'curly', hairCol: '#2E2E3A', skin: SKIN[4], sex: 'f', acc: 'glasses' })];
const BL = [[false, 'открыто'], ['half', 'полузакрыто'], [true, 'закрыто'], ['half', 'полузакрыто'], [false, 'открыто']];
sheets.c3_blink = css + '<h2>C3. Моргание: открыто → полузакрыто → закрыто → полузакрыто → открыто (0,12–0,18 с на всё моргание, доли 30 / 40 / 30 %)</h2>' + faces.map((f, i) => `<div class="row"><div class="lab">лицо ${i + 1}</div>${BL.map(([b, t]) => `<div class="c">${head(NEW, { ...f, blink: b }, 140)}<small>${t}</small></div>`).join('')}</div>`).join('');
/* c4: брови */
const ctx = [['без шапки', {}], ['в шапке (beanie)', { hair: 'beanie' }], ['в очках', { acc: 'glasses' }]];
const bfaces = [L({ hair: 'bob', hairCol: '#7A3E2B', skin: SKIN[1], sex: 'f' }), L({ hair: 'sidepart', hairCol: '#3A2A22', skin: SKIN[3] })];
sheets.c4_brows = css + '<h2>C4. Брови: neutral и happy. «было» — до 32-Г без бровей; «стало» neutral (ровные короткие, тоньше), happy (дуга, середина на 1,5 px выше). В шапке брови скрыты ободком и не рисуются</h2>' + bfaces.map((f, i) => ctx.map(([n, o]) => `<div class="row"><div class="lab">лицо ${i + 1}<br>${n}</div>${[[OLD, 'neutral', 'было neutral'], [NEW, 'neutral', 'стало neutral'], [OLD, 'happy', 'было happy'], [NEW, 'happy', 'стало happy']].map(([mod, m, t]) => `<div class="c">${head(mod, { ...f, ...o, mood: m }, 160)}<small>${t}</small></div>`).join('')}<div class="c">${head(NEW, { ...f, ...o, mood: 'happy' }, 99)}<small>happy в игровом размере (лицо 99 px)</small></div></div>`).join('')).join('');
(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: 1400, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
