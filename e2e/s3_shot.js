/* 30-3: кадры центра бара в обычной игре: C_day_empty (без боковых покупок), C_day_all (всё куплено: плиток боковых станций нет), C_1024x600.
   node e2e/s3_shot.js out/b30/s3-debug.html docs/art/sides/s3 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const PW = require('./pw');
const OUT = path.resolve(process.argv[3] || 'out/s3'); fs.mkdirSync(OUT, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, spawn, barOpen, applyUpgrades };';
const ALL = ['milk', 'eq_ice', 'eq_cream', 'eq_case_snacks', 'eq_case_pastry', 'eq_case_dessert', 'eq_fridge_deli', 'eq_microwave', 'eq_tea', 'eq_matcha', 'eq_powders', 'eq_juice', 'eq_whipper', 'eq_foamer', 'eq_blender', 'eq_boba', 'eq_shaker'];
async function shoot(file, vp, dsf, keys, name) {
  const src = fs.readFileSync(path.resolve(file), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(file).replace('.html', '.s3.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css }));
  await p.addInitScript(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await p.goto('about:blank'); await p.goto(PW.url(tmp)); await PW.startNew(p);
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  await p.evaluate(ks => { const d = __dbg; ks.forEach(k => { d.G[k] = true; }); d.G.tutOff = true; d.G.hints = false; d.applyUpgrades(); d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); }, keys);
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(900); await PW.dismissCard(p);
  await p.evaluate(() => { setInterval(() => { __dbg.D.t = 100; }, 16); document.querySelectorAll('#bTk,#bCoach,#toast,#bFloat,#bGoal,#frontHint').forEach(e => { e.style.visibility = 'hidden'; }); });
  await p.waitForTimeout(2500); await p.evaluate(() => window.scrollTo(0, 0));
  await p.locator('#stage').screenshot({ path: path.join(OUT, name + '.png'), timeout: 120000 }); await b.close();
}
(async () => {
  const F = process.argv[2];
  await shoot(F, { width: 1312, height: 752 }, 2, [], 'C_day_empty');
  await shoot(F, { width: 1312, height: 752 }, 2, ALL, 'C_day_all');
  await shoot(F, { width: 1024, height: 600 }, 2, ALL, 'C_1024x600');
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
