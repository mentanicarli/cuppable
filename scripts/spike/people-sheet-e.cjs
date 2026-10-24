// Листы приёмки 32-Д: лица, шея, румянец (из кода рисунка), «до» берётся из коммита fe880e0 (после 32-Г).
// Кадры из самой сцены (гости, поворот, сидящие, меню → игра) снимает e2e/people_shot.js и e2e/menu_game_shot.js, склеивает e2e/tile.js.
// node scripts/spike/people-sheet-e.cjs docs/art/people/e
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people-e-sheets'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people-es'); fs.mkdirSync(path.join(tmp, 'old'), { recursive: true });
const BEFORE = 'fe880e0';
const old = execSync(`git show ${BEFORE}:src/render/world/art.ts`, { encoding: 'utf8' }).replace(/'\.\.\/\.\.\/game\//g, "'../../../src/game/");
fs.writeFileSync(path.join(tmp, 'old', 'art_old.ts'), old);
fs.writeFileSync(path.join(tmp, 'entry.ts'), "export * as NEW from '../../src/render/world/art';\nexport * as OLD from './old/art_old';\nexport { SKIN, lookFor, DEFAULT_FACE } from '../../src/game/look';\n");
const bundle = path.join(tmp, 'e.cjs');
execSync(`npx esbuild "${path.join(tmp, 'entry.ts')}" --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const { NEW, OLD, SKIN, lookFor } = require(bundle);
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${NEW.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const LID = '<rect x="-60" y="492" width="120" height="70" fill="#7C8C93" stroke="#4A2F25" stroke-width="3"/><rect x="-60" y="486" width="120" height="8" rx="3" fill="#A9B7BC" stroke="#4A2F25" stroke-width="3"/>';
const noHair = (mod, look, svg) => { const hl = mod.hairLayers(look.hair, look.hairCol, look.hat || look.cloth); return svg.replace(hl.f, '').replace(hl.o || '\u0000', ''); };
function headSvg(mod, look, o = {}) { const p = mod.personParts(look); let h = p.head(look.mood || 'neutral', look.blink || false, { x: 0, y: 0 }); if (o.bald) h = noHair(mod, look, h); return h; }
function figInner(mod, look, o = {}) {
  const p = mod.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, look.cloth, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  if (o.seated) return cell('hairBack') + cell('torso') + headSvg(mod, look) + LID;
  return cell('hairBack') + legs + shoes + cell('torso') + headSvg(mod, look) + arms + hands;
}
const head = (mod, look, px, o) => { const k = px / 61.6; return svgBox(headSvg(mod, look, o), -52, 380, 112, 100, 112 * k, 100 * k); };
const bust = (mod, look, s, o = {}) => svgBox(figInner(mod, look, o), -66, 372, 132, o.seated ? 150 : 190, 132 * s, (o.seated ? 150 : 190) * s);
const fig = (mod, look, s) => svgBox(figInner(mod, look), -80, 356, 160, 264, 160 * s, 264 * s);
const base = { skin: SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none', hat: '#5F7A8A' };
const F = (o) => ({ shape: 'round', lashes: false, brow: 'normal', nose: 'normal', wrinkles: 0, blush: 0.1, ...o });
const L = (o) => ({ ...base, ...o });
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;align-items:flex-end;gap:8px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:90px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 11px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:200px}.g{display:flex;flex-wrap:wrap;gap:10px}</style>`;
const sheets = {};
/* e1: лица без причёски */
const faceSet = [
  ['ж · young', L({ sex: 'f', age: 'young', skin: SKIN[0], face: F({ shape: 'round', lashes: true, brow: 'thin', nose: 'small', blush: 0.6 }) }), L({ sex: 'f', age: 'young', skin: SKIN[2], face: F({ shape: 'oval', lashes: true, brow: 'normal', nose: 'small', blush: 0.7 }) })],
  ['ж · adult', L({ sex: 'f', age: 'adult', skin: SKIN[1], face: F({ shape: 'oval', lashes: true, brow: 'normal', nose: 'small', wrinkles: 1, blush: 0.4 }) }), L({ sex: 'f', age: 'adult', skin: SKIN[3], face: F({ shape: 'round', lashes: false, brow: 'thin', nose: 'normal', blush: 0.4 }) })],
  ['ж · senior', L({ sex: 'f', age: 'senior', skin: SKIN[1], face: F({ shape: 'round', lashes: false, brow: 'thin', nose: 'small', wrinkles: 2, blush: 0.1 }) }), L({ sex: 'f', age: 'senior', skin: SKIN[2], face: F({ shape: 'oval', lashes: true, brow: 'normal', nose: 'normal', wrinkles: 1, blush: 0.1 }) })],
  ['м · young', L({ sex: 'm', age: 'young', skin: SKIN[0], face: F({ shape: 'oval', brow: 'normal', nose: 'normal', blush: 0.2 }) }), L({ sex: 'm', age: 'young', skin: SKIN[3], face: F({ shape: 'square', brow: 'thick', nose: 'normal', blush: 0.2 }) })],
  ['м · adult', L({ sex: 'm', age: 'adult', skin: SKIN[1], face: F({ shape: 'square', brow: 'thick', nose: 'normal', wrinkles: 1, blush: 0.1 }) }), L({ sex: 'm', age: 'adult', skin: SKIN[2], face: F({ shape: 'oval', brow: 'normal', nose: 'small', blush: 0.1 }) })],
  ['м · senior', L({ sex: 'm', age: 'senior', skin: SKIN[1], face: F({ shape: 'square', brow: 'thick', nose: 'normal', wrinkles: 2, blush: 0.1 }) }), L({ sex: 'm', age: 'senior', skin: SKIN[2], face: F({ shape: 'oval', brow: 'normal', nose: 'small', wrinkles: 1, blush: 0.1 }) })]
];
sheets.e1_faces = css + '<h2>E1. Лица без причёски: пол × возраст; форма (round, oval, square), ресницы, брови, нос, морщины; крупно (200 px) и в масштабе игры (лицо 99 px)</h2>' + faceSet.map(([n, a, b]) => `<div class="row"><div class="lab">${n}</div>${[a, b].map((l) => `<div class="c">${head(NEW, l, 200, { bald: true })}<small>${l.face.shape}, ${l.face.lashes ? 'ресницы' : 'без ресниц'}, брови ${l.face.brow}, нос ${l.face.nose}, морщины ${l.face.wrinkles}</small></div><div class="c">${head(NEW, l, 99, { bald: true })}<small>99 px</small></div>`).join('')}<div class="c">${head(OLD, a, 200, { bald: true })}<small>до (32-Г)</small></div></div>`).join('');
/* e3: шея: пять нарядов × стоя/сидя × борода/без */
const outfits = [['hoodie', '#7FA3A8'], ['coat', '#D98C5F'], ['sweater', '#8A5A6E'], ['jacket', '#B85C3F'], ['suit', '#4A5568']];
const row = (label, mod, extra, s, o) => `<div class="row"><div class="lab">${label}</div>${outfits.map(([ou, c]) => `<div class="c">${bust(mod, L({ outfit: ou, cloth: c, age: 'adult', face: F({ shape: 'oval', nose: 'normal', blush: 0.1 }), ...extra }), s, o)}<small>${ou}</small></div>`).join('')}</div>`;
sheets.e3b_neck_closeup = css + '<h2>E3. Шея: пять нарядов × стоя и сидя, без бороды и с бородой; сверху до (32-Г), ниже после; крупно ×1,6 (игра ×1,6)</h2>'
  + row('до · стоя', OLD, {}, 1.6) + row('после · стоя', NEW, {}, 1.6) + row('после · борода', NEW, { facial: 'beard' }, 1.6) + row('после · сидя', NEW, {}, 1.6, { seated: true }) + row('после · сидя, борода', NEW, { facial: 'beard' }, 1.6, { seated: true })
  + `<div class="row"><div class="lab">шарф</div>${[['young', 'f'], ['adult', 'm'], ['senior', 'f']].map(([age, sex]) => `<div class="c">${bust(NEW, L({ outfit: 'sweater', acc: 'scarf', age, sex, face: F({ shape: 'round', blush: 0.1 }) }), 1.6)}<small>шарф закрывает шею (${age})</small></div>`).join('')}</div>`;
/* e4: румянец */
const MOODS = ['neutral', 'happy'];
const grid = [['young', 'f', 0.6], ['adult', 'f', 0.4], ['senior', 'f', 0.1], ['young', 'm', 0.2], ['adult', 'm', 0.1], ['senior', 'm', 0.1]];
const rng = mulberry(3203); const sample = Array.from({ length: 12 }, (_, i) => lookFor(['regular', 'student', 'hurry'][i % 3], rng));
sheets.e4_blush = css + '<h2>E4. Румянец: neutral и happy, у young/adult/senior, м и ж; внутри контура лица (центр не ближе 3 px от края), у старших и с бородой нет</h2>' + grid.map(([age, sex, b]) => `<div class="row"><div class="lab">${sex === 'f' ? 'ж' : 'м'} · ${age}<br>blush ${b}</div>${MOODS.map((m) => `<div class="c">${head(NEW, L({ age, sex, skin: SKIN[1], face: F({ shape: sex === 'f' ? 'round' : 'oval', lashes: sex === 'f', nose: 'small', blush: b }), mood: m }), 200, { bald: true })}<small>${m}</small></div>`).join('')}<div class="c">${head(OLD, L({ age, sex, skin: SKIN[1], mood: 'neutral' }), 200, { bald: true })}<small>до (32-Г: у всех одинаково, пятно за контуром)</small></div></div>`).join('') + '<h2 style="margin-top:12px">Выборка из 12 лиц (neutral, из генератора, сид 3203)</h2><div class="g">' + sample.map((l) => `<div class="c">${head(NEW, l, 99)}<small>${l.sex}/${l.age}/blush ${l.face.blush}</small></div>`).join('') + '</div>';
/* e5b: лицо, из-за которого в кадрах 32-Г под глазами была «странная коричневая форма»: мужчина с длинными волосами и усами (кросс-гендерные причёски убраны в 32-Д) */
const odd = L({ sex: 'm', age: 'adult', hair: 'long', hairCol: '#A55B3A', skin: SKIN[4], facial: 'mustache', outfit: 'coat', cloth: '#D98C5F', face: F({ shape: 'square', brow: 'thick', nose: 'normal', blush: 0.1 }) });
sheets.e5b_long_mustache = css + '<h2>E5b. «Странная коричневая форма под глазами» у long при ходьбе (кадр c5 из 32-Г): это не рот и не тень, а усы (facial: mustache) у мужчины с длинными волосами; в 32-Б правила допускали 15 % чужих причёсок. Крупно, до (32-Г) и в 32-Д; теперь у женщин причёски long без усов и бороды, у мужчин причёсок long нет</h2><div class="row"><div class="c">' + head(OLD, odd, 300) + '<small>до: усы цвета волос на тёмной коже читаются как коричневое пятно</small></div><div class="c">' + head(NEW, odd, 300) + '<small>32-Д (такое сочетание больше не выпадает)</small></div></div>';
(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: 1500, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
