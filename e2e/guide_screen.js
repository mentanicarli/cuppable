/* Справочник — отдельный экран: открывается из вечера, паузы, «Как играть» и книги, «Закрыть» возвращает туда, откуда открыт; поиск находит «питчер»; в книге нет вкладки.
   Запуск (отладочная сборка): HASH='#nopixi-lowfx' node e2e/guide_screen.js dist/artifact.html out/gs */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/gs';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, endDay };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const PW = require('./pw'), p = await PW.page(b);
  const errs = []; PW.watch(p, errs);
  const ok = (n, v) => { console.log((v ? 'OK   ' : 'FAIL ') + n); if (!v) errs.push('FAIL ' + n); };
  const guideOpen = () => p.evaluate(() => !!document.querySelector('[data-screen=guide]') && !document.querySelector('#screen').hidden);
  await p.goto(PW.url(tmp) + (process.env.HASH || '#nopixi-lowfx')); await p.waitForTimeout(700);
  /* из «Как играть» (с титула) */
  await p.click('[data-howto]'); await p.waitForSelector('[data-menu=howto]'); await p.waitForTimeout(500);
  await p.click('[data-guide=howto]'); await p.waitForTimeout(300); ok('«Как играть» → справочник открыт', await guideOpen());
  await p.click('[data-guideclose]'); await p.waitForTimeout(300); ok('«Закрыть» → снова «Как играть»', await p.evaluate(() => !!document.querySelector('[data-menu=howto]')));
  await p.click('[data-menuback]'); await p.waitForSelector('[data-start]');
  await PW.startNew(p); await p.waitForTimeout(500);
  /* пауза */
  await p.keyboard.press('KeyP'); await p.waitForSelector('[data-resume]'); await p.waitForTimeout(300);
  await p.click('[data-guide=pause]'); await p.waitForTimeout(300); ok('пауза → справочник открыт', await guideOpen());
  await p.click('[data-guideclose]'); await p.waitForTimeout(300); ok('«Закрыть» → снова пауза', await p.evaluate(() => !!document.querySelector('[data-resume]')));
  /* пауза → книга → справочник → книга → пауза */
  await p.click('[data-book=pause]'); await p.waitForTimeout(400);
  ok('в книге нет вкладки «Справочник»', await p.evaluate(() => !document.querySelector('[data-booktab=guide]') && [...document.querySelectorAll('[data-booktab]')].length === 3));
  await p.screenshot({ path: `${out}_book_tabs.png` });
  await p.click('[data-guide=book]'); await p.waitForTimeout(400); ok('книга → справочник открыт', await guideOpen());
  await p.fill('#gQ', 'питчер'); await p.waitForTimeout(300);
  ok('поиск «питчер» находит термин', await p.evaluate(() => { const v = [...document.querySelectorAll('.gTerm')].filter(e => !e.hidden); return v.length >= 1 && v.every(e => e.dataset.n.includes('питчер')); }));
  await p.screenshot({ path: `${out}_guide_screen.png` });
  await p.click('[data-guideclose]'); await p.waitForTimeout(300); ok('«Закрыть» → книга', await p.evaluate(() => !!document.querySelector('.book:not(.guide)')));
  await p.click('[data-bookclose]'); await p.waitForTimeout(300); ok('книга закрыта → пауза', await p.evaluate(() => !!document.querySelector('[data-resume]')));
  await p.click('[data-resume]'); await p.waitForTimeout(300);
  /* вечер */
  await p.evaluate(() => window.__dbg.endDay()); await p.waitForSelector('.evening', { timeout: 15000 }); await p.waitForTimeout(1500);
  await p.click('[data-guide=evening]'); await p.waitForTimeout(300); ok('вечер → справочник открыт', await guideOpen());
  await p.click('[data-guideclose]'); await p.waitForTimeout(300); ok('«Закрыть» → снова вечер', await p.evaluate(() => !!document.querySelector('.evening')));
  fs.unlinkSync(tmp); await b.close();
  const bad = errs.filter(e => /^FAIL|^PAGE|error/i.test(e)); console.log(bad.length ? bad.join('\n') : 'NO_ERRORS'); process.exit(bad.length ? 1 : 0);
})();
