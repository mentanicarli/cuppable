/* Кадры людей из самой сцены (32-Г): сидящие за столиком, стоящие и серия ходьбы. Отладочная сборка (CUPPABLE_DEBUG=1).
   node e2e/people_shot.js dist/artifact.html out/people-c [seat|stand|walk|all]
   Сидящий выбирается подбором сида Math.random (как в игре: тип, затем lookFor), поэтому кадр воспроизводится. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/people-c', mode = process.argv[4] || 'all';
fs.mkdirSync(out, { recursive: true });
const SEATS = {
  braid: 'l.hair === "braid"', wavy: 'l.hair === "wavy"', long: 'l.hair === "long"', bun_hp: 'l.hair === "bun" && l.acc === "headphones"',
  beard: 'l.facial === "beard" && l.acc !== "glasses"', beanie: 'l.hair === "beanie"', glasses: 'l.acc === "glasses" && l.facial === "none"', crop: 'l.hair === "crop"', grey: 'l.hair === "grey"'
};
const STANDS = {
  long: 'l.hair === "long"', wavy: 'l.hair === "wavy"', braid: 'l.hair === "braid"', pony: 'l.hair === "pony"', bun_hp: 'l.hair === "bun" && l.acc === "headphones"', beard: 'l.facial === "beard"'
};
(async () => {
  const PW = require('./pw');
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD, lookFor, get G() { return G; }, get D() { return D; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.people.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
  const open = async () => {
    const p = await PW.page(b); const errs = []; PW.watch(p, errs);
    await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__hold = false; window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); });
    await p.goto(PW.url(tmp) + '#nopixi'); await p.waitForTimeout(2500); await PW.startNew(p); await p.waitForTimeout(800);
    await p.addStyleTag({ content: '#screen,#hud,#hudR,#tint,#boot,#bar,#frontHint,#banner{display:none!important}' });
    await p.evaluate(() => { window.__hold = true; });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      const { WORLD, lookFor } = window.__dbg;
      window.__mul = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.__seed = (pred, sitter) => { const f = new Function('l', 'return ' + pred); for (let s = 1; s < 60000; s++) { const r = window.__mul(s); let kind; if (sitter) kind = ['student', 'student', 'regular', 'hurry'][Math.floor(r() * 4)]; else kind = ['regular', 'student', 'hurry'][s % 3]; const l = lookFor(kind, r); if (f(l)) return { s, kind }; } return null; };
      window.__step = n => { for (let i = 0; i < n; i++) WORLD.update(1 / 30, 0.3, 480); };
      window.__crop = (x, y, w, h, ow, oh) => { WORLD.app.render(); const c = WORLD.app.renderer.extract.canvas({ target: WORLD.app.stage, frame: WORLD.app.screen, resolution: WORLD.app.renderer.resolution }); const k = c.width / 1280; const o = document.createElement('canvas'); o.width = ow; o.height = oh; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, x * k, y * k, w * k, h * k, 0, 0, ow, oh); return o.toDataURL('image/png'); };
    });
    return { p, errs };
  };
  const save = (fn, url) => fs.writeFileSync(path.join(out, fn), Buffer.from(url.split(',')[1], 'base64'));
  if (mode === 'seat' || mode === 'all') {
    for (const [name, pred] of Object.entries(SEATS)) {
      const { p, errs } = await open();
      const sd = await p.evaluate(pred => window.__seed(pred, true), pred);
      const info = await p.evaluate(sd => {
        const { WORLD } = window.__dbg; const real = Math.random; if (WORLD.sitter) { WORLD.sitter.destroy(); WORLD.sitter = null; } WORLD.sitSt = 'empty'; WORLD.deskShow(null); Math.random = window.__mul(sd.s); WORLD.sitT = 0; WORLD.stepSitter(1 / 30); Math.random = real; return JSON.stringify(WORLD.sitter && WORLD.sitter.o.look);
      }, sd);
      for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(30)); if (await p.evaluate(() => window.__dbg.WORLD.sitSt === 'seated')) break; await p.waitForTimeout(120); }
      await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; a.busy = true; a.act = 'type'; a.seq = null; window.__step(60); });
      await p.waitForTimeout(900); await p.evaluate(() => window.__step(4));
      save(`seat_${name}.png`, await p.evaluate(() => window.__crop(80, 235, 300, 330, 600, 660)));
      console.log('seat', name, 'seed', sd.s, sd.kind, JSON.stringify(JSON.parse(info), ['hair', 'hairCol', 'facial', 'acc', 'sex', 'age']), 'ERRS', errs.slice(0, 3).join('|') || 'нет');
      await p.context().close();
    }
  }
  if (mode === 'stand' || mode === 'all') {
    for (const [name, pred] of Object.entries(STANDS)) {
      const { p, errs } = await open();
      const sd = await p.evaluate(pred => window.__seed(pred, false), pred);
      await p.evaluate(sd => { const { WORLD, lookFor } = window.__dbg; const l = lookFor(sd.kind, window.__mul(sd.s)); window.__a = WORLD.addActor({ look: l, title: '', tags: [], x: 640, onTap: () => undefined }); }, sd);
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const a = window.__a; for (let i = 0; i < 20; i++) { a.update(1 / 30, 640, 0); } window.__dbg.WORLD.update(1 / 30, 0.3, 480); });
      save(`stand_${name}.png`, await p.evaluate(() => window.__crop(540, 250, 200, 360, 400, 720)));
      console.log('stand', name, 'seed', sd.s, 'ERRS', errs.slice(0, 3).join('|') || 'нет');
      await p.context().close();
    }
  }
  if (mode === 'walk' || mode === 'all') {
    const { p, errs } = await open();
    for (const name of ['long', 'braid', 'wavy', 'pony']) {
      const sd = await p.evaluate(pred => window.__seed(pred, false), 'l.hair === "' + name + '"');
      await p.evaluate(sd => { const { WORLD, lookFor } = window.__dbg; WORLD.clearActors(); const l = lookFor(sd.kind, window.__mul(sd.s)); window.__a = WORLD.addActor({ look: l, title: '', tags: [], x: 380, onTap: () => undefined }); window.__x = 380; }, sd);
      await p.waitForTimeout(1500);
      const step = n => p.evaluate(n => { const a = window.__a; for (let i = 0; i < n; i++) { window.__x += 100 / 30; a.update(1 / 30, window.__x, 0); } window.__dbg.WORLD.render && 0; }, n);
      await step(45); /* разгон: 1,5 с */
      for (let f = 0; f < 6; f++) {
        await step(4);
        save(`walk_${name}_${f}.png`, await p.evaluate(() => window.__crop(window.__x - 90, 250, 180, 360, 270, 540)));
      }
      console.log('walk', name, 'seed', sd.s);
    }
    console.log('ERRS', errs.slice(0, 3).join('|') || 'нет');
    await p.context().close();
  }
  fs.unlinkSync(tmp); await b.close();
})();
