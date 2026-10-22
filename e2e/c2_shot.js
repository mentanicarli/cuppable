/* Кадры блока 29-2 (инструмент для глаз): центр целиком (2× и 1024×600) и каждый предмет крупно (4×): темпер с матом, питчер пустой и с молоком, питчер раф под группой, звонок обычный и в момент звонка, холодильник молока, пар на шаге «Пар».
   Отладочная сборка. node e2e/c2_shot.js out/c2/new-debug.html docs/art/center/c2 r1   (для «до» собирайте старую сборку и задайте другой префикс)
   Фазы подменяют часть кадра WORLD.paintBar, остальное считает игра. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c2/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'r1';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades };');
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  const PF = { grinder: { x: 160, y: 440 }, mat: { x: 330, y: 470 }, group: { x: 630, y: 350 } };
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
    await p.waitForTimeout(800);
    if (suffix !== '4x') {
      await over({ pf: PF.grinder, cof: false, dose: 0 }); await shot('center_rest', 0, 0, 1280, 720);
      /* кадр с тем же подменённым состоянием, что в r7 (портафильтр в группе, поток): для побитового сравнения с 29-1ж */
      if (suffix === '2x') { await over({ pf: PF.group, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } }); await shot('center_stream', 0, 0, 1280, 720); }
    } else {
      await over({ pf: PF.grinder, cof: false, dose: 0 }); await shot('tamper_mat', 250, 420, 170, 120);
      await over({ pf: PF.mat, cof: true, dose: 30 }); await shot('tamper_mat_pf', 250, 420, 170, 120);
      await over({ pf: PF.grinder, cof: false, dose: 0, tamperUp: true }); await shot('tamper_up', 250, 420, 170, 120);
      await over({ pf: PF.grinder, cof: false, dose: 0, pitH: 0 }); await shot('pitcher_empty', 860, 400, 170, 150);
      await over({ pf: PF.grinder, cof: false, dose: 0, pitH: 52 }); await shot('pitcher_milk', 860, 400, 170, 150);
      await over({ pf: PF.group, cof: false, dose: 0, pitUnder: { level: 0.7 } }); await shot('pitcher_raf', 540, 300, 190, 230);
      await over({ pf: PF.grinder, cof: false, dose: 0 }); await shot('bell', 980, 460, 110, 90);
      await over({ pf: PF.grinder, cof: false, dose: 0, ready: true, bell: 0.06 }); await shot('bell_ring', 980, 460, 110, 90);
      await over({ pf: PF.grinder, cof: false, dose: 0 }); await shot('fridge_milk', 1050, 230, 220, 290);
      await over({ pf: PF.group, cof: false, dose: 0, steam: true, gaugeDeg: 40, pitH: 52 }); await shot('steam_phase', 700, 330, 340, 230);
      await over({ pf: PF.group, cof: false, dose: 0, steam: false, gaugeDeg: -30 }); await shot('steam_off', 700, 330, 340, 230);
    }
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
