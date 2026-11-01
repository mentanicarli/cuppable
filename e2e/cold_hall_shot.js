/* 35-Б, кадры приёмки: (г) пузырь гостя с холодным заказом в зале и билет в баре; (д) книга рецептов: переключатель «Холодный» у новых семи и его отсутствие у раф, какао, цикория.
   Отладочная сборка: CHROMIUM_ARGS=--mute-audio node e2e/cold_hall_shot.js dist/artifact.html docs/art/cold/35b */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, get SBX() { return SBX; }, endDay, barOpen, spawn, showBook };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const out = process.argv[3];
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const PW = require('./pw');
  const p = await PW.page(b);
  const errs = []; PW.watch(p, errs);
  await p.addInitScript(() => { let a = 99; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await PW.sandboxStart(p, PW.url(tmp), { day: 24, profile: 'medium' }); await p.waitForTimeout(500);
  /* (г) гость с холодным латте сакура-вишня в зале, потом билет в баре */
  await p.evaluate(() => { const d = window.__dbg; d.SBX.next = { drink: 'latte_sakura', cold: true, size: '0.4' }; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach((c) => { c.pat = c.max = 1e9; }); });
  await p.waitForFunction(() => window.__dbg.D.customers[0] && window.__dbg.D.customers[0].arrived, null, { timeout: 90000 });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => { const c = window.__dbg.D.customers[0]; return { cold: c.order.cold, size: c.order.size, id: c.order.id, line: c.order.line }; });
  console.log('заказ', JSON.stringify(info));
  await p.screenshot({ path: `${out}/g_bubble_hall.png` });
  await p.evaluate(() => window.__dbg.barOpen(window.__dbg.D.customers[0])); await p.waitForTimeout(900); await PW.dismissCard(p); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/g_ticket_bar.png`, clip: { x: 0, y: 0, width: 960, height: 200 } });
  /* (д) книга */
  await p.evaluate(() => window.__dbg.endDay()); await p.waitForSelector('.evening', { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.click('[data-book=evening]'); await p.waitForTimeout(700);
  const toggles = {};
  for (const [fam, ids] of [['foamlatte', ['latte_sakura', 'latte_banana', 'latte_lemon', 'latte_coconut', 'matcha_coconut']], ['matcha', ['matcha_latte']], ['milk', ['cappuccino_pumpkin']], ['raf', ['raf', 'raf_halva']], ['powder', ['cocoa', 'chicory_latte']]]) {
    await p.click(`[data-bookfam=${fam}]`); await p.waitForTimeout(400);
    for (const id of ids) toggles[id] = await p.evaluate((i) => { const e = document.querySelector(`[data-drink=${i}]`); return e ? !!e.querySelector('[data-bookcold]') : 'нет карточки'; }, id);
    if (fam === 'foamlatte' || fam === 'raf' || fam === 'powder') await p.screenshot({ path: `${out}/d_book_${fam}.png` });
  }
  console.log('переключатель «Холодный»:', JSON.stringify(toggles));
  /* кадр холодного варианта: латте сакура-вишня */
  await p.click('[data-bookfam=foamlatte]'); await p.waitForTimeout(300);
  await p.click('[data-drink=latte_sakura] [data-bookcold$="|1"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/d_book_sakura_cold.png` });
  console.log(errs.length ? errs.join('\n') : 'NO_ERRORS'); await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
