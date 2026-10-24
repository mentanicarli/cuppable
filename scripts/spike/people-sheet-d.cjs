// Листы приёмки 32-В2 (естественность причёсок и бороды): до/после, все причёски, борода × настроения, гости в масштабе игры, таблица аудита Н1–Н8.
// node scripts/spike/people-sheet-d.cjs docs/art/people/d   ("до" берётся из коммита 9464e63 = состояние после 32-В; сид гостей 3202)
const { execSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const { chromium } = require('../../e2e/node_modules/playwright');
const OUT = path.resolve(process.argv[2] || 'out/people-d'); fs.mkdirSync(OUT, { recursive: true });
const tmp = path.resolve('out/people-d'); fs.mkdirSync(path.join(tmp, 'old'), { recursive: true });
const BEFORE = '9464e63';
const old = execSync(`git show ${BEFORE}:src/render/world/art.ts`, { encoding: 'utf8' }).replace(/'\.\.\/\.\.\/game\//g, "'../../../src/game/");
fs.writeFileSync(path.join(tmp, 'old', 'art_old.ts'), old);
fs.writeFileSync(path.join(tmp, 'entry.ts'), "export * as NEW from '../../src/render/world/art';\nexport * as OLD from './old/art_old';\nexport * as AUD from '../../test/helpers/hairAudit';\nexport * as GEOM from '../../test/helpers/geom';\nexport { lookFor, SKIN, HAIR_STYLES } from '../../src/game/look';\n");
const bundle = path.join(tmp, 'd.cjs');
execSync(`npx esbuild "${path.join(tmp, 'entry.ts')}" --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
const M = require(bundle); const { NEW, OLD, AUD } = M;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SEED = 3202; const rng = mulberry(SEED);

const INK = '#4A2F25';
const limb = (d, c, w) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 6}" fill="none"/><path d="${d}" stroke="${c}" stroke-width="${w}" fill="none"/>`;
function figInner(mod, look, o = {}) {
  const p = mod.personParts(look); const cell = (id) => (p.cells.find((c) => c.id === id) || {}).svg || '';
  const slv = look.outfit === 'suit' ? NEW.mix(look.cloth, '#3A1F18', 0.1) : look.cloth;
  const legs = [-11, 11].map((x) => limb(`M${x} 566L${x} 592`, look.pants || '#4F4A5A', 11)).join('');
  const shoes = [-11, 11].map((x) => `<g transform="translate(${x} 598)">${cell('shoe')}</g>`).join('');
  const arms = [-1, 1].map((sg) => limb(`M${24 * sg} 484Q${31 * sg} 512 ${28 * sg} 536`, slv, 11)).join('');
  const hands = `<g transform="translate(-28 539)">${cell('handL')}</g><g transform="translate(28 539)">${cell('handR')}</g>`;
  return cell('hairBack') + legs + shoes + cell('torso') + p.head(look.mood || 'neutral', false, { x: 0, y: 0 }) + arms + hands;
}
const svgBox = (inner, x, y, w, h, pw, ph) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}">${NEW.wrapPart(inner, { x: x - 40, y: y - 40, w: w + 80, h: h + 80 })}</svg>`;
const fig = (mod, look, scale = 1) => svgBox(figInner(mod, look), -80, 356, 160, 264, 160 * scale, 264 * scale);
/* px — диаметр лица на экране (круг лица 61,6 единицы) */
const head = (mod, look, px) => { const p = mod.personParts(look); const k = px / 61.6; const hb = (p.cells.find((c) => c.id === 'hairBack') || {}).svg || ''; return svgBox(hb + p.head(look.mood || 'neutral', false, { x: 0, y: 0 }), -52, 380, 112, 102, 112 * k, 102 * k); };

const base = { skin: M.SKIN[1], hair: 'short', hairCol: '#3A2A22', outfit: 'sweater', cloth: '#C4694A', pants: '#4F4A5A', acc: 'none', item: 'none', build: 'mid', sex: 'm', age: 'adult', facial: 'none', hat: '#5F7A8A' };
const L = (o) => ({ ...base, ...o });
const css = `<style>body{margin:0;background:#F6E9D2;padding:14px;font-family:sans-serif;color:#4A2F25}h2{margin:0 0 8px;font:800 16px sans-serif}.row{display:flex;align-items:flex-end;gap:8px;border-top:2px solid #C9B38A;padding:4px 0}.lab{width:80px;font:800 12px sans-serif}.c{display:flex;flex-direction:column;align-items:center}.c small{font:700 11px sans-serif;color:#7a5a4a;margin-top:2px;text-align:center;max-width:200px}.g{display:flex;flex-wrap:wrap;gap:10px}.card{border:2px solid #C9B38A;border-radius:8px;padding:4px 6px}.card h3{margin:0 0 2px;font:800 13px sans-serif}.pair{display:flex;gap:2px;align-items:flex-end}table{border-collapse:collapse;font:12px sans-serif}td,th{border:1px solid #C9B38A;padding:3px 7px;text-align:center}th{background:#EBD9B4}.ok{background:#CFE5B8}.bad{background:#F2B7B0}.na{color:#9a8a7a}</style>`;
const sheets = {};
/* d1: четыре случая владельца */
const cases = [
  ['long', L({ hair: 'long', hairCol: '#7A3E2B', skin: M.SKIN[2], sex: 'f' })],
  ['борода', L({ facial: 'beard', hairCol: '#2E2E3A', skin: M.SKIN[1], hair: 'sidepart' })],
  ['grey', L({ hair: 'grey', hairCol: '#CFC4B4', skin: M.SKIN[2], age: 'senior' })],
  ['curly', L({ hair: 'curly', hairCol: '#A55B3A', skin: M.SKIN[3], sex: 'f' })]
];
sheets.d1_before_after = css + '<h2>D1. Четыре случая владельца: до (состояние после 32-В) и после; лицо 200 px и фигура ×1,6 (как в игре)</h2>' + cases.map(([n, look]) => `<div class="row"><div class="lab">${n}</div>${[[OLD, 'до'], [NEW, 'после']].map(([mod, t]) => `<div class="c">${head(mod, look, 200)}<small>${t}</small></div><div class="c">${fig(mod, look, 1.6)}<small>${t} ×1,6</small></div>`).join('')}</div>`).join('');
/* d2: все 12 на трёх лицах */
const faces = [{ skin: M.SKIN[0], hairCol: '#3A2A22', sex: 'm' }, { skin: M.SKIN[2], hairCol: '#C99028', sex: 'f' }, { skin: M.SKIN[4], hairCol: '#A55B3A', sex: 'f' }];
const gray = (s, f) => (s === 'grey' ? { hairCol: '#CFC4B4', age: 'senior' } : {});
sheets.d2_all_hair = css + '<h2>D2. Все 12 причёсок на трёх лицах в игровом масштабе (лицо 99 px), ниже — крупно (лицо 200 px)</h2><div class="g">' + M.HAIR_STYLES.map((s) => `<div class="card"><h3>${s}</h3><div class="pair">${faces.map((f) => head(NEW, L({ ...f, hair: s, ...gray(s, f) }), 99)).join('')}</div></div>`).join('') + '</div><h2 style="margin-top:14px">Крупно (200 px)</h2><div class="g">' + M.HAIR_STYLES.map((s) => `<div class="c">${head(NEW, L({ ...faces[1], hair: s, ...gray(s, faces[1]) }), 200)}<small>${s}</small></div>`).join('') + '</div>';
/* d3: борода */
const MOODS = ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry'];
const bcols = [['чёрная', '#2E2E3A'], ['каштановая', '#7A3E2B'], ['седая', '#CFC4B4']];
const busts = (mod, look, s) => svgBox(figInner(mod, look), -66, 372, 132, 190, 132 * s, 190 * s);
sheets.d3_beard_mood = css + '<h2>D3. Борода × 6 настроений, усы; ниже: с очками, с наушниками, с шапкой</h2>' + bcols.map(([n, c]) => `<div class="row"><div class="lab">борода ${n}</div>${MOODS.map((m) => `<div class="c">${head(NEW, L({ facial: 'beard', hairCol: c, hair: 'short', mood: m, skin: M.SKIN[1], age: c === '#CFC4B4' ? 'senior' : 'adult' }), 120)}<small>${m}</small></div>`).join('')}</div>`).join('')
  + `<div class="row"><div class="lab">усы</div>${MOODS.map((m) => `<div class="c">${head(NEW, L({ facial: 'mustache', hairCol: '#7A3E2B', hair: 'sidepart', mood: m, skin: M.SKIN[3] }), 120)}<small>${m}</small></div>`).join('')}</div>`
  + `<div class="row"><div class="lab">в комплекте</div>${[['очки', { acc: 'glasses', hair: 'short' }], ['наушники', { acc: 'headphones', hair: 'crop' }], ['наушники, пучок', { acc: 'headphones', hair: 'bun', sex: 'm' }], ['шапка', { hair: 'beanie' }]].map(([n, o]) => `<div class="c">${busts(NEW, L({ facial: 'beard', hairCol: '#7A3E2B', skin: M.SKIN[2], ...o }), 1.3)}<small>${n}</small></div>`).join('')}</div>`;
/* d4: гости */
const types = ['regular', 'student', 'hurry', 'regular', 'student', 'regular', 'hurry', 'student', 'regular', 'regular', 'student', 'hurry'];
const guests = types.map((t) => M.lookFor(t, rng));
sheets.d4_ingame = css + `<h2>D4. 12 гостей в масштабе игры (×1,6: фигура 256×422 px), сид ${SEED}, типы: ${types.join(', ')}</h2><div class="g">` + guests.map((l, i) => `<div class="c">${fig(NEW, l, 1.6)}<small>${types[i]} · ${l.sex}/${l.age}/${l.hair}${l.facial !== 'none' ? '/' + l.facial : ''}${l.acc === 'headphones' ? '/наушники' : ''}</small></div>`).join('') + '</div>';
/* d5: таблица аудита */
const N8 = ['sidepart', 'bob', 'long', 'grey', 'curly', 'wavy'];
function audit(mod) {
  const rows = {};
  for (const s of M.HAIR_STYLES) {
    const l = mod.hairLayers(s, '#3A2A22', '#5F7A8A'); const f = l.f + l.o; const g = AUD.gaps(f); const m = AUD.mass(f); const c = AUD.curls(f);
    rows[s] = { h: AUD.hairline(l.f), holes: g.holes, crown: g.crown, strokes: m.strokes, area: m.area, side: AUD.sideEnd(f), curl: c, asym: AUD.asymmetry(f) };
  }
  return rows;
}
const A0 = audit(OLD); const A1 = audit(NEW);
const cell = (ok, txt) => `<td class="${ok === null ? 'na' : ok ? 'ok' : 'bad'}">${txt}</td>`;
const crit = (r, s) => {
  const hOk = s === 'beanie' ? null : r.h >= AUD.HAIRLINE_MIN - 0.05 && r.h <= AUD.HAIRLINE_MAX;
  return [cell(hOk, s === 'beanie' ? 'шапка' : r.h.toFixed(1)), cell(r.holes === 0 && r.crown <= 0.5, `${r.holes.toFixed(0)}/${r.crown.toFixed(0)}`), cell(r.area >= 450 && r.strokes <= 3, `${r.strokes} шт · ${r.area.toFixed(0)}`), cell(r.side >= 429, r.side.toFixed(1)), s === 'curly' ? cell(r.curl.n >= 7 && r.curl.ratio >= 1.3 && r.curl.ringStd >= 2 && r.curl.overlaps >= 4, `${r.curl.n}/${r.curl.ratio.toFixed(2)}/${r.curl.ringStd.toFixed(1)}`) : cell(null, '—'), N8.includes(s) ? cell(r.asym >= 0.04 && r.asym <= 0.25, (r.asym * 100).toFixed(1) + ' %') : cell(null, '—')].join('');
};
/* Н6: борода до и после: доли рта внутри бороды, зона рта закрыта */
function beardStat(mod) {
  const poly = M.GEOM.pathPoints(mod.BEARD_D); let inside = 0; let total = 0;
  for (const m of ['neutral', 'happy', 'joy', 'wait', 'annoyed', 'angry']) for (const p of M.GEOM.pathPoints(mod.MOUTH_PATHS[m])) { total++; if (AUD.inPoly(p, poly)) inside++; }
  let zone = 0; let zt = 0; for (let x = -14; x <= 14; x++) for (let y = 446.5; y <= 458; y++) { zt++; if (AUD.inPoly({ x, y }, poly)) zone++; }
  return { inside: inside / total, zone: zone / zt };
}
const B0 = beardStat(OLD); const B1 = beardStat(NEW);
sheets.d5_audit = css + `<h2>D5. Аудит натуральности Н1–Н8: до (32-В) и после (32-В2). Зелёное — проходит, красное — нет, серое — критерий не применяется</h2><table><tr><th rowspan=2>причёска</th><th colspan=2>Н1 линия роста (413,3–419,4)</th><th colspan=2>Н2 просветы/голая макушка, px²</th><th colspan=2>Н3 штрихи · площадь (≥450)</th><th colspan=2>Н4 край у виска (≥429)</th><th colspan=2>Н5 завитки: число/размах/разброс</th><th colspan=2>Н8 асимметрия (4–25 %)</th></tr><tr>${'<th>до</th><th>после</th>'.repeat(6)}</tr>`
  + M.HAIR_STYLES.map((s) => { const a = crit(A0[s], s).match(/<td.*?<\/td>/g); const b = crit(A1[s], s).match(/<td.*?<\/td>/g); return `<tr><th>${s}</th>${a.map((x, i) => x + b[i]).join('')}</tr>`; }).join('')
  + `</table><h2 style="margin-top:14px">Н6 борода: рот внутри бороды и зона рта закрыта (все настроения)</h2><table><tr><th></th><th>точки рта внутри бороды</th><th>зона рта (|x| ≤ 14, y 446–458) закрыта</th></tr><tr><th>до</th>${cell(B0.inside >= 1, (B0.inside * 100).toFixed(0) + ' %')}${cell(B0.zone >= 1, (B0.zone * 100).toFixed(0) + ' %')}</tr><tr><th>после</th>${cell(B1.inside >= 1, (B1.inside * 100).toFixed(0) + ' %')}${cell(B1.zone >= 1, (B1.zone * 100).toFixed(0) + ' %')}</tr></table><p style="font:12px sans-serif">Н7 (толщины контура) и крепление Н4: все причёски в допуске и до, и после, кроме отмеченного. Таблицу считает тот же код, что и тесты (test/helpers/hairAudit.ts).</p>`;
fs.writeFileSync(path.join(tmp, 'audit.json'), JSON.stringify({ before: A0, after: A1, beardBefore: B0, beardAfter: B1 }, null, 1));

(async () => {
  const b = await chromium.launch();
  for (const [name, html] of Object.entries(sheets)) {
    const p = await b.newPage({ viewport: { width: name === 'd4_ingame' ? 1600 : 1700, height: 600 }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); await p.close();
  }
  await b.close();
})();
