/* Кадры блока 30-2 (инструмент для глаз): обе боковые секции в игре (#dev с листанием). Отладочная сборка.
   node e2e/s2_shot.js dist/artifact.html docs/art/sides/s1
   L_day_1x, L_eve_1x, L_day_2x, L_tea_only_1x, L_two_1x, L_seam_2x (стык L/C), L_1024x600. Состояние: G.eq_* ставится прямо, секции открывает песочница. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/sides/s1'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { MENUAPI: window.__MENUAPI, get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, CAM, spawn, barOpen, barShow, applyUpgrades, camGo, tickDay };';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.s2.html'); fs.writeFileSync(tmp, src);
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
  const LK = ['tea', 'matcha', 'powders'], RK = ['juice', 'whipper', 'blender', 'boba', 'shaker'];
  const own = (p, l, r) => p.evaluate(([a, b, LK, RK]) => { LK.forEach(k => { __dbg.G['eq_' + k] = a.includes(k); }); RK.forEach(k => { __dbg.G['eq_' + k] = b.includes(k); }); __dbg.applyUpgrades(); }, [l, r, LK, RK]);
  /* секция, камера: ждём текстуры (счётчик WORLD.barSideTextures() считает только живые секции — по одной, камера на ней) */
  const settle = async (p, n) => { for (let i = 0; i < 80; i++) { const t = await p.evaluate(() => __dbg.WORLD.barSideTextures()); if (t >= n) break; await p.waitForTimeout(100); } await p.waitForTimeout(500); };
  const shot = async (p, name, clip) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: `${out}/${name}.png`, timeout: 120000, ...(clip ? { clip } : {}) }); console.log('кадр', name); };
  const seam = (p, cam, name, clip) => p.evaluate(x => { __dbg.CAM.moving = false; __dbg.WORLD.setBarCamera(x); }, cam).then(() => p.waitForTimeout(600)).then(() => shot(p, name, clip));
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 1);
    await PW.goSection(p, 'L'); await own(p, ['tea'], []); await settle(p, 2); await shot(p, 'L_tea_only_1x');
    await own(p, ['tea', 'matcha'], []); await settle(p, 3); await shot(p, 'L_two_1x');
    await own(p, LK, []); await settle(p, 4); await shot(p, 'L_all_1x');
    await p.evaluate(() => { __dbg.D.t = 270; __dbg.tickDay(0.1); }); await p.waitForTimeout(1500); await shot(p, 'L_eve_1x');
    await ctx.close(); }
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 1);
    await PW.goSection(p, 'R'); await own(p, [], ['juice']); await settle(p, 2); await shot(p, 'R_one_1x');
    await own(p, [], ['juice', 'whipper']); await settle(p, 4); await shot(p, 'R_three_1x');
    await own(p, [], RK); await settle(p, 7); await shot(p, 'R_all_1x');
    await p.evaluate(() => { __dbg.D.t = 270; __dbg.tickDay(0.1); }); await p.waitForTimeout(1500); await shot(p, 'R_eve_1x');
    await ctx.close(); }
  { const { ctx, p } = await open({ width: 1312, height: 752 }, 2);
    await own(p, LK, RK);
    await PW.goSection(p, 'L'); await settle(p, 4); await shot(p, 'L_day_2x');
    await PW.goSection(p, 'R'); await settle(p, 7); await shot(p, 'R_day_2x');
    await PW.goSection(p, 'C'); await p.waitForTimeout(400);
    /* стыки: камера −160 (L/C) и 1120 (C/R) — по 160 px соседней секции */
    await PW.goSection(p, 'L'); await settle(p, 4); await seam(p, -160, 'seam_LC_2x', { x: 0, y: 330, width: 460, height: 340 });
    await PW.goSection(p, 'R'); await settle(p, 7); await seam(p, 1120, 'seam_CR_2x', { x: 820, y: 330, width: 460, height: 340 });
    await ctx.close(); }
  { const { ctx, p } = await open({ width: 1024, height: 600 }, 1);
    await own(p, LK, RK);
    await PW.goSection(p, 'L'); await settle(p, 4); await shot(p, 'L_1024x600');
    await PW.goSection(p, 'R'); await settle(p, 7); await shot(p, 'R_1024x600');
    await ctx.close(); }
  await b.close();
  console.log(errs.length ? 'ОШИБКИ:' + String.fromCharCode(10) + errs.join(String.fromCharCode(10)) : 'NO_ERRORS');
})();
