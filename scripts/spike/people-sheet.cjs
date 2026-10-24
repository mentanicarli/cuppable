// Листы аудита людей (32-А): сочетания причёсок и нарядов, усы, стоящие гости, головы в игровых размерах, бариста.
// node scripts/spike/people-sheet.cjs docs/art/people/a   (сид 32 — результат повторяется)
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'people.cjs');
execSync(`npx esbuild scripts/spike/people-entry.ts --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const M = require(bundle);
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry(32);

/* ---------- 1. Подсчёт комбинаций: множества значений берём выборкой из самого генератора ---------- */
const FIELDS = ['skin', 'hair', 'hairCol', 'outfit', 'cloth', 'hat', 'pants', 'shoe', 'acc', 'item', 'build', 'mustache'];
const N = 200000; const sets = {}; const freq = {};
const FEM = new Set(['bob', 'bun', 'long', 'pony']); const GREY = '#CFC4B4';
for (const t of ['regular', 'student', 'hurry']) {
  sets[t] = {}; freq[t] = { stacheOnFem: 0, greyStyleNotGrey: 0, greyColNotGreyStyle: 0, beanieSameAsCloth: 0, phonesOnBunOrBeanie: 0 };
  FIELDS.forEach((f) => (sets[t][f] = new Set()));
  for (let i = 0; i < N; i++) {
    const l = M.lookFor(t); FIELDS.forEach((f) => sets[t][f].add(String(l[f])));
    if (l.mustache && FEM.has(l.hair)) freq[t].stacheOnFem++;
    if (l.hair === 'grey' && l.hairCol !== GREY) freq[t].greyStyleNotGrey++;
    if (l.hair !== 'grey' && l.hairCol === GREY && l.hair !== 'beanie') freq[t].greyColNotGreyStyle++;
    if (l.hair === 'beanie' && l.hat === l.cloth) freq[t].beanieSameAsCloth++;
    if (l.acc === 'phones' && (l.hair === 'beanie' || l.hair === 'bun')) freq[t].phonesOnBunOrBeanie++;
  }
  Object.keys(freq[t]).forEach((k) => (freq[t][k] = +(freq[t][k] / N * 100).toFixed(2)));
}
const visKey = (l) => [l.skin, l.hair, l.hair === 'beanie' ? '' : l.hairCol, l.hair === 'beanie' ? l.hat : '', l.outfit, l.cloth, l.pants, l.shoe, l.acc, l.item, l.build, l.mustache].join('|');
const counts = {};
for (const t of ['regular', 'student', 'hurry']) {
  const S = {}; FIELDS.forEach((f) => (S[f] = [...sets[t][f]]));
  const raw = FIELDS.reduce((a, f) => a * S[f].length, 1);
  const vis = new Set(); const bad = { stacheOnFem: 0, greyMismatch: 0, beanieCloth: 0 }; let okVis = 0;
  const rec = (i, l) => {
    if (i === FIELDS.length) {
      const X = { ...l, mustache: l.mustache === 'true' };
      const k = visKey(X); if (vis.has(k)) return; vis.add(k);
      const b1 = X.mustache && FEM.has(X.hair); const b2 = (X.hair === 'grey') !== (X.hairCol === GREY) && X.hair !== 'beanie'; const b3 = X.hair === 'beanie' && X.hat === X.cloth;
      if (b1) bad.stacheOnFem++; if (b2) bad.greyMismatch++; if (b3) bad.beanieCloth++;
      if (!b1 && !b2 && !b3) okVis++;
      return;
    }
    for (const v of S[FIELDS[i]]) { l[FIELDS[i]] = v; rec(i + 1, l); }
  };
  rec(0, {});
  counts[t] = { sizes: Object.fromEntries(FIELDS.map((f) => [f, S[f].length])), raw, visual: vis.size, meaningful: okVis, bad, shareOfGuestsPct: freq[t] };
}
fs.writeFileSync(path.join(tmp, 'people-counts.json'), JSON.stringify(counts, null, 1));
console.log(JSON.stringify(counts));

/* ---------- 2. Сборка рисунков ---------- */
const lookBase = { skin: M.SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', mustache: false };
const L = (o) => ({ ...lookBase, ...o });
const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
function figInner(look, mood = 'neutral') {
  const p = M.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  const slv = look.outfit === 'suit' ? M.mix(look.cloth, '#3A1F18', 0.1) : look.cloth;
  const hb = p.cells.find((c) => c.id === 'hairBack');
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, slv, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  return (hb ? hb.svg : '') + legs + shoes + cell('torso') + p.head(mood, false, { x: 0, y: 0 }) + arms + hands;
}
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${M.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const fig = (look, scale = 1, mood) => svgBox(figInner(look, mood), -80, 356, 160, 264, 160 * scale, 264 * scale);
const bust = (look, scale = 1, mood) => svgBox(figInner(look, mood), -66, 372, 132, 190, 132 * scale, 190 * scale);
/* px — диаметр лица на экране; круг лица в единицах фигуры = 61,6 (r 28 × 1,1) */
const head = (look, px, mood = 'neutral') => {
  const p = M.personParts(look); const hb = p.cells.find((c) => c.id === 'hairBack'); const k = px / 61.6;
  return svgBox((hb ? hb.svg : '') + p.head(mood, false, { x: 0, y: 0 }), -75, 372, 150, 140, 150 * k, 140 * k);
};
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;align-items:flex-end;gap:6px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:70px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 10px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:150px}.g{display:flex;flex-wrap:wrap;gap:8px}.bad{outline:3px solid #C4283A;outline-offset:-2px;border-radius:6px}</style>`;
const HAIRS = ['short', 'grey', 'bob', 'bun', 'curly', 'beanie', 'long', 'pony'];
const OUTF = ['hoodie', 'coat', 'sweater', 'jacket', 'suit'];
const HAIRCOL = ['#3A2A22', '#7A3E2B', '#C99028', '#2E2E3A', '#A55B3A', '#CFC4B4'];
const CL = ['#C4694A', '#93A684', '#E8B04A', '#7FA3A8', '#8A5A6E', '#D98C5F', '#5F7A8A', '#B85C3F'];
const isFem = (h) => FEM.has(h);
const sheets = {};
sheets['a1_hair_x_outfit'] = css + '<h2>A1. Причёска × наряд (цвет волос, кожа и цвет одежды сдвигаются по строкам и столбцам)</h2>' + HAIRS.map((h, i) => `<div class="row"><div class="lab">${h}</div>${OUTF.map((o, j) => `<div class="c">${bust(L({ hair: h, hairCol: HAIRCOL[(i + j) % 6], outfit: o, cloth: o === 'suit' ? '#4A5568' : CL[(i * 2 + j) % 8], hat: CL[(i * 2 + j + 3) % 8], skin: M.SKIN[(i + j * 2) % 5] }), 1)}<small>${o}</small></div>`).join('')}</div>`).join('');
sheets['a2_hair_x_color_skin'] = css + '<h2>A2. Головы: причёска × цвет волос (по диагонали меняется тон кожи). Красная рамка — седой цвет не у «grey» или «grey» не седого цвета</h2>' + HAIRS.map((h, i) => `<div class="row"><div class="lab">${h}</div>${HAIRCOL.map((c, j) => `<div class="c ${(h === 'grey') !== (c === GREY) && h !== 'beanie' ? 'bad' : ''}">${head(L({ hair: h, hairCol: c, hat: '#5F7A8A', skin: M.SKIN[(i + j) % 5] }), 96)}<small>${c}</small></div>`).join('')}</div>`).join('');
sheets['a3_mustache'] = css + '<h2>A3. Усы (Look.mustache, у «regular» 15 %) на каждой причёске. Красная рамка — женские силуэты bob/bun/long/pony</h2><div class="g">' + HAIRS.map((h, i) => `<div class="c ${isFem(h) ? 'bad' : ''}">${head(L({ hair: h, hairCol: HAIRCOL[i % 6], hat: '#5F7A8A', mustache: true, skin: M.SKIN[i % 5] }), 150)}<small>${h}</small></div>`).join('') + '</div>';
let a4 = css + '<h2>A4. Гости стоя анфас (по 8 каждого типа, сид 32; масштаб 1,0; в игре ×1,6)</h2>';
for (const t of ['regular', 'student', 'hurry']) a4 += `<div class="row"><div class="lab">${t}</div>` + Array.from({ length: 8 }, () => `<div class="c">${fig(M.lookFor(t), 1.0)}</div>`).join('') + '</div>';
sheets['a4_full_standing'] = a4;
const rl = Array.from({ length: 12 }, () => M.lookFor('regular'));
sheets['a5_faces_same'] = css + '<h2>A5. Лица: 12 случайных «regular» с одной причёской (одинаковые глаза, рот, щёки, уши) и все настроения на одном госте</h2><div class="g">' + rl.map((l) => `<div class="c">${head({ ...l, hair: 'short', mustache: false }, 110)}</div>`).join('') + '</div><div class="g" style="margin-top:12px">' + ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'].map((m) => `<div class="c">${head(L({ hair: 'long', hairCol: '#7A3E2B' }), 130, m)}<small>${m}</small></div>`).join('') + '</div>';
sheets['a6_ingame_scale'] = css + '<h2>A6. Причёски на реальных размерах: диаметр лица 99 px (гость, 1280×720), 79 px (1024×600), затем 56, 46, 36, 28 px (запас; в игре таких размеров пока нет)</h2>' + HAIRS.map((h, i) => `<div class="row"><div class="lab">${h}</div>` + [99, 79, 56, 46, 36, 28].map((px) => `<div class="c">${head(L({ hair: h, hairCol: HAIRCOL[i % 6], hat: '#5F7A8A', skin: M.SKIN[(i * 2) % 5] }), px)}<small>${px}</small></div>`).join('') + '</div>').join('');
const bp = M.baristaParts();
const bar = (f) => `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="230" viewBox="780 270 170 150">${M.wrapPart(bp.body + bp.arm + bp.arm2 + bp.head(f), { x: 700, y: 230, w: 330, h: 230 })}</svg>`;
sheets['a7_barista'] = css + '<h2>A7. Бариста: пять выражений (smile, blink, joy, focus, tired); одна внешность, форма волос — шарик на макушке</h2><div class="g">' + ['smile', 'blink', 'joy', 'focus', 'tired'].map((f) => `<div class="c">${bar(f)}<small>${f}</small></div>`).join('') + '</div>';

(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: name === 'a4_full_standing' ? 1420 : 1100, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
