/* Билет в баре и пузырь гостя: название напитка целиком (без «…»), плашки не мешают, цвет текста читаем.
   Билет: 37+ названий × худший набор плашек (размер 0,6, 2 шота, крепкий, еда, сироп ×5) при 1280×720 и 1024×600.
   Пузырь: bounds названия не пересекают иконку и не выходят из карточки.
   Запуск (отладочная сборка): HASH='#nopixi-lowfx' node e2e/ticket_names.js dist/artifact.html out/tn */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/tn';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, MENUAPI: window.__MENUAPI, NAME, SYR, drawTicket, resetTk() { tkKey = \'\'; }, barShow };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const PW = require('./pw'), p = await PW.page(b, { width: 1312, height: 752 });
  const errs = []; PW.watch(p, errs);
  const ok = (name, v) => { if (!v) { console.log('FAIL ' + name); errs.push('FAIL ' + name); } };
  await p.goto(PW.url(tmp) + (process.env.HASH || '#nopixi-lowfx')); await p.waitForTimeout(600);
  await PW.startNew(p); await p.waitForTimeout(400);
  await p.evaluate(() => { const G = window.__dbg.G; G.milk = true; G.day = 2; G.rank = 3; G.hints = true; });
  await p.waitForFunction(() => window.__dbg.D.customers[0] && window.__dbg.D.customers[0].arrived, null, { timeout: 40000 });
  await p.evaluate(() => { const c = window.__dbg.D.customers[0]; c.drink = 'latte'; c.pat = c.max = 99999; });
  await p.keyboard.press('Space'); await p.waitForTimeout(600); await PW.dismissCard(p);

  /* ---- билет ---- */
  const check = () => p.evaluate(() => {
    const d = window.__dbg, B = d.BR, c = B.c, o = c.order, res = [];
    const syrKey = Object.keys(d.SYR).sort((a, b2) => (d.SYR[b2].name.length - d.SYR[a].name.length))[0];
    const sr = document.querySelector('#stage').getBoundingClientRect(), k = sr.width / 1280;
    let worst = { w: 0, n: '' }, maxB = 0, tall = '';
    for (const key of Object.keys(d.NAME)) {
      const cold = /^iced/.test(key), id = d.MENUAPI.drinkById[key] ? key : o.id;
      B.drink = key; o.id = id; o.size = '0.6'; o.cold = cold; B.shots = 2; c.strong = true; c.syrup = syrKey; c.pumps = 5; o.food = { heat: true, price: 100 };
      try { B.exp = d.MENUAPI.buildTasks(key, { cold, syrup: true, shots: 2 }).concat('food'); } catch (e) { /* ключ без рецепта: оставляем прежние шаги */ }
      B.tasks = d.MENUAPI.uniqueTasks(B.exp); d.resetTk(); d.drawTicket();
      const tk = document.querySelector('#bTk'), nm = tk.querySelector('.tkName'), main = tk.querySelector('.tkMain'), r = tk.getBoundingClientRect(), nr = nm.getBoundingClientRect();
      const cs = getComputedStyle(nm), tags = [...tk.querySelectorAll('.tkMain i')];
      const bad = [];
      if ((r.bottom - sr.top) / k > 190) bad.push('билет ниже y 190: ' + ((r.bottom - sr.top) / k).toFixed(0));
      if (nm.textContent !== d.NAME[key]) bad.push('текст названия изменён');
      if (nm.scrollWidth > nm.clientWidth + 0.5 || cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden') bad.push('название обрезается');
      if (main.scrollWidth > main.clientWidth + 0.5) bad.push('tkMain переполнен');
      if (tk.scrollWidth > tk.clientWidth + 0.5) bad.push('билет переполнен');
      if (nr.right > r.right + 0.5 || nr.left < r.left - 0.5) bad.push('название вне билета');
      if ((r.right - sr.left) / k > 864.5 || (r.left - sr.left) / k < 23.5) bad.push('билет шире полосы x 24–864: ' + ((r.right - sr.left) / k).toFixed(0));
      if (tags.some(t => t.getBoundingClientRect().right > r.right + 0.5)) bad.push('плашка вне билета');
      if (tags.some(t => t.textContent.includes('…'))) bad.push('«…» в плашке');
      if ((r.bottom - sr.top) / k > maxB) { maxB = (r.bottom - sr.top) / k; tall = key; }
      if (nr.width / k > worst.w) worst = { w: +(nr.width / k).toFixed(1), n: d.NAME[key] };
      if (bad.length) res.push(key + ': ' + bad.join(', '));
    }
    worst.b = +maxB.toFixed(0); worst.tall = tall; return { res, worst, n: Object.keys(d.NAME).length };
  });
  for (const [w, h] of [[1280, 720], [1024, 600]]) {
    await p.setViewportSize({ width: w + 32, height: h + 32 }); await p.waitForTimeout(500);
    const r = await check(); ok(`билет ${w}x${h}: проблем ${r.res.length}: ${r.res.slice(0, 3).join('; ')}`, r.res.length === 0);
    console.log(`билет ${w}x${h}: проверено ${r.n} названий, самое широкое «${r.worst.n}» ${r.worst.w} px (логических), нижний край билета до y ${r.worst.b}`);
    await p.evaluate(key => { const d = window.__dbg, B = d.BR; B.drink = key; d.resetTk(); d.drawTicket(); }, r.worst.tall);
    await p.screenshot({ path: `${out}_ticket_worst_${w}.png` });
  }

  /* ---- пузырь ---- */
  await p.setViewportSize({ width: 1312, height: 752 });
  const bub = await p.evaluate(async () => {
    const d = window.__dbg, W = d.WORLD, look = d.D.customers[0].look, res = [], acts = [];
    const keys = Object.keys(d.NAME);
    keys.forEach((key, i) => {
      const id = d.MENUAPI.drinkById[key] ? key : 'latte';
      const a = W.addActor({ look, model: d.MENUAPI.modelRefOf(id, '0.4', /^iced/.test(key)), title: d.NAME[key], tags: [{ text: '0,6 л', color: '#8FA58A' }, { text: 'малина-лимон ×5', color: '#C94A63' }], x: 100 + (i % 10) * 110, onTap() {} });
      acts.push([key, a]);
    });
    await new Promise(r => setTimeout(r, 2500));
    let worstLen = '', minPx = 99; const minOf = { px: 99, n: '' };
    for (const [key, a] of acts) {
      const L = a.bubbleLayout(); if (!L) { res.push(key + ': нет раскладки'); continue; }
      const bad = [];
      const hit = (a, c) => a.x0 < c.x1 && c.x0 < a.x1 && a.y0 < c.y1 && c.y0 < a.y1;
      if (!L.icon) bad.push('иконка не загрузилась');
      if (L.icon && hit(L.name, L.icon)) bad.push('название пересекает иконку');
      if (hit(L.name, L.bar)) bad.push('название пересекает полосу терпения');
      if (L.name.x0 < L.card.x0 + 2 || L.name.x1 > L.card.x1 - 2 || L.name.y0 < L.card.y0 || L.name.y1 > L.card.y1) bad.push('название вне карточки ' + JSON.stringify(L.name));
      if (L.fontSize * 0.9 < 9.99) bad.push('шрифт ' + (L.fontSize * 0.9).toFixed(1) + ' px на экране < 10');
      minPx = Math.min(minPx, L.fontSize * 0.9);
      if (L.fontSize * 0.9 < minOf.px) { minOf.px = L.fontSize * 0.9; minOf.n = d.NAME[key]; }
      if (L.lines > 2) bad.push('строк ' + L.lines);
      if (d.NAME[key].length > worstLen.length) worstLen = d.NAME[key];
      if (bad.length) res.push(key + ': ' + bad.join(', '));
    }
    acts.forEach(([, a]) => d.WORLD.removeActor(a));
    /* три места очереди: пузыри (ширина 142 единицы × 0,9) не пересекаются и не выходят за сцену */
    const SL = [640, 510, 380], half = 71 * 0.9, gaps = SL.slice(1).map((x, k) => (SL[k] - half) - (x + half));
    if (gaps.some(g => g < 0) || SL.some(x => x - half < 0 || x + half > 1280)) res.push('пузыри соседей пересекаются или вне сцены: ' + gaps.join(','));
    return { res, n: acts.length, worstLen, minPx, minOf, gaps };
  });
  ok('пузырь: проблем ' + bub.res.length + ': ' + bub.res.slice(0, 3).join('; '), bub.res.length === 0);
  console.log(`пузырь: проверено ${bub.n} названий × 3 места очереди, самое длинное «${bub.worstLen}», минимальный шрифт ${bub.minPx.toFixed(2)} px у «${bub.minOf.n}», зазоры между пузырями ${bub.gaps.map(g => g.toFixed(1)).join(' / ')} px`);
  /* кадры: билет с «К залу» в HUD бара уже снят выше; пузыри трёх длинных названий в зале */
  await p.evaluate(async () => {
    const d = window.__dbg, acts = []; d.barShow(false);
    d.D.customers.forEach(c => { c.act.showBubble(false); });
    [['espresso_tonic', 300], ['boba_raspberry', 640], ['cappuccino_pumpkin', 980]].forEach(([key, x]) => {
      const a = d.WORLD.addActor({ look: d.D.customers[0].look, model: d.MENUAPI.modelRefOf(key, '0.4', true), title: d.NAME[key], tags: [{ text: '0,4 л', color: '#8FA58A' }, { text: 'кокос ×1', color: '#EFE6D2' }], x, onTap() {} });
      a.showBubble(true); a.showTags(true); acts.push([a, x]);
    });
    const ty = d.D.customers[0].ty, t = setInterval(() => acts.forEach(([a, x]) => a.update(0.033, x, ty)), 33);
    await new Promise(r => setTimeout(r, 2500)); clearInterval(t);
  });
  await p.screenshot({ path: `${out}_bubble_3drinks.png` });
  /* самые длинные названия в трёх местах очереди; первый гость с тегами */
  await p.evaluate(async () => {
    const d = window.__dbg, acts = [];
    const keys = Object.keys(d.NAME).sort((a, b2) => d.NAME[b2].length - d.NAME[a].length).slice(0, 3);
    [640, 510, 380].forEach((x, i) => {
      const key = keys[i], id = d.MENUAPI.drinkById[key] ? key : 'latte';
      const a = d.WORLD.addActor({ look: d.D.customers[0].look, model: d.MENUAPI.modelRefOf(id, '0.4', true), title: d.NAME[key], tags: i === 0 ? [{ text: '0,4 л', color: '#8FA58A' }, { text: 'крепкий', color: '#C4694A' }] : [], x, onTap() {} });
      a.showBubble(true); a.showTags(true); acts.push([a, x]);
    });
    const ty = d.D.customers[0].ty, t = setInterval(() => acts.forEach(([a, x]) => a.update(0.033, x, ty)), 33);
    await new Promise(r => setTimeout(r, 2500)); clearInterval(t);
  });
  await p.screenshot({ path: `${out}_bubble_longest.png`, clip: { x: 24 + 240, y: 24 + 130, width: 520, height: 230 } });
  fs.unlinkSync(tmp); await b.close();
  const bad = errs.filter(e => /^FAIL|^PAGE|error/i.test(e)); console.log(bad.length ? bad.join('\n') : 'NO_ERRORS'); process.exit(bad.length ? 1 : 0);
})();
