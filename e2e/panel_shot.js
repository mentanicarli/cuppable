/* Окна станций нового ядра: кадр окна (#xPanel) и предмета на баре 4×. Инструмент для глаз и аудита (отладочная сборка).
   node e2e/panel_shot.js dist/artifact.html out/panels [тег] [станции через запятую] */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/panels'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'now', only = (process.argv[5] || '').split(',').filter(Boolean);
/* станция окна → напиток, в котором она есть */
const PANELS = { whisk: 'matcha_latte', brew: 'tea_sencha', juice: 'orange_bumble', tonic: 'espresso_tonic', powder: 'cocoa', boba: 'boba_guava', topping: 'cappuccino_pumpkin', blend: 'milkshake_vanilla', shake: 'boba_guava', foam: 'latte_coconut', whip: 'latte_coconut', layer: 'matcha_bumble' };
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, spawn, barOpen, zoneClick, applyUpgrades, WORLD, camGo, resetBar() { try { barShow(false); } catch (e) { /* нет бара */ } BR = null; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ args: ['--mute-audio'] });
  const p = await PW.page(b, { width: 1312, height: 752 });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(PW.url(tmp) + '#dev'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
  await p.evaluate(() => window.__sandbox.start({ day: 10, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
  await p.evaluate(() => { const d = __dbg; ['tea', 'matcha', 'powders', 'juice', 'whipper', 'foamer', 'blender', 'boba', 'shaker'].forEach(k => { d.G['eq_' + k] = true; }); d.G.eq_ice = true; d.G.milk = true; d.G.tutOff = true; d.applyUpgrades(); });
  await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
  const list = process.env.PAIRS ? process.env.PAIRS.split(',').map(x => x.split('=')) : Object.entries(PANELS); /* PAIRS=станция=напиток,… — произвольные пары */
  for (const [task, id] of list) {
    if (!process.env.PAIRS && only.length && !only.includes(task)) continue;
    await p.evaluate(() => { if (__dbg.D) __dbg.D.t = Math.min(__dbg.D.t, 60); });
    await p.evaluate(() => __dbg.resetBar()); await p.waitForTimeout(150);
    await p.evaluate(({ id }) => { const M = window.__MENUAPI, c = __dbg.D.customers[0], dk = M.drinkById[id]; c.drink = id; c.order.key = id; c.order.id = id; c.order.name = dk.name; c.order.size = '0.4'; c.order.cold = /bumble|tonic|shake|boba|protein/.test(id); c.order.food = null; c.syrup = null; c.pumps = 0; c.strong = false; c.pat = c.max = 1e9; __dbg.barOpen(c); }, { id });
    await p.waitForTimeout(450); await PW.dismissCard(p);
    const has = await p.evaluate(task => __dbg.BR.tasks.includes(task), task);
    if (!has) { console.log('нет шага', task, 'в', id, await p.evaluate(() => JSON.stringify(__dbg.BR.tasks))); continue; }
    await p.evaluate(task => { const B = __dbg.BR; for (const t of B.tasks) { if (t === task) break; B.done[t] = true; B.res[t] = 1; } }, task);
    const sec = ['whisk', 'brew', 'powder', 'boba'].includes(task) ? 'L' : ['topping', 'layer'].includes(task) ? 'C' : 'R';
    await p.evaluate(sec => __dbg.camGo(sec, true), sec); await p.waitForTimeout(300);
    await p.evaluate(t => __dbg.zoneClick(t), task); await p.waitForTimeout(700); await PW.dismissCard(p); await p.waitForTimeout(300);
    const el = await p.$('#xPanel:not([hidden])'); if (!el) { console.log('нет окна', task, await p.evaluate(() => JSON.stringify({ inset: __dbg.BR.inset, msgs: [...document.querySelectorAll('.bmsg')].map(e => e.textContent), tasks: __dbg.BR.tasks, done: Object.keys(__dbg.BR.done), sec: document.querySelector('#xPanel')?.outerHTML.slice(0, 80) }))); continue; }
    await el.screenshot({ path: `${out}/panel_${task}${process.env.PAIRS ? '_' + id : ''}_${tag}.png` });
    console.log('ok', task, id);
  }
  fs.unlinkSync(tmp); await b.close();
})();
