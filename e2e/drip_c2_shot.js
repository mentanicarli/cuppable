/* Кадры блока 31-8В: кофеварка на столешнице (центр бара, четыре комбинации покупок, уровни колбы, крупный план 2×). Основа — bar_items_shot.js. node e2e/drip_c2_shot.js dist/artifact.html docs/art/fixes/31-8v
   Кадры блока 31-7 (инструмент для глаз): бар в день 1 «после» (предметы по покупкам и рангу) и «до» (питчер и полка сиропов показаны как раньше),
   затем бар с купленным молоком на ранге 2. Отладочная сборка. node e2e/bar_items_shot.js dist/artifact.html docs/art/fixes/31-7 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/bi'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades, MENUAPI: window.__MENUAPI };';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(process.argv[2]).replace('.html', '.bi.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: +(process.env.DSF || 1) }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.goto(PW.url(tmp)); await PW.startNew(p);
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; }); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(1200); await PW.dismissCard(p);
  const shot = async n => { await p.evaluate(() => { document.querySelectorAll('#bTk,#bCoach,#toast,#bFloat,#bGoal,#hud').forEach(e => { e.style.visibility = 'hidden'; }); window.scrollTo(0, 0); }); await p.waitForTimeout(500); await p.locator('#stage').screenshot({ path: `${out}/${n}.png`, timeout: 120000 }); console.log('кадр', n); };
  const clip = async (n, x, y, w, h, scale) => { await p.evaluate(() => { document.querySelectorAll('#bTk,#bCoach,#toast,#bFloat,#bGoal,#hud').forEach(e => { e.style.visibility = 'hidden'; }); window.scrollTo(0, 0); }); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, n + '.png'), clip: { x, y, width: w, height: h } }); };
  const set = (milk, cream, rank) => p.evaluate(([m, c, r]) => { const G = __dbg.G; G.rank = r; G.milk = m; G.eq_cream = c; G.eq_drip = true; __dbg.applyUpgrades(); }, [milk, cream, rank]);
  await p.evaluate(() => { __dbg.D.carafe.ml = 1200; });
  await set(false, false, 3); await shot('v1_no_milk_no_cream');
  await set(true, false, 3); await shot('v2_milk');
  await set(false, true, 3); await shot('v3_cream');
  await set(true, true, 3); await shot('v4_both');
  await p.evaluate(() => { __dbg.D.carafe.ml = 0; }); await shot('v5_level_empty');
  await p.evaluate(() => { __dbg.D.carafe.ml = 300; }); await shot('v5_level_quarter');
  await p.evaluate(() => { __dbg.D.carafe.ml = 600; }); await shot('v5_level_half');
  await p.evaluate(() => { __dbg.D.carafe.ml = 900; }); await shot('v5_level_3q');
  await p.evaluate(() => { __dbg.D.carafe.ml = 1200; }); await shot('v5_level_full');
  await b.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_ERRORS');
})();
