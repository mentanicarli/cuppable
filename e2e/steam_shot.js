/* Кадры 31-9: пар у паровой трубки не заходит на кофеварку (крупный план 3×). Основа — drip_c2_shot.js. Кадры блока 31-8В: кофеварка на столешнице (центр бара, четыре комбинации покупок, уровни колбы, крупный план 2×). Основа — bar_items_shot.js. node e2e/drip_c2_shot.js dist/artifact.html docs/art/fixes/31-8v
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
  await p.evaluate(() => { const G = __dbg.G; G.rank = 3; G.milk = true; G.eq_drip = true; __dbg.applyUpgrades(); __dbg.D.carafe.ml = 1200; });
  await p.evaluate(() => { document.querySelectorAll('#bTk,#bCoach,#toast,#bFloat,#bGoal,#hud').forEach(e => { e.style.visibility = 'hidden'; }); });
  /* пар держим включённым: alpha спрайта ведёт barPaint, поэтому подставляем 0,9 после каждого кадра */
  const found = await p.evaluate(() => { const B = __dbg.WORLD.bar; const sp = B && B.steam; if (!sp) return false; const t = () => { sp.alpha = 0.9; requestAnimationFrame(t); }; t(); return true; });
  console.log('пар найден:', found);
  await p.waitForTimeout(700);
  const st = await p.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return { x: r.left, y: r.top, k: r.width / 1280 }; });
  const clip = { x: st.x + 780 * st.k, y: st.y + 380 * st.k, width: 130 * st.k, height: 120 * st.k };
  await p.screenshot({ path: path.join(out, 'p1_steam_closeup.png'), clip });
  await b.close();
  console.log(errs.length ? 'ERRORS:' + errs.join(' | ') : 'NO_ERRORS');
})();
