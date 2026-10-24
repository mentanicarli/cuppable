/* Меню → игра (32-Д): зал в меню живёт отдельно от дня. Отладочная сборка.
   node e2e/menu_game_shot.js dist/artifact.html out/people-e
   Кадры: menu_title.png (титул, за ним сидит гость), menu_start.png (сразу после «Играть»: зал пуст), menu_15s.png (через 16 с игры: пришёл новый гость).
   Время зала шагается вручную (WORLD.update по 1/30 с), поэтому результат не зависит от скорости программного GL.
   Печатает JSON с состоянием зала; код возврата 1, если проверка не прошла. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/people-e';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const PW = require('./pw');
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD, get G() { return G; }, get D() { return D; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.menu.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
  const p = await PW.page(b); const errs = []; PW.watch(p, errs);
  await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__hold = false; window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); });
  await p.goto(PW.url(tmp) + '#nopixi'); await p.waitForTimeout(3000);
  const shoot = async (name) => { await p.evaluate(() => window.__dbg.WORLD.app.render()); await p.screenshot({ path: path.join(out, name + '.png') }); };
  const step = (n) => p.evaluate((n) => { for (let i = 0; i < n; i++) window.__dbg.WORLD.update(1 / 30, 0.3, 480); }, n);
  const state = () => p.evaluate(() => { const s = window.__dbg.WORLD.hallState(); return { seated: s.seated, sitSt: s.sitSt, sitT: +s.sitT.toFixed(1), look: s.look && JSON.stringify(s.look, ['hair', 'hairCol', 'facial', 'acc', 'sex', 'age', 'outfit', 'cloth', 'skin']) }; });
  const res = {};
  /* 1. титул: даём залу 20 с, гость пришёл и сидит */
  await p.evaluate(() => { window.__hold = true; });
  await step(30 * 20);
  for (let i = 0; i < 40 && !(await p.evaluate(() => window.__dbg.WORLD.hallState().sitSt === 'seated')); i++) await step(60);
  await p.waitForTimeout(500); await step(3);
  res.title = await state();
  await shoot('menu_title');
  /* 2. «Играть» */
  await p.evaluate(() => { window.__hold = false; });
  await PW.startNew(p); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__hold = true; });
  await step(2);
  res.start = await state();
  await shoot('menu_start');
  /* 3. через 16 с игры */
  await step(30 * 16);
  for (let i = 0; i < 20 && !(await p.evaluate(() => window.__dbg.WORLD.hallState().seated)); i++) await step(30);
  await p.waitForTimeout(800); await step(3);
  res.after16 = await state();
  await shoot('menu_15s');
  /* 4. второй старт (как newGame/startDay): сброс и новый сидящий */
  await p.evaluate(() => window.__dbg.WORLD.clearActors());
  res.reset2 = await state();
  await step(30 * 16);
  for (let i = 0; i < 20 && !(await p.evaluate(() => window.__dbg.WORLD.hallState().seated)); i++) await step(30);
  res.after2 = await state();
  const ok = res.title.seated && !res.start.seated && res.start.sitSt === 'empty' && res.start.sitT >= 6 && res.start.sitT <= 15 && res.after16.seated && !res.reset2.seated && res.after2.seated && res.after16.look !== res.after2.look && res.after16.look !== res.title.look;
  console.log(JSON.stringify(res, null, 1));
  console.log('OK', ok, 'ERRS', errs.slice(0, 4).join('|') || 'нет');
  fs.unlinkSync(tmp); await b.close();
  process.exit(ok ? 0 : 1);
})();
