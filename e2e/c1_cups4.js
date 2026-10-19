/* Кадры 29-1д (инструмент для глаз): чашки подогрева и игровая чашка в баре крупно (4×), портафильтр на мате и в группе (4×).
   Отладочная сборка. node e2e/c1_cups4.js out/c1/new5-debug.html docs/art/center/c1 r5 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c1/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'r5';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 4 }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev-nosec'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
  await p.evaluate(() => window.__sandbox.start({ day: 14, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
  await p.evaluate(() => { const d = __dbg; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); d.G.tutOff = true; d.G.hints = false; d.G.milk = true; d.applyUpgrades(); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.evaluate(() => { const c = __dbg.D.customers[0]; c.drink = 'cappuccino'; c.order.key = 'cappuccino'; c.order.id = 'cappuccino'; c.order.size = '0.2'; c.order.cold = false; c.order.food = null; __dbg.barOpen(c); });
  await p.waitForTimeout(900); await PW.dismissCard(p);
  await p.evaluate(() => document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,.say,#frontHint,#secNav,#miniMap').forEach(e => { e.style.visibility = 'hidden'; }));
  await p.evaluate(() => { const W = __dbg.WORLD, o = W.paintBar.bind(W); window.__over = {}; W.paintBar = f => o({ ...f, ...window.__over }); });
  const stage = await p.locator('#stage').boundingBox(); const k = stage.width / 1280;
  const shot = async (name, x, y, w, h) => p.screenshot({ path: `${out}/${tag}_${name}_4x.png`, timeout: 180000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
  await p.waitForTimeout(800);
  await shot('warmer', 470, 130, 210, 62);
  await shot('cup_game', 565, 395, 130, 100);
  const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(600); };
  await over({ pf: { x: 330, y: 470 }, cof: true, dose: 30 }); await shot('pf_mat', 280, 420, 200, 80);
  await over({ pf: { x: 630, y: 350 }, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } }); await shot('pf_group', 560, 310, 220, 130);
  const img = n => 'data:image/png;base64,' + fs.readFileSync(`${out}/${tag}_${n}_4x.png`).toString('base64');
  const c = await ctx.newPage(); await c.setContent(`<body style=margin:0;background:#fff8ec><div style='display:flex;align-items:flex-end;gap:24px;padding:12px'><img style='width:840px' src='${img('warmer')}'><img style='width:520px' src='${img('cup_game')}'></div>`); await c.waitForTimeout(300);
  await c.locator('div').screenshot({ path: `${out}/${tag}_compare_cups_4x.png` }); await c.close();
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
