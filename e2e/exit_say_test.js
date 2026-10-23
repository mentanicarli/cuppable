/* Реплика гостя не переживает выход из дня: гость говорит → пауза → «В главное меню» → «Продолжить» / «Новая игра» → в новом дне нет .say, гостей и актёров прежнего дня.
   Запуск (отладочная сборка): HASH='#nopixi-lowfx' node e2e/exit_say_test.js dist/artifact.html out/exit */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/exit';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, ACT, WORLD };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const PW = require('./pw'), p = await PW.page(b);
  const errs = []; PW.watch(p, errs);
  const ok = (name, v) => { console.log((v ? 'OK   ' : 'FAIL ') + name); if (!v) errs.push('FAIL ' + name); };
  await p.goto(PW.url(tmp) + (process.env.HASH || '#nopixi-lowfx')); await p.waitForTimeout(600);
  const state = () => p.evaluate(() => ({ say: document.querySelectorAll('.say').length, cust: window.__dbg.D ? window.__dbg.D.customers.length : 0, act: window.__dbg.ACT.size, card: !document.querySelector('#drinkCard').hidden }));
  async function sayThenLeave(how) {
    await PW.startNew(p); await p.waitForTimeout(400);
    await p.waitForFunction(() => document.querySelectorAll('.say.show').length > 0, null, { timeout: 60000 });
    const before = await state(); ok(how + ': до выхода реплика есть', before.say > 0 && before.cust > 0);
    await p.screenshot({ path: `${out}_${how}_before.png` });
    await p.keyboard.press('KeyP'); await p.waitForSelector('[data-resume]'); await p.waitForTimeout(250);
    await p.click('[data-tomenu]'); await p.waitForSelector('[data-yes]'); await p.click('[data-yes]');
    await p.waitForSelector('[data-menu=title]'); await p.waitForTimeout(500);
    const t = await state(); ok(how + ': в меню нет реплик, гостей и актёров', t.say === 0 && t.cust === 0 && t.act === 0);
    return how === 'continue' ? '[data-continue]' : '[data-start]';
  }
  /* «Продолжить»: сохранение на начало дня 1 есть (автосейв в startDay) */
  const sel = await sayThenLeave('continue');
  await p.click(sel); await p.waitForTimeout(900);
  let s = await state(); ok('continue: в новом дне нет старых реплик', s.say === 0);
  await p.screenshot({ path: `${out}_continue_after.png` });
  await p.waitForTimeout(1500); s = await state(); ok('continue: за 1,5 с реплика без гостя не появилась', s.say <= s.cust);
  /* «Новая игра» после ещё одного выхода */
  await p.evaluate(() => window.__dbg.G.phase = 'day');
  await p.waitForFunction(() => document.querySelectorAll('.say.show').length > 0, null, { timeout: 60000 });
  await p.keyboard.press('KeyP'); await p.waitForSelector('[data-resume]'); await p.waitForTimeout(250);
  await p.click('[data-tomenu]'); await p.waitForSelector('[data-yes]'); await p.click('[data-yes]');
  await p.waitForSelector('[data-menu=title]'); await p.waitForTimeout(500);
  await p.click('[data-start]'); await p.waitForSelector('[data-yes], #screen[hidden]', { state: 'attached' }); const y = await p.$('[data-yes]'); if (y) { await y.click(); }
  await p.waitForFunction(() => document.querySelector('#screen').hidden); await p.waitForTimeout(900);
  s = await state(); ok('новая игра: в новом дне нет старых реплик', s.say === 0);
  await p.screenshot({ path: `${out}_newgame_after.png` });
  fs.unlinkSync(tmp); await b.close();
  const bad = errs.filter(e => /^FAIL|^PAGE|error/i.test(e)); console.log(bad.length ? bad.join('\n') : 'NO_ERRORS'); process.exit(bad.length ? 1 : 0);
})();
