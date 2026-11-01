const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, showBook, applyUpgrades };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const p = await require('./pw').page(b);
  const errs = []; require('./pw').watch(p, errs);
  await p.goto(require('./pw').url(tmp) + '#nopixi-lowfx'); await p.waitForTimeout(2500);
  await require('./pw').startNew(p); await p.waitForTimeout(300);
  await p.evaluate(() => { const G = window.__dbg.G; G.rank = 5; G.helper = true; G.milk = true; G.money = 3000; G.day = 13; window.__dbg.applyUpgrades(); });
  await p.waitForFunction(() => window.__dbg.D.customers[0] && window.__dbg.D.customers[0].arrived, null, { timeout: 40000 });
  await p.evaluate(() => { const c = window.__dbg.D.customers[0]; c.drink = 'americano'; c.syrup = null; c.strong = false; c.order.food = null; c.pat = c.max = 999; });
  const m0 = await p.evaluate(() => window.__dbg.G.money); const t0 = await p.evaluate(() => window.__dbg.D.stats.served);
  await p.waitForTimeout(3000); await p.screenshot({ path: 'helper_chip.png', clip: { x: 0, y: 0, width: 600, height: 160 } });
  console.log('chip', await p.evaluate(() => document.querySelector('#helperChip').textContent));
  await p.waitForFunction(() => window.__dbg.D.stats.served > 0, null, { timeout: 60000 });
  console.log('served by helper; money', m0, '->', await p.evaluate(() => window.__dbg.G.money));
  /* 33-В: чай. Без чайной станции помощник его не берёт, с ней берёт, чашка уходит гостю, деньги и счёт растут */
  const setTea = () => window.__dbg.D.customers.find((c) => c.arrived && !c.leaving);
  await p.waitForFunction(() => window.__dbg.D.customers.some((c) => c.arrived && !c.leaving), null, { timeout: 60000 });
  await p.evaluate(() => { const G = window.__dbg.G; G.eq_tea = false; const c = window.__dbg.D.customers.find((x) => x.arrived && !x.leaving); c.drink = 'tea_assam'; c.syrup = null; c.strong = false; c.pat = c.max = 999; Object.assign(c.order, { id: 'tea_assam', key: 'tea_assam', name: 'Чай чёрный ассам', size: '0.2', base: 100, price: 100, cold: false, shots: 0, syrup: null, food: null }); window.__teaId = c.id; });
  await p.waitForTimeout(3500);
  const picked0 = await p.evaluate(() => !!(window.__dbg.D.helper && window.__dbg.D.helper.c && window.__dbg.D.helper.c.id === window.__teaId));
  console.log('без станции помощник взял чай:', picked0);
  if (picked0) { console.log('FAIL: чай без чайной станции'); process.exitCode = 1; }
  const s1 = await p.evaluate(() => window.__dbg.D.stats.served); const m1 = await p.evaluate(() => window.__dbg.G.money);
  await p.evaluate(() => { window.__dbg.G.eq_tea = true; });
  await p.waitForFunction(() => window.__dbg.D.helper && window.__dbg.D.helper.c && window.__dbg.D.helper.c.id === window.__teaId, null, { timeout: 20000 });
  console.log('chip', await p.evaluate(() => document.querySelector('#helperChip').textContent));
  await p.waitForFunction((n) => window.__dbg.D.stats.served > n, s1, { timeout: 60000 });
  const m2 = await p.evaluate(() => window.__dbg.G.money);
  console.log('чай выдан помощником; money', m1, '->', m2, m2 > m1 ? 'OK' : 'FAIL');
  if (!(m2 > m1)) process.exitCode = 1;
  /* 33-Г: холодный чай (нужен льдогенератор): помощник берёт и выдаёт так же */
  const sC = await p.evaluate(() => window.__dbg.D.stats.served); const mC = await p.evaluate(() => window.__dbg.G.money);
  await p.waitForFunction(() => window.__dbg.D.customers.some((c) => c.arrived && !c.leaving && !(window.__dbg.D.helper && window.__dbg.D.helper.c === c)), null, { timeout: 90000 });
  await p.evaluate(() => { const G = window.__dbg.G; G.eq_tea = true; G.eq_ice = true; const c = window.__dbg.D.customers.find((x) => x.arrived && !x.leaving && !(window.__dbg.D.helper && window.__dbg.D.helper.c === x)); c.drink = 'tea_sencha'; c.syrup = null; c.strong = false; c.pat = c.max = 999; Object.assign(c.order, { id: 'tea_sencha', key: 'tea_sencha', name: 'Чай зелёный сенча', size: '0.3', base: 160, price: 160, cold: true, shots: 0, syrup: null, food: null }); window.__coldId = c.id; });
  await p.waitForFunction(() => window.__dbg.D.helper && window.__dbg.D.helper.c && window.__dbg.D.helper.c.id === window.__coldId, null, { timeout: 30000 });
  console.log('chip', await p.evaluate(() => document.querySelector('#helperChip').textContent));
  await p.waitForFunction((n) => window.__dbg.D.stats.served > n, sC, { timeout: 60000 });
  const mC2 = await p.evaluate(() => window.__dbg.G.money);
  console.log('холодный чай выдан помощником; money', mC, '->', mC2, mC2 > mC ? 'OK' : 'FAIL');
  if (!(mC2 > mC)) process.exitCode = 1;
  await p.evaluate(() => window.__dbg.showBook()); await p.waitForTimeout(600); await p.screenshot({ path: 'book.png' });
  console.log(errs.length ? errs.slice(0, 4).join('\n') : 'NO_ERRORS'); await b.close();
})();
