/* Кадры 29-1ж (инструмент для глаз): портафильтр в группе (2× и 4×), в группе под потоком кофе (чашка на месте), на плите, у кофемолки.
   Отладочная сборка. node e2e/c1_pf7.js out/c1/new7-debug.html docs/art/center/c1 r7 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c1/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'r7';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  for (const dsf of [2, 4]) {
    const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: dsf }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev-nosec'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
    await p.evaluate(() => window.__sandbox.start({ day: 14, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
    await p.evaluate(() => { const d = __dbg; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); d.G.tutOff = true; d.G.hints = false; d.G.milk = true; d.applyUpgrades(); });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.drink = 'espresso'; c.order.key = 'espresso'; c.order.id = 'espresso'; c.order.size = '0.2'; c.order.cold = false; c.order.food = null; __dbg.barOpen(c); });
    await p.waitForTimeout(900); await PW.dismissCard(p);
    await p.evaluate(() => document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,.say,#frontHint,#secNav,#miniMap').forEach(e => { e.style.visibility = 'hidden'; }));
    await p.evaluate(() => { const W = __dbg.WORLD, o = W.paintBar.bind(W); window.__over = {}; W.paintBar = f => o({ ...f, ...window.__over }); });
    const stage = await p.locator('#stage').boundingBox(); const k = stage.width / 1280;
    const shot = async (name, x, y, w, h) => p.screenshot({ path: `${out}/${tag}_${name}_${dsf}x.png`, timeout: 180000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
    const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(700); };
    await p.waitForTimeout(800);
    await over({ pf: { x: 630, y: 350 }, cof: true, dose: 30 }); await shot('pf_group', 540, 290, 240, 200);
    await over({ pf: { x: 630, y: 350 }, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } }); await shot('pf_group_stream', 540, 290, 240, 200);
    await over({ pf: { x: 330, y: 470 }, cof: true, dose: 30 }); await shot('pf_mat', 230, 400, 260, 120);
    await over({ pf: { x: 160, y: 440 }, cof: true, dose: 30 }); await shot('pf_grinder', 60, 340, 260, 160);
    if (dsf === 2) { await over({ pf: { x: 630, y: 350 }, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } }); await shot('center_stream', 0, 0, 1280, 720); }
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
