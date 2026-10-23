/* Капельная кофеварка (блок 31-8Б): купить eq_drip, клик по кофеварке, заварить малую порцию (настоящие 20 с), подать фильтр-кофе гостю,
   колба уменьшилась, расход и выручка, блокировки с тостами, кадры окон; помощник (шаг 4) в этом же сценарии.
   CHROMIUM_ARGS=--mute-audio node e2e/drip_flow.js dist/artifact.html docs/art/fixes/31-8b   (отладочная сборка) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/drip'); fs.mkdirSync(out, { recursive: true });
const FAST = !!process.env.FAST; /* FAST=1: заварка не ждёт реальные секунды (только для отладки сценария) */
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades, tickDay, exit, helperTick, serveMatch, barBell, barAbort, MENUAPI: window.__MENUAPI };';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m); };
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.drip.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await PW.sandboxStart(p, PW.url(tmp), { day: 10, profile: 'medium', mode: 'all' });
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  const shot = async n => { await p.evaluate(() => { document.querySelectorAll('#devBtn,#devPanel').forEach(e => { e.style.visibility = 'hidden'; }); window.scrollTo(0, 0); }); await p.waitForTimeout(400); await p.locator('#stage').screenshot({ path: `${out}/${n}.png`, timeout: 120000 }); console.log('кадр', n); };
  const toasts = () => p.evaluate(() => [...document.querySelectorAll('#bFloat .bmsg, #toast')].map(e => e.textContent.trim()).filter(Boolean));
  const clickDrip = () => p.click('#bZones > [data-z=drip]', { force: true });
  /* стол: кофеварка куплена (покупка в #dev даёт eq_drip сама на ранге ≥ 3), молоко есть, подсказки и ожидание гостей выключены */
  await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.G.eq_drip = true; d.G.milk = true; d.G.tutorialSeen = d.MENUAPI.fullSeen(); d.applyUpgrades(); d.D.nextArr = 1e9; });
  ok(await p.evaluate(() => __dbg.G.rank >= 3 && __dbg.G.eq_drip), 'ранг ≥ 3, кофеварка куплена');
  ok(await p.evaluate(() => __dbg.D.carafe && __dbg.D.carafe.ml === 0 && !__dbg.D.carafe.brew), 'колба в начале смены пуста');
  const order = (size, key = 'filter_coffee') => p.evaluate(({ size, key }) => {
    const d = __dbg; d.D.customers.slice().forEach(d.exit); d.spawn();
    const M = d.MENUAPI, c = d.D.customers[d.D.customers.length - 1], dk = M.drinkById[key];
    c.drink = key; c.order.key = key; c.order.id = key; c.order.name = dk.name; c.order.size = size; c.order.cold = false; c.order.food = null; c.order.shots = 0; c.order.syrup = null; c.order.price = c.order.base = M.priceOf(key, size);
    c.syrup = null; c.pumps = 1; c.strong = false; c.pat = c.max = 1e9; c.arrived = true;
    return c.id;
  }, { size, key });
  const open = async () => { await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[__dbg.D.customers.length - 1])); await p.waitForTimeout(700); await PW.dismissCard(p); };

  /* --- 1. заказ фильтр-кофе при пустой колбе: шаг заблокирован, клик по кофеварке открывает окно заварки --- */
  await order('0.3'); await p.waitForTimeout(300);
  const costs0 = await p.evaluate(() => __dbg.D.stats.costs);
  await open();
  ok(await p.evaluate(() => __dbg.BR && __dbg.BR.tasks.join() === 'drip'), 'шаг заказа один: drip');
  ok(await p.evaluate(() => __dbg.D.stats.costs - 0) - costs0 === 66, 'расход за чашку 0,3 л при начале заказа: 66 ₽ (' + (await p.evaluate(() => __dbg.D.stats.costs) - costs0) + ')');
  await shot('r0_bar_order_empty');
  await clickDrip(); await p.waitForTimeout(500); await PW.dismissCard(p);
  let t = (await toasts()).join(' | ');
  ok(/Колба пуста: заварите кофе/.test(t), 'тост «Колба пуста: заварите кофе»: ' + t);
  ok(await p.evaluate(() => __dbg.BR.inset === 'carafe'), 'клик по кофеварке открыл окно заварки');
  await shot('r1_size');
  ok(await p.locator('[data-xsize]').count() === 3, 'три порции: 0,6 / 0,9 / 1,2 л');

  /* --- 2. ритуал: малая порция, кофе по линии, вода по линии, «Заварить» --- */
  const hold = async (sel, until) => { const bb = await p.locator(sel).boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForFunction(until, null, { timeout: 20000 }); await p.mouse.up(); };
  await p.click('[data-xsize="0.6"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __dbg.D.rit.phase === 'coffee' && __dbg.D.rit.size === '0.6'), 'порция 0,6 л выбрана, фаза «кофе»');
  await hold('[data-xhold]', () => __dbg.D.rit.coffee.ml >= 41);
  await shot('r2_coffee');
  await p.click('[data-xdone]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => __dbg.D.rit.phase === 'water'), 'после кофе фаза «вода»');
  await hold('[data-xhold]', () => __dbg.D.rit.water.ml >= 680);
  await shot('r3_water');
  await p.click('[data-xdone]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !!__dbg.D.carafe.brew && __dbg.D.carafe.brew.size === '0.6'), 'заварка пошла (порция 0,6 л)');
  ok(await p.evaluate(() => document.querySelector('#xpRead').textContent.includes('Осталось')), 'окно показывает оставшееся время');
  const tBrew = await p.evaluate(() => performance.now());
  await shot('r4_brewing');

  /* --- 3. ожидание в фоне: окно закрыто, колба наполняется в реальном времени, шаг подачи пока заблокирован --- */
  await p.click('#bClose'); await p.waitForTimeout(300);
  const t0 = tBrew;
  await p.waitForTimeout(FAST ? 200 : 10000);
  if (FAST) await p.evaluate(() => { __dbg.D.carafe.brew.t = 19.5; });
  const mid = await p.evaluate(() => ({ brewing: !!__dbg.D.carafe.brew, level: __dbg.MENUAPI.levelMl(__dbg.D.carafe), ml: __dbg.D.carafe.ml }));
  ok(mid.brewing && mid.ml === 0, 'через 10 с колба ещё заваривается, готового кофе нет (уровень ' + Math.round(mid.level) + ' мл)');
  ok(mid.level > 100 && mid.level < 598, 'уровень на картинке растёт между 0 и 598 мл');
  await shot('r5_brewing_mid');
  await clickDrip(); await p.waitForTimeout(400);
  t = (await toasts()).join(' | ');
  ok(/Фильтр-кофе ещё готовится/.test(t), 'во время заварки тост «Фильтр-кофе ещё готовится»: ' + t);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); if (await p.evaluate(() => __dbg.BR && __dbg.BR.inset)) await p.click('#bClose');
  await p.waitForFunction(() => !__dbg.D.carafe.brew, null, { timeout: 40000 });
  const waited = (await p.evaluate(() => performance.now()) - t0) / 1000;
  ok(FAST || (waited >= 19 && waited <= 26), 'заварка заняла около 20 с реального времени: ' + waited.toFixed(1));
  ok(await p.evaluate(() => __dbg.D.carafe.ml === 598), 'в колбе 598 мл');
  await shot('r6_ready_bar');

  /* --- 4. налив из колбы --- */
  await clickDrip(); await p.waitForTimeout(500); await PW.dismissCard(p);
  ok(await p.evaluate(() => __dbg.BR.inset === 'drip'), 'клик по кофеварке при готовой колбе открыл налив');
  await shot('p0_pour_start');
  await hold('[data-xhold]', () => document.querySelector('#xpRead') && /нужно/.test(document.querySelector('#xpRead').textContent) && __dbg.BR.xs.drip.ml >= 296);
  await shot('p1_pour_full');
  await p.click('[data-xdone]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => __dbg.BR.done.drip && __dbg.BR.ready), 'шаг drip сделан, заказ готов');
  ok(await p.evaluate(() => __dbg.D.carafe.ml === 298), 'из колбы ушло 300 мл (осталось 298)');
  await shot('p2_ready_cup');
  const money0 = await p.evaluate(() => __dbg.G.money), served0 = await p.evaluate(() => __dbg.D.stats.served);
  await p.evaluate(() => { __dbg.BR.hold = false; __dbg.barBell(); }); await p.waitForTimeout(600);
  await p.evaluate(() => { if (__dbg.D.cup) __dbg.serveMatch(); }); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => __dbg.D.stats.served) === served0 + 1, 'гость обслужен: за смену ' + served0 + ' → ' + (await p.evaluate(() => __dbg.D.stats.served)));
  const gain = (await p.evaluate(() => __dbg.G.money)) - money0;
  ok(gain >= 90 && gain <= 300, 'выручка за 0,3 л: цена 150 ₽ (брак 90, с чаевыми до 300): +' + gain);

  /* --- 5. «мало кофе»: колба 100 мл, заказ 0,4 л --- */
  await p.evaluate(() => { __dbg.D.cup = null; __dbg.D.carafe.ml = 100; });
  await order('0.4'); await open();
  await p.waitForTimeout(300);
  t = (await toasts()).join(' | ');
  ok(await p.evaluate(() => __dbg.MENUAPI.pourCheck(__dbg.D.carafe, 400) === 'low'), 'колба 100 мл против чашки 400 мл: «мало»');
  await clickDrip(); await p.waitForTimeout(400);
  t = (await toasts()).join(' | ');
  ok(/В колбе мало кофе: заварите ещё/.test(t), 'тост «В колбе мало кофе: заварите ещё»: ' + t);
  ok(await p.evaluate(() => __dbg.BR.inset === 'carafe'), 'при нехватке кофе открывается окно заварки');
  await shot('r7_low');

  /* --- 6. кофеварка в чужом заказе: клик по кофеварке при заказе капучино открывает окно заварки (не «не нужно») --- */
  await p.evaluate(() => { const d = __dbg; if (d.BR) d.barAbort(); d.D.customers.slice().forEach(d.exit); d.spawn(); const M = d.MENUAPI, c = d.D.customers[d.D.customers.length - 1], dk = M.drinkById.espresso; c.drink = 'espresso'; c.order.key = 'espresso'; c.order.id = 'espresso'; c.order.name = dk.name; c.order.size = '0.2'; c.order.food = null; c.syrup = null; c.pat = c.max = 1e9; c.arrived = true; });
  await open();
  await clickDrip(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => __dbg.BR.inset === 'carafe'), 'при заказе эспрессо клик по кофеварке тоже открывает окно заварки');
  ok(await p.evaluate(() => !__dbg.BR.tasks.includes('drip')), 'в заказе эспрессо шага drip нет: ' + (await p.evaluate(() => __dbg.BR.drink + ' ' + __dbg.BR.tasks.join())));

  /* --- 7. #dev: «Колба полная» --- */
  await p.evaluate(() => document.querySelector('[data-dv="carafe"]') && document.querySelector('[data-dv="carafe"]').click());
  ok(await p.evaluate(() => __dbg.D.carafe.ml === 1200 && !__dbg.D.carafe.brew), 'кнопка песочницы «Колба полная»: 1200 мл');
  await shot('r8_full');

  /* --- 8. помощник (31-8Б, шаг 4): наливает из полной колбы за 10 с, резервирует объём и расход; при пустой колбе заказ остаётся игроку --- */
  await p.evaluate(() => { const d = __dbg; if (d.BR) d.barAbort(); d.G.helper = true; d.G.rank = 5; d.G.eq_drip = true; d.D.carafe.brew = null; d.D.carafe.ml = 1200; d.D.cup = null; d.D.customers.slice().forEach(d.exit); d.applyUpgrades(); });
  await p.waitForTimeout(500);
  const money1 = await p.evaluate(() => __dbg.G.money), costs1 = await p.evaluate(() => __dbg.D.stats.costs);
  await order('0.3');
  await p.waitForFunction(() => __dbg.D.helper && __dbg.D.helper.c, null, { timeout: 15000 });
  ok(await p.evaluate(() => __dbg.D.carafe.ml === 900), 'помощник взял гостя из полной колбы: объём чашки 300 мл зарезервирован (1200 → 900)');
  ok(await p.evaluate(() => __dbg.D.stats.costs) - costs1 === 66, 'расход за чашку при выборе гостя: 66 ₽');
  ok(/Помощник: фильтр-кофе/.test(await p.evaluate(() => document.querySelector('#helperChip').textContent)), 'чип «Помощник: фильтр-кофе»');
  await shot('h1_helper_pours');
  const th = await p.evaluate(() => performance.now());
  await p.waitForFunction(() => !__dbg.D.helper.c, null, { timeout: 20000 });
  const hs = (await p.evaluate(() => performance.now()) - th) / 1000;
  ok(hs > 5 && hs < 12, 'помощник налил за оставшиеся секунды из 10 (прошло ' + hs.toFixed(1) + ' с)');
  ok(await p.evaluate(() => __dbg.D.carafe.ml === 900 && __dbg.D.stats.served >= 1), 'гость обслужен помощником, из колбы ушло 300 мл');
  /* пустая колба: помощник пропускает, гость остаётся, тост один раз */
  await p.evaluate(() => { __dbg.D.carafe.ml = 0; });
  await order('0.3');
  await p.waitForTimeout(2500);
  t = (await toasts()).join(' | ');
  ok(/Фильтр-кофе закончился/.test(t), 'при пустой колбе тост «Фильтр-кофе закончился»: ' + t);
  ok(await p.evaluate(() => !__dbg.D.helper.c && __dbg.D.customers.some(c => c.drink === 'filter_coffee' && !c.leaving)), 'гость остался игроку, помощник его не взял');
  ok(await p.evaluate(() => __dbg.D.customers.filter(c => c.helperSkip).length === 1), 'флаг пропуска один на гостя (тост не повторяется)');
  /* возврат: колба наполнилась, помощник взял гостя, игрок открыл его заказ сам — деньги и объём возвращаются */
  await p.evaluate(() => { __dbg.D.carafe.ml = 1200; });
  await p.waitForFunction(() => __dbg.D.helper && __dbg.D.helper.c, null, { timeout: 15000 });
  const ml1 = await p.evaluate(() => __dbg.D.carafe.ml), costs2 = await p.evaluate(() => __dbg.D.stats.costs);
  await p.evaluate(() => __dbg.barOpen(__dbg.D.helper.c)); await p.waitForTimeout(1500); await PW.dismissCard(p);
  ok(await p.evaluate(() => __dbg.D.carafe.ml) === ml1 + 300, 'игрок открыл заказ сам: зарезервированные 300 мл вернулись в колбу');
  void money1;

  await b.close();
  const bad = errs.filter(e => /^PAGE|error/i.test(e)); if (bad.length) { console.log(bad.join('\n')); fails++; }
  console.log(fails ? 'FAILED ' + fails : 'NO_ERRORS'); process.exit(fails ? 1 : 0);
})();
