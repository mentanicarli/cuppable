/* Кадры сидящего гостя (весь зал, крупный план столика) для 3 гостей × 5 состояний; режим MODE=table оставляет слои как в игре.
   Запуск (отладочная сборка): node e2e/seat_shot.js dist/artifact.html out/seat [префикс] */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/seat', tag = process.argv[4] || 'now';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD, lookFor, MENUAPI: window.__MENUAPI, get G() { return G; }, get D() { return D; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const PW = require('./pw'), p = await PW.page(b); const errs = []; PW.watch(p, errs);
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__hold = false; window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); });
  await p.goto(PW.url(tmp) + '#nopixi'); await p.waitForTimeout(2500); await PW.startNew(p); await p.waitForTimeout(800);
  await p.addStyleTag({ content: '#screen,#hud,#hudR,#tint,#boot,#bar,#frontHint,#banner{display:none!important}' });
  await p.evaluate(() => { window.__hold = true; });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const { WORLD } = window.__dbg;
    window.__step = n => { for (let i = 0; i < n; i++) WORLD.update(1 / 30, 0.3, 480); };
    window.__crop = () => { WORLD.app.render(); const c = WORLD.app.renderer.extract.canvas({ target: WORLD.app.stage, frame: WORLD.app.screen, resolution: WORLD.app.renderer.resolution }); const k = c.width / 1280; const o = document.createElement('canvas'); o.width = 720; o.height = 640; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 60 * k, 290 * k, 360 * k, 320 * k, 0, 0, 720, 640); return o.toDataURL('image/png'); };
  });
  if (process.env.CUPS) {
    await p.evaluate(() => { const { WORLD } = window.__dbg; WORLD.sitT = 0; const real = Math.random; Math.random = () => 0.05; WORLD.update(1 / 30, 0.3, 480); Math.random = real; });
    for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(30)); if (await p.evaluate(() => window.__dbg.WORLD.sitSt === 'seated')) break; }
    await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; a.busy = true; a.act = 'type'; a.seq = null; window.__step(60); });
    const refs = [['latte', '0.2', false], ['latte', '0.4', false], ['latte', '0.6', false], ['cappuccino', '0.2', false], ['cappuccino', '0.4', false], ['cocoa', '0.6', false], ['espresso', '0.1', false], ['espresso_double', '0.1', false], ['orange_bumble', '0.3', true], ['orange_bumble', '0.6', true], ['espresso_tonic', '0.4', true], ['boba_guava', '0.6', true]];
    const names = [];
    for (const [id, size, cold] of refs) {
      const ok = await p.evaluate(([id, size, cold]) => { const W = window.__dbg.WORLD, a = W.sitter, M = window.__MENUAPI; let r; try { r = M.modelRefOf(id, size, cold); } catch (e) { return false; } a.holdCup('#5A3A2A', 1, r); a.cupToTable(); window.__step(2); return JSON.stringify(r); }, [id, size, cold]);
      await p.waitForTimeout(700); await p.evaluate(() => window.__step(3));
      const url = await p.evaluate(() => { const { WORLD } = window.__dbg; WORLD.app.render(); const c = WORLD.app.renderer.extract.canvas({ target: WORLD.app.stage, frame: WORLD.app.screen, resolution: WORLD.app.renderer.resolution }); const k = c.width / 1280; const o = document.createElement('canvas'); o.width = 440; o.height = 320; const g = o.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(c, 262 * k, 430 * k, 110 * k, 80 * k, 0, 0, 440, 320); return o.toDataURL('image/png'); });
      const fn = `${out}_cup_${id}_${size}_${cold ? 'cold' : 'hot'}.png`; fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64')); names.push(fn);
    }
    console.log(names.join(' ')); fs.unlinkSync(tmp); await b.close(); return;
  }
  const kinds = [[0.05, 'student'], [0.6, 'regular'], [0.99, 'hurry']];
  const states = {
    type: () => { const a = window.__dbg.WORLD.sitter; a.act = 'type'; a.hands.forEach(h => { h.ovr = null; }); a.cupToTable(); a.setHandTargets(null, null); a.setGaze('d'); },
    sip: () => { const a = window.__dbg.WORLD.sitter, T = { x: 52, y: 538 }; a.act = 'sip'; a.setHandTargets({ x: -12, y: 522 }, { x: T.x, y: T.y - 3 }); window.__step(15); a.cupToHand(); a.hands[1].ovr = { x: 11, y: 459 }; a.sipping = 1; },
    stretch: () => { const a = window.__dbg.WORLD.sitter; a.sipping = 0; a.act = 'stretch'; a.hands[0].ovr = { x: -26, y: 418 }; a.hands[1].ovr = { x: 26, y: 418 }; },
    think: () => { const a = window.__dbg.WORLD.sitter; a.act = 'think'; a.hands[0].ovr = null; a.hands[1].ovr = { x: 12, y: 462 }; },
    glance: () => { const a = window.__dbg.WORLD.sitter; a.act = 'glance'; a.hands[0].ovr = null; a.hands[1].ovr = null; a.setGaze('l'); }
  };
  for (const [rv, kind] of kinds) {
    await p.evaluate(rv => { const { WORLD } = window.__dbg; const real = Math.random; WORLD.sitT = 0; Math.random = () => rv; WORLD.update(1 / 30, 0.3, 480); Math.random = real; }, rv);
    for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(30)); if (await p.evaluate(() => window.__dbg.WORLD.sitSt === 'seated')) break; }
    await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; a.busy = true; a.act = 'type'; a.seq = null; window.__step(60); });
    for (const [sn, fn] of Object.entries(states)) {
      await p.evaluate(fn); await p.evaluate(() => window.__step(40));
      if (process.env.PROBE && sn === 'type') console.log(kind, JSON.stringify(await p.evaluate(() => { const a = window.__dbg.WORLD.sitter, g = a.cup.getGlobalPosition(); return { g: [g.x, g.y], spr: [a.cupSpr.x, a.cupSpr.y, a.cupSpr.width, a.cupSpr.height], cs: a.cup.scale.x, root: [a.root.x, a.root.y], sk: a.seatK, model: a.cupModel }; })));
      const url = await p.evaluate(() => window.__crop());
      fs.writeFileSync(`${out}_${tag}_${kind}_${sn}.png`, Buffer.from(url.split(',')[1], 'base64'));
    }
    await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; a.hands[0].ovr = null; a.hands[1].ovr = null; a.setHandTargets(null, null); window.__dbg.WORLD.sitT = 0; });
    for (let i = 0; i < 40 && !(await p.evaluate(() => window.__dbg.WORLD.sitSt === 'empty')); i++) await p.evaluate(() => window.__step(30));
  }
  fs.unlinkSync(tmp); await b.close(); console.log(errs.length ? errs.join('\n') : 'NO_ERRORS');
})();
