/* Окно «Налить слоями»: кадры начала, середины и конца налива верхнего слоя (кнопка удерживается настоящей мышью). Инструмент для глаз.
   node e2e/layer_shot.js dist/artifact.html out/layers [напитки через запятую] */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/layers'); fs.mkdirSync(out, { recursive: true });
const TASK = process.env.TASK || 'layer'; /* окно: layer (по умолчанию) или любое из PANEL_TASKS: whisk, boba, … */
const SEC = { whisk: 'L', brew: 'L', powder: 'L', boba: 'L', layer: 'C', topping: 'C' }[TASK] || 'R';
const drinks = (process.argv[4] || 'matcha_bumble,orange_bumble,espresso_tonic').split(',');
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, spawn, barOpen, zoneClick, applyUpgrades, camGo, resetBar() { try { barShow(false); } catch (e) { /* нет бара */ } BR = null; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ args: ['--mute-audio'] });
  const p = await PW.page(b, { width: 1312, height: 752 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(PW.url(tmp) + '#dev'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
  await p.evaluate(() => window.__sandbox.start({ day: 10, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
  await p.evaluate(() => { const d = __dbg; ['tea', 'matcha', 'powders', 'juice', 'whipper', 'foamer', 'blender', 'boba', 'shaker'].forEach(k => { d.G['eq_' + k] = true; }); d.G.eq_ice = true; d.G.milk = true; d.G.tutOff = true; d.applyUpgrades(); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  for (const id of drinks) {
    await p.evaluate(() => { if (__dbg.D) __dbg.D.t = Math.min(__dbg.D.t, 60); __dbg.resetBar(); }); await p.waitForTimeout(150);
    await p.evaluate(({ id }) => { const M = window.__MENUAPI, c = __dbg.D.customers[0], dk = M.drinkById[id]; c.drink = id; c.order.key = id; c.order.id = id; c.order.name = dk.name; c.order.size = '0.3'; c.order.cold = true; c.order.food = null; c.syrup = null; c.pumps = 0; c.strong = false; c.pat = c.max = 1e9; __dbg.barOpen(c); }, { id });
    await p.waitForTimeout(450); await PW.dismissCard(p);
    await p.evaluate(task => { const B = __dbg.BR; for (const t of B.tasks) { if (t === task) break; B.done[t] = true; B.res[t] = 1; } }, TASK);
    await p.evaluate(sec => __dbg.camGo(sec, true), SEC); await p.waitForTimeout(250);
    await p.evaluate(t => __dbg.zoneClick(t), TASK); await p.waitForTimeout(700); await PW.dismissCard(p); await p.waitForTimeout(300);
    const el = await p.$('#xPanel:not([hidden])'); if (!el) { console.log('нет окна', id); continue; }
    const shot = n => el.screenshot({ path: `${out}/${TASK}_${id}_${n}.png` });
    await shot('start');
    const r = await p.evaluate(() => { const e = document.querySelector('[data-xhold]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
    await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(1900); await shot('mid'); await p.waitForTimeout(2200); await shot('end'); await p.mouse.up();
    console.log('ok', id, await p.evaluate(() => JSON.stringify([document.querySelector('.xp h3,.xpHead b')?.textContent, document.querySelector('#xpRead')?.textContent])));
  }
  fs.unlinkSync(tmp); await b.close();
})();
