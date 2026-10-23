/* Кадры блока 29-1 «центр бара» (инструмент для глаз, не тест): центр целиком, кофемашина в фазах, фрагмент «машина + кофемолка + темпер», зоны поверх предметов.
   Отладочная сборка. node e2e/c1_shot.js out/c1/base-debug.html docs/art/center/c1 before
   Фазы подменяют часть кадра WORLD.paintBar (позиция портафильтра, струя, пар, звонок), остальное считает игра. 1280×720 при 2× и 1024×600. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c1/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'shot';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, tickDay, barOpen, barShow, applyUpgrades, zoneClick };');
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  for (const [vp, dsf, suffix] of [[{ width: 1312, height: 752 }, 2, '2x'], [{ width: 1056, height: 632 }, 1, '1024']]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
    await p.evaluate(() => window.__sandbox.start({ day: 10, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
    await p.evaluate(() => { const d = __dbg; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; c.drink = 'espresso'; }); d.G.tutOff = true; d.G.hints = false; });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.drink = 'espresso'; c.order.key = 'espresso'; c.order.id = 'espresso'; c.order.size = '0.2'; c.order.cold = false; c.order.food = null; __dbg.barOpen(c); });
    await p.waitForTimeout(900); await PW.dismissCard(p);
    await p.evaluate(() => document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,.say,#frontHint,#secNav').forEach(e => { e.style.visibility = 'hidden'; }));
    /* подмена части кадра: window.__over = { ... } накладывается на кадр, который считает игра */
    await p.evaluate(() => { const W = __dbg.WORLD, o = W.paintBar.bind(W); window.__over = {}; W.paintBar = f => o({ ...f, ...window.__over }); });
    const stage = await p.locator('#stage').boundingBox();
    const k = stage.width / 1280;
    const shot = async (name, x, y, w, h) => p.screenshot({ path: `${out}/${tag}_${name}_${suffix}.png`, timeout: 120000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
    const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(500); };
    await p.waitForTimeout(800);
    await shot('center_rest', 0, 0, 1280, 720);
    /* фазы: кофемашина с чашкой (покой уже снят) */
    const PHASES = {
      grind: { pf: { x: 160, y: 440 }, cof: true, dose: 26, grindDeg: 40 },
      shot: { pf: { x: 630, y: 350 }, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } },
      steam: { pf: { x: 630, y: 350 }, cof: false, dose: 0, steam: true, gaugeDeg: 40 },
      serve: { pf: { x: 330, y: 470 }, cof: false, dose: 0, ready: true, bell: 0.06 }
    };
    for (const [name, o] of Object.entries(PHASES)) {
      await over(o); await p.waitForTimeout(500);
      await shot('phase_' + name, 420, 140, 520, 420);
    }
    await over({ pf: { x: 160, y: 440 }, cof: false, dose: 0 });
    await p.evaluate(() => { __dbg.BR.cup.es = 30; });
    await shot('fragment', 40, 120, 860, 410);
    /* зоны поверх предметов */
    await p.evaluate(() => { document.querySelectorAll('#bZones rect').forEach(r => { r.style.fill = 'rgba(214,69,65,.18)'; r.style.stroke = '#D64541'; r.style.strokeWidth = '2'; }); });
    await p.waitForTimeout(300);
    await shot('zones', 0, 0, 1280, 720);
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
