/* Пар только у горячих: гость с горячим и гость с холодным напитком держат чашки, считаем выпущенные клубы пара.
   Запуск (отладочная сборка): HASH='#nopixi-lowfx' node e2e/cold_steam.js dist/artifact.html out/cs */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/cs';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, WORLD, MENUAPI: window.__MENUAPI };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const PW = require('./pw'), p = await PW.page(b);
  const errs = []; PW.watch(p, errs);
  const ok = (n, v) => { console.log((v ? 'OK   ' : 'FAIL ') + n); if (!v) errs.push('FAIL ' + n); };
  await p.goto(PW.url(tmp) + (process.env.HASH || '#nopixi-lowfx')); await p.waitForTimeout(700);
  await PW.startNew(p); await p.waitForTimeout(500);
  await p.waitForFunction(() => window.__dbg.D.customers[0] && window.__dbg.D.customers[0].arrived, null, { timeout: 40000 });
  await p.evaluate(() => { const d = window.__dbg; window.__look = d.D.customers[0].look; d.D.nextArr = 1e9; });
  await p.keyboard.press('Tab'); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    const d = window.__dbg, W = d.WORLD, M = d.MENUAPI, look = window.__look;
    const cnt = { hot: 0, cold: 0, iced: 0 }, acts = [], emit = {};
    const mk = (name, x, id, size, cold) => {
      const a = W.addActor({ look, title: '', tags: [], x, onTap() {}, steam: (sx, sy) => { cnt[name]++; emit[name] = sy - 9; W.fx.add({ x: sx, y: sy - 9, vx: 0, vy: -20, r: 2.5, grow: 8, a: 0.5, life: 2.2 }); } });
      a.holdCup('#5A3A2A', 1, M.modelRefOf(id, size, cold)); acts.push([a, x]);
    };
    mk('hot', 420, 'latte', '0.3', false); mk('cold', 760, 'icedlatte', '0.4', true); mk('iced', 1060, 'orange_bumble', '0.4', true);
    const t = setInterval(() => acts.forEach(([a, x]) => a.update(0.033, x, 0)), 33);
    await new Promise(r => setTimeout(r, 3000)); clearInterval(t);
    const top = acts[0][0].cupSpr.getGlobalPosition().y;
    return { ...cnt, rimOk: emit.hot < top, emit: emit.hot, top };
  });
  console.log(JSON.stringify(r));
  ok('у горячего пар идёт', r.hot > 0); ok('пар стартует над ободом чашки', r.rimOk); ok('у холодного латте пара нет', r.cold === 0); ok('у холодного бамбла со льдом пара нет', r.iced === 0);
  await p.screenshot({ path: `${out}_cold_no_steam.png` });
  fs.unlinkSync(tmp); await b.close();
  const bad = errs.filter(e => /^FAIL|^PAGE|error/i.test(e)); console.log(bad.length ? bad.join('\n') : 'NO_ERRORS'); process.exit(bad.length ? 1 : 0);
})();
