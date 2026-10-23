/* Кадры блока 31-7 (инструмент для глаз): бар в день 1 «после» (предметы по покупкам и рангу) и «до» (питчер и полка сиропов показаны как раньше),
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
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.goto(PW.url(tmp)); await PW.startNew(p);
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; }); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(1200); await PW.dismissCard(p);
  const shot = async n => { await p.evaluate(() => { document.querySelectorAll('#bTk,#bCoach,#toast,#bFloat,#bGoal,#hud').forEach(e => { e.style.visibility = 'hidden'; }); window.scrollTo(0, 0); }); await p.waitForTimeout(500); await p.locator('#stage').screenshot({ path: `${out}/${n}.png`, timeout: 120000 }); console.log('кадр', n); };
  console.log('день', await p.evaluate(() => __dbg.G.day + ' ранг ' + __dbg.G.rank));
  await shot('s5_day1_after');
  await p.evaluate(() => { const U = { milk: false, ice: false, eq: {}, snacks: false, pastry: false, dessert: false, deli: false, micro: false, pitcher: true, syrups: true }; __dbg.WORLD.setBarUpgrades(U); });
  await shot('s5_day1_before');
  await p.evaluate(() => { const G = __dbg.G; G.rank = 2; G.milk = true; __dbg.applyUpgrades(); });
  await shot('s5_rank2_milk');
  /* 31-8Б: кофеварка куплена, колба пустая / наполовину / полная; затем молоко и сливки вместе с кофеваркой */
  await p.evaluate(() => { const G = __dbg.G; G.rank = 3; G.eq_drip = true; __dbg.applyUpgrades(); });
  await shot('s2_drip_empty');
  await p.evaluate(() => { __dbg.D.carafe.ml = 600; });
  await shot('s2_drip_half');
  await p.evaluate(() => { __dbg.D.carafe.ml = 1200; });
  await shot('s2_drip_full');
  await b.close();
  console.log(errs.length ? 'ОШИБКИ:\n' + errs.join('\n') : 'NO_ERRORS');
})();
