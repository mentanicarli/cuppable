/* Кадры блока 29-3 (инструмент для глаз): центр с молоком и без (2× и 1024×600), питчер на разных уровнях и у рафа под группой (4×), полка с бутылками, вывеска, доска, растение с кружками (4×), шов края полки у холодильника.
   Отладочная сборка. node e2e/c3_shot.js out/c3/new-debug.html docs/art/center/c3 c3 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c3/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'c3';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades };');
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  const PF = { grinder: { x: 160, y: 440 }, group: { x: 630, y: 350 } };
  for (const [vp, dsf, suffix] of [[{ width: 1312, height: 752 }, 2, '2x'], [{ width: 1056, height: 632 }, 1, '1024'], [{ width: 1312, height: 752 }, 4, '4x']]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
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
    const shot = async (name, x, y, w, h) => p.screenshot({ path: `${out}/${tag}_${name}_${suffix}.png`, timeout: 180000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
    const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(700); };
    const milk = async (on) => { await p.evaluate((on) => { __dbg.G.milk = on; __dbg.applyUpgrades(); }, on); await p.waitForTimeout(700); };
    await p.waitForTimeout(800);
    if (suffix !== '4x') {
      await over({ pf: PF.grinder, cof: false, dose: 0, pitH: 40 });
      await shot('center_milk', 0, 0, 1280, 720);
      await milk(false); await shot('center_nomilk', 0, 0, 1280, 720); await milk(true);
    } else {
      await over({ pf: PF.grinder, cof: false, dose: 0 });
      for (const [name, h] of [['empty', 0], ['low', 18], ['mid', 40], ['full', 74]]) { await over({ pf: PF.grinder, cof: false, dose: 0, pitH: h }); await shot('pitcher_' + name, 860, 410, 170, 140); }
      for (const [name, lv] of [['low', 0.15], ['mid', 0.55], ['full', 1]]) { await over({ pf: PF.group, cof: false, dose: 0, pitUnder: { level: lv } }); await shot('pitcher_raf_' + name, 540, 380, 190, 150); }
      await over({ pf: PF.grinder, cof: false, dose: 0 });
      await shot('syrup_shelf', 850, 160, 240, 180);
      await shot('sign', 910, 36, 300, 140);
      await shot('board', 226, 74, 216, 152);
      await milk(false); await shot('plant_mugs', 1100, 248, 160, 120); await shot('shelf_seam_nomilk', 1030, 280, 70, 50); await milk(true); await shot('shelf_seam_milk', 1030, 280, 70, 50);
    }
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
