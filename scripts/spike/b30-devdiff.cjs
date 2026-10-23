/* 30-1: сравнение кадров в #dev до и после (инструмент, не тест). Камера в центре — разницы быть не должно; камера на L — разница внутри секции.
   node scripts/spike/b30-devdiff.cjs out/b30/before-debug.html out/b30/after-debug.html out/b30/devdiff */
const { chromium } = require('../../e2e/node_modules/playwright'); const path = require('path'); const fs = require('fs');
const PW = require('../../e2e/pw');
const [A, B, OUT] = [process.argv[2], process.argv[3], path.resolve(process.argv[4] || 'out/b30/devdiff')]; fs.mkdirSync(OUT, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { MENUAPI: window.__MENUAPI, get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, CAM, spawn, barOpen, applyUpgrades, camGo };';
async function shoot(file, sec, name) {
  const src = fs.readFileSync(path.resolve(file), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(file).replace('.html', '.dd.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css }));
  await p.addInitScript(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await PW.sandboxStart(p, PW.url(tmp), { day: 10, profile: 'medium', sections: true });
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.applyUpgrades(); d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(900); await PW.dismissCard(p);
  await p.evaluate(() => { setInterval(() => { __dbg.D.t = 100; }, 16); document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,#frontHint,#devBtn,#devPanel,#bBack,#secNav').forEach(e => { e.style.visibility = 'hidden'; }); });
  await PW.goSection(p, sec); await p.waitForTimeout(2500);
  const f = path.join(OUT, name + '.png'); await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: f, timeout: 120000 });
  await b.close(); return f;
}
async function diff(fa, fb) {
  const b = await chromium.launch(); const p = await b.newPage();
  const r = await p.evaluate(async ([x, y]) => {
    const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let i = 0; i < da.length; i += 4) { if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) { n++; const q = i / 4, X = q % c.width, Y = (q - X) / c.width; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } }
    return { px: n, box: n ? [x0, y0, x1, y1].join(',') : '', w: c.width, h: c.height };
  }, ['data:image/png;base64,' + fs.readFileSync(fa).toString('base64'), 'data:image/png;base64,' + fs.readFileSync(fb).toString('base64')]);
  await b.close(); return r;
}
(async () => {
  for (const sec of ['C', 'L', 'R']) { const a = await shoot(A, sec, sec + '_before'), c = await shoot(B, sec, sec + '_after'); console.log(`#dev, камера ${sec}:`, JSON.stringify(await diff(a, c))); }
})();
