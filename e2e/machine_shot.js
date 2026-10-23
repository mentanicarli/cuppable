/* Кофемашина в зале 4×: без улучшения «Кофемашина Pro» и с ним (жёлтые полосы gold-trim). node e2e/machine_shot.js dist/artifact.html out/mach [тег] */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/mach', tag = process.argv[4] || 'now';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const PW = require('./pw'), p = await PW.page(b); const errs = []; PW.watch(p, errs);
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__hold = false; window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); });
  await p.goto(PW.url(tmp) + '#nopixi'); await p.waitForTimeout(2500); await PW.startNew(p); await p.waitForTimeout(800);
  await p.addStyleTag({ content: '#screen,#hud,#hudR,#tint,#boot,#bar,#frontHint,#banner{display:none!important}' });
  await p.evaluate(() => { window.__dbg.WORLD.res; window.__hold = true; });
  for (const on of [false, true]) {
    await p.evaluate(on => { const W = window.__dbg.WORLD; W.setUpgrades({ milk: true, machine: on, cozy: false }); }, on);
    await p.waitForTimeout(900);
    const url = await p.evaluate(() => { const W = window.__dbg.WORLD; for (let i = 0; i < 4; i++) W.update(1 / 30, 0.3, 480); W.app.render(); const c = W.app.renderer.extract.canvas({ target: W.app.stage, frame: W.app.screen, resolution: 2 }); const k = c.width / 1280, o = document.createElement('canvas'); o.width = 720; o.height = 480; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 930 * k, 290 * k, 180 * k, 120 * k, 0, 0, 720, 480); return o.toDataURL('image/png'); });
    fs.writeFileSync(`${out}_${tag}_${on ? 'pro' : 'plain'}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  fs.unlinkSync(tmp); await b.close(); console.log(errs.length ? errs.join('\n') : 'NO_ERRORS');
})();
