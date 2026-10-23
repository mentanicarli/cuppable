/* Кадр блока 31-6 (инструмент для глаз): правая секция из четырёх станций (R_all_4_sink) в игре (#dev с листанием). Отладочная сборка.
   node e2e/r6_shot.js dist/artifact.html docs/art/fixes/31-6
   Состояние: G.eq_* ставится прямо, секции открывает песочница. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/sides/s1'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { MENUAPI: window.__MENUAPI, get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, CAM, spawn, barOpen, barShow, applyUpgrades, camGo, tickDay };';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.r6.html'); fs.writeFileSync(tmp, src);
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
    await p.evaluate(() => { setInterval(() => { __dbg.D.t = Math.max(__dbg.D.t, 100); }, 16); document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,#frontHint,#devBtn,#devPanel,#bBack,#secNav').forEach(e => { e.style.visibility = 'hidden'; }); });
    return { ctx, p };
  };
  const RK = ['juice', 'whipper', 'blender', 'shaker'];
  const own = (p, r) => p.evaluate(([b, RK]) => { RK.forEach(k => { __dbg.G['eq_' + k] = b.includes(k); }); __dbg.applyUpgrades(); }, [r, RK]);
  const settle = async (p, n) => { for (let i = 0; i < 80; i++) { const t = await p.evaluate(() => __dbg.WORLD.barSideTextures()); if (t >= n) break; await p.waitForTimeout(100); } await p.waitForTimeout(500); };
  const shot = async (p, name) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: `${out}/${name}.png`, timeout: 120000 }); console.log('кадр', name); };
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 1);
    await PW.goSection(p, 'R'); await own(p, RK); await settle(p, 5); await shot(p, 'R_all_4_sink');
    await ctx.close(); }
  await b.close();
  console.log(errs.length ? 'ОШИБКИ:' + String.fromCharCode(10) + errs.join(String.fromCharCode(10)) : 'NO_ERRORS');
})();
