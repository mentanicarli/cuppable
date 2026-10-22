/* Кадры блока 30-1 (инструмент для глаз): левая секция в игре (#dev с листанием). Отладочная сборка.
   node e2e/s1_shot.js dist/artifact.html docs/art/sides/s1
   L_day_1x, L_eve_1x, L_day_2x, L_tea_only_1x, L_two_1x, L_seam_2x (стык L/C), L_1024x600. Состояние: G.eq_* ставится прямо, секции открывает песочница. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/sides/s1'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { MENUAPI: window.__MENUAPI, get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, CAM, spawn, barOpen, barShow, applyUpgrades, camGo, tickDay };';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.s1.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  const open = async (vp, dsf) => {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await PW.sandboxStart(p, PW.url(tmp), { day: 10, profile: 'medium', sections: true });
    await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
    await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.applyUpgrades(); d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(900); await PW.dismissCard(p);
    await p.evaluate(() => { setInterval(() => { __dbg.D.t = Math.max(__dbg.D.t, 100); }, 16); document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,#frontHint,#devBtn,#devPanel,#miniMap,#secNav').forEach(e => { e.style.visibility = 'hidden'; }); });
    return { ctx, p };
  };
  const own = (p, list) => p.evaluate(l => { ['tea', 'matcha', 'powders'].forEach(k => { __dbg.G['eq_' + k] = l.includes(k); }); __dbg.applyUpgrades(); }, list);
  const settle = async (p, n) => { for (let i = 0; i < 60; i++) { const t = await p.evaluate(() => __dbg.WORLD.barSideTextures()); if (t >= n) break; await p.waitForTimeout(100); } await p.waitForTimeout(400); };
  const shot = async (p, name, clip) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: `${out}/${name}.png`, timeout: 120000, ...(clip ? { clip } : {}) }); console.log('кадр', name); };
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 1);
    await PW.goSection(p, 'L'); await own(p, ['tea']); await settle(p, 2); await p.waitForTimeout(600);
    await shot(p, 'L_tea_only_1x');
    await own(p, ['tea', 'matcha']); await settle(p, 3); await shot(p, 'L_two_1x');
    await own(p, ['tea', 'matcha', 'powders']); await settle(p, 4); await shot(p, 'L_day_1x');
    await p.evaluate(() => { __dbg.D.t = 270; __dbg.tickDay(0.1); }); await p.waitForTimeout(1500); await shot(p, 'L_eve_1x');
    await ctx.close(); }
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 2);
    await PW.goSection(p, 'L'); await own(p, ['tea', 'matcha', 'powders']); await settle(p, 4); await shot(p, 'L_day_2x');
    /* стык L/C: камера на −160 — справа 160 px секции L, дальше центр */
    await p.evaluate(() => { __dbg.CAM.moving = false; __dbg.WORLD.setBarCamera(-160); }); await p.waitForTimeout(500);
    await shot(p, 'L_seam_2x', { x: 0, y: 330, width: 460, height: 340 });
    await ctx.close(); }
  { const { ctx, p } = await open({ width: 1024, height: 600 }, 1);
    await PW.goSection(p, 'L'); await own(p, ['tea', 'matcha', 'powders']); await settle(p, 4); await shot(p, 'L_1024x600');
    await ctx.close(); }
  await b.close();
  console.log(errs.length ? 'ОШИБКИ:\n' + errs.join('\n') : 'NO_ERRORS');
})();
