/* 30-3: боковые секции у игрока. Обычная игра (без #dev), настоящие события мыши, клавиатуры и касания.
   Чайный бар: покупка чайной станции в магазине → плашка с названием секции → заказ чая → экран «Как листать бар» один раз (старое сохранение без ключа
   why:sections) → тост «станция в другой секции» из центра → стрелка в L → кольцо у чая → окно станции → заварка → возврат (стрелка, A/D, перетаскивание,
   касание) → подача. Холодный бар: то же для бабл ти. Плюс: покупка камеру не двигает, пауза и Esc во время перетаскивания.
   CHROMIUM_ARGS=--mute-audio node e2e/sides_flow.js out/b30/s3-debug.html [папка кадров] */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const shots = process.argv[3] ? path.resolve(process.argv[3]) : null; if (shots) fs.mkdirSync(shots, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, CAM, spawn, barOpen, barShow, applyUpgrades, endDay, ringTarget, exit };';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m); };
const PANEL = new Set(['juice', 'tonic', 'powder', 'boba', 'topping', 'whisk', 'blend', 'shake', 'foam', 'whip', 'layer']);
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.sides.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: shots ? 2 : 1, hasTouch: true }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.addInitScript(() => { let a = 4242; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  const shot = async name => { if (shots) { await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: `${shots}/${name}.png`, timeout: 120000 }); } };
  const cam = () => p.evaluate(() => ({ sec: __dbg.CAM.sec, x: Math.round(__dbg.CAM.x), moving: __dbg.CAM.moving, drag: __dbg.CAM.drag }));
  const at = async (sec, x, msg) => { await p.waitForTimeout(450); const c = await cam(); ok(c.sec === sec && c.x === x && !c.moving && !c.drag, `${msg} (сейчас ${c.sec} ${c.x}${c.moving ? ' в пути' : ''})`); };
  const stageXY = async (x, y) => { const r = await p.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [r.left, r.top, r.width / 1280]; }); return [r[0] + x * r[2], r[1] + y * r[2]]; };
  const drag = async (dx, steps = 8, from = [790, 210]) => { const [x, y] = await stageXY(...from); await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= steps; i++) { await p.mouse.move(x + dx * i / steps, y); await p.waitForTimeout(25); } await p.mouse.up(); };
  const toasts = () => p.evaluate(() => [...document.querySelectorAll('#bFloat .bmsg')].map(e => e.textContent));
  /* все окна «Зачем»/«Новый напиток» подряд: заголовки по порядку */
  const cards = async () => { const t = []; for (let i = 0; i < 8; i++) { await p.waitForTimeout(500); const h = await p.evaluate(() => { const e = document.querySelector('#drinkCard'); return e && !e.hidden ? (e.querySelector('h3') || e).textContent.trim() : null; }); if (!h) break; t.push(h); if (h === await sectionsTitle()) await shot('howto_sections'); await p.click('[data-cardok]'); } return t; };
  const waitFor = (fn, arg, to = 60000) => p.waitForFunction(fn, arg, { timeout: to, polling: 30 });
  const sectionsTitle = () => p.evaluate(() => window.__MENUAPI.WHY_TEXTS['why:sections'].title);

  await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#nopixi-lowfx');
  await PW.startNew(p);
  await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
  ok(await p.evaluate(() => !window.__sec), 'обычная игра: это не #dev (__sec нет)');

  /* ---------- 1. магазин: покупка чайной станции ---------- */
  await p.evaluate(() => {
    const G = __dbg.G, M = window.__MENUAPI; G.rank = 9; G.day = 15; G.served = 300; G.rating = 4.6; G.money = 30000; G.milk = true;
    G.tutorialSeen = M.migrateSeen([], { rank: 9, day: 15, served: 300, milk: true, up: ['milk'] }); /* старое сохранение: ключа why:sections нет */
    __dbg.D.nextArr = 9999; __dbg.endDay();
  });
  await p.waitForSelector('.evening', { timeout: 15000 }); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !__dbg.G.tutorialSeen.includes('why:sections')), 'старое сохранение: ключа why:sections нет');
  await p.click('[data-tab=gear]'); await p.waitForTimeout(300);
  ok(await p.locator('[data-buy=eq_tea]').count() === 1, 'чайная станция есть в магазине (ранг 9)');
  const camBefore = await cam();
  await p.click('[data-buy=eq_tea]'); await p.waitForTimeout(700);
  const note = (await p.textContent('.note.newEq').catch(() => '')).trim(); console.log('плашка покупки:', JSON.stringify(note));
  ok(/^Новое: Чайная станция\./.test(note), 'плашка называет станцию');
  ok(note.includes('Станция в секции «Чайный бар»: нажмите стрелку с этим названием.'), 'плашка называет секцию и стрелку');
  ok(!/слева|справа|сверху|снизу|!/.test(note), 'в плашке нет положений на экране и «!»');
  await shot('plaque_tea');
  const camAfterBuy = await cam(); ok(camAfterBuy.sec === camBefore.sec && camAfterBuy.x === camBefore.x, 'покупка камеру не двигает');
  await p.click('[data-next]'); await p.waitForTimeout(900);
  ok(await p.evaluate(() => __dbg.CAM.sec === 'C' && __dbg.G.eq_tea === true), 'новый день: камера в центре, чай куплен');
  /* гарантия отдачи покупки: среди первых пяти гостей есть заказ, которому нужна чайная станция; камера сама не двигается */
  const first5 = await p.evaluate(() => { const d = __dbg, M = window.__MENUAPI, r = []; d.D.nextArr = 9999; for (let i = 0; i < 5; i++) { d.spawn(); const c = d.D.customers[d.D.customers.length - 1]; r.push(c.order.id); } d.D.customers.slice().forEach(d.exit); return r.map(id => [id, M.DRINK_NEEDS[id].includes('tea')]); });
  console.log('первые пять заказов:', JSON.stringify(first5));
  ok(first5.some(x => x[1]), 'D.focus: среди первых пяти заказов есть чайный (нужна чайная станция)');
  await at('C', 0, 'доставка заказа с боковой станцией камеру не двигает');

  /* ---------- 2. заказ чая: окна, тост, стрелка ---------- */
  const order = async (id) => {
    await p.evaluate(() => { __dbg.D.nextArr = 9999; if (!__dbg.D.customers.length) __dbg.spawn(); });
    await waitFor(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, 90000);
    await p.evaluate(id => {
      const M = window.__MENUAPI, eq = Object.fromEntries(M.EQ_IMPL.map(e => [e, true])); let o;
      for (let i = 0; i < 5000 && !(o && o.id === id); i++) o = M.rollOrder({ rank: 9, day: 15, milk: true, eq }, 'regular');
      o.food = null; const c = __dbg.D.customers[0]; c.order = o; c.drink = o.key; c.syrup = null; c.pumps = 1; c.strong = false; c.pat = c.max = 9999; __dbg.G.hints = true; __dbg.G.tutOff = false;
    }, id);
  };
  const play = async () => { /* шаги заказа: боковая станция по-настоящему, остальное отмечаем готовым */
    const exp = await p.evaluate(() => __dbg.BR.exp.slice());
    for (const t of exp) {
      if (await p.evaluate(tt => !!__dbg.BR.done[tt], t)) continue;
      if (t === 'brew') {
        await PW.clickZone(p, 'tea'); await p.waitForSelector('#xPanel [data-xtemp]', { timeout: 10000 }); await p.waitForTimeout(250); await PW.dismissCard(p);
        const T = await p.evaluate(() => __dbg.BR.xs.brew.temp); await p.click(`#xPanel [data-xtemp="${T}"]`); await p.waitForTimeout(200);
        await p.click('#xPanel [data-xstart]'); await p.waitForTimeout(500);
        await waitFor(() => { const b2 = __dbg.BR.xs.brew; return b2.t >= b2.minutes - 0.05; }, null, 90000);
        await p.click('#xPanel [data-xdone]'); await p.waitForTimeout(400);
        ok(await p.evaluate(() => !!__dbg.BR.done.brew), 'заварка засчитана');
      } else if (PANEL.has(t)) {
        const z = await p.evaluate(tt => window.__MENUAPI.TASK_ZONE[tt], t);
        await PW.clickZone(p, z); await p.waitForSelector('#xPanel [data-xhold]', { timeout: 10000 }); await p.waitForTimeout(250); await PW.dismissCard(p);
        const bx = await p.locator('#xPanel [data-xhold]').boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down();
        await waitFor(tt => { const st = __dbg.BR.xs[tt]; return st.ml !== undefined ? st.ml >= st.target - 1 : st.t >= st.target - 0.05; }, t, 90000);
        await p.mouse.up(); await p.click('#xPanel [data-xdone]'); await p.waitForTimeout(400);
        ok(await p.evaluate(tt => !!__dbg.BR.done[tt], t), `шаг «${t}» засчитан`);
      } else await p.evaluate(tt => { const B = __dbg.BR; B.done[tt] = true; B.res[tt] = 1; }, t);
    }
  };
  const serve = async () => {
    const s0 = await p.evaluate(() => __dbg.D.stats.served);
    console.log('перед подачей:', JSON.stringify(await p.evaluate(() => ({ exp: __dbg.BR.exp, done: __dbg.BR.done, ready: __dbg.BR.ready, inset: __dbg.BR.inset }))));
    await waitFor(() => __dbg.BR && __dbg.BR.ready, null, 15000).catch(() => {});
    await PW.clickZone(p, 'bell'); await p.waitForTimeout(1200);
    const s1 = await p.evaluate(() => __dbg.D.stats.served);
    ok(s1 === s0 + 1, `напиток подан: обслужено ${s0} -> ${s1}`);
  };

  await order('tea_sencha');
  await p.keyboard.press('Space');
  const titles = await cards(); console.log('окна по порядку:', JSON.stringify(titles));
  const st = await sectionsTitle();
  ok(titles.filter(t => t === st).length === 1 && titles[titles.length - 1] === st, 'экран «Как листать бар» показан один раз и последним окном');
  ok(await p.evaluate(() => __dbg.G.tutorialSeen.includes('why:sections') && !!__dbg.BR), 'ключ why:sections записан, бар открыт');
  await at('C', 0, 'вход в бар: камера в центре');
  ok(await p.evaluate(() => __dbg.BR.tasks.includes('brew')), 'в заказе есть заварка чая');
  ok((await p.evaluate(() => [...document.querySelectorAll('.secNavBtn')].filter(e => !e.hidden).map(e => e.textContent.replace(/\s+/g, ' ').trim()))).some(t => /Чайный бар/.test(t)), 'в центре есть стрелка «Чайный бар»');
  /* тост из центра: Space ведёт к станции чая, окно не открывается */
  await p.keyboard.press('Space'); await p.waitForTimeout(500);
  const tt = await toasts(); console.log('тосты:', JSON.stringify(tt));
  ok(tt.includes('Станция «Чайная станция» в секции «Чайный бар». Нажмите стрелку с этим названием.'), 'Space из центра: тост «станция в другой секции»');
  ok(await p.evaluate(() => __dbg.BR.inset === null), 'окно станции не открылось');
  ok(await p.evaluate(() => !!document.querySelector('.secNavBtn.hl:not([hidden])')), 'нужная стрелка подсвечена');
  await at('C', 0, 'тост камеру не двигает');
  await shot('howto_hint_center');

  /* стрелка в L */
  await p.click('[data-secnav="-1"]:not([hidden])'); await at('L', -1280, 'клик по стрелке: «Чайный бар»');
  await p.waitForTimeout(500); ok(!(await toasts()).some(x => /Чайный бар/.test(x)), 'камера приехала в Чайный бар: тоста про него нет');
  const rp = await p.evaluate(() => __dbg.ringTarget()); ok(rp && Math.abs(rp[0] + 1037.5) < 1 && Math.abs(rp[1] - 437) < 1, 'кольцо подсказки у чая: ' + JSON.stringify(rp));
  await shot('L_ring_tea');
  /* выходы из L: клавиша D, стрелка */
  await p.keyboard.press('KeyD'); await at('C', 0, 'D из L: центр');
  await p.keyboard.press('ArrowLeft'); await at('L', -1280, '← из центра: Чайный бар');
  ok(await p.evaluate(() => !document.documentElement.classList.contains('kbd')), '←/→ в баре не включают кольцо фокуса');
  await p.click('[data-secnav="1"]:not([hidden])'); await at('C', 0, 'стрелка из L: центр');
  /* перетаскивание мышью: центр → L (вправо) и обратно (влево) */
  await drag(300); await at('L', -1280, 'перетаскивание вправо: Чайный бар');
  await drag(-300); await at('C', 0, 'перетаскивание влево: центр');
  ok(await p.evaluate(() => __dbg.BR.inset === null), 'после перетаскивания окна нет (клик по зоне погашен)');
  /* касание */
  const touch = async (dx) => p.evaluate(async dx => {
    const svg = document.querySelector('#barSvg'), r = svg.getBoundingClientRect(), k = r.width / 1280; const ev = (t, x, tg) => tg.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: r.top + 210 * k, bubbles: true }));
    const x0 = r.left + 790 * k; ev('pointerdown', x0, svg); for (let i = 1; i <= 8; i++) { ev('pointermove', x0 + dx * k * i / 8, window); await new Promise(res => setTimeout(res, 30)); } ev('pointerup', x0 + dx * k, window);
  }, dx);
  await touch(300); await at('L', -1280, 'касание вправо: Чайный бар');
  await touch(-300); await at('C', 0, 'касание влево: центр');
  /* Esc и пауза (P) во время перетаскивания */
  { const [x, y] = await stageXY(790, 210); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y, { steps: 4 }); await p.mouse.move(x + 140, y, { steps: 4 });
    ok(await p.evaluate(() => __dbg.CAM.drag), 'перетаскивание идёт');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => __dbg.CAM.drag && !document.querySelector('[data-menu="pause"]') && !!__dbg.BR), 'Esc в баре без окна станции ничего не делает: перетаскивание идёт, паузы нет');
    await p.mouse.up(); await p.waitForTimeout(600);
    let c = await cam(); ok(!c.drag && !c.moving && c.sec === 'L', `после Esc и отпускания перетаскивание завершилось (${c.sec} ${c.x})`);
    await p.keyboard.press('KeyD'); await at('C', 0, 'после Esc: D возвращает в центр'); }
  { const [x, y] = await stageXY(790, 210); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y, { steps: 4 }); await p.mouse.move(x + 140, y, { steps: 4 });
    await p.keyboard.press('KeyP'); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('[data-menu="pause"]')), 'P во время перетаскивания открыл паузу');
    await p.mouse.up(); await p.waitForTimeout(600);
    let c = await cam(); ok(!c.drag && !c.moving, `на паузе отпускание: перетаскивание не зависло (${c.sec} ${c.x})`);
    await p.keyboard.press('KeyD'); await p.waitForTimeout(400); const c2 = await cam(); ok(c2.sec === c.sec, 'на паузе A/D камеру не двигают');
    await p.click('[data-resume]'); await p.waitForTimeout(500); c = await cam();
    if (c.sec !== 'C') { await p.keyboard.press('KeyD'); await at('C', 0, 'после паузы листание работает: назад в центр'); } else { await p.keyboard.press('KeyA'); await at('L', -1280, 'после паузы листание работает'); await p.keyboard.press('KeyD'); await at('C', 0, 'и обратно'); } }

  /* готовим чай: зона чая в L, окно, заварка */
  await p.click('[data-secnav="-1"]:not([hidden])'); await at('L', -1280, 'снова в Чайный бар');
  await play();
  ok(await p.evaluate(() => __dbg.CAM.sec === 'L'), 'после заварки камера осталась в Чайном баре');
  await p.keyboard.press('KeyD'); await at('C', 0, 'D: центр');
  await serve();
  console.log('served чай ok');

  /* ---------- 3. Холодный бар: бабл ти ---------- */
  await p.evaluate(() => { const G = __dbg.G; G.eq_ice = true; G.eq_boba = true; G.eq_juice = false; __dbg.applyUpgrades(); });
  await p.waitForTimeout(400); await at('C', 0, 'покупка бабл ти камеру не двигает');
  if (await p.evaluate(() => !!__dbg.D.cup)) await p.evaluate(() => { const d = __dbg; d.D.customers.slice().forEach(d.exit); d.D.cup = null; });
  await p.evaluate(() => { __dbg.D.customers.slice().forEach(__dbg.exit); });
  await order('boba_guava');
  await p.evaluate(() => { __dbg.G.tutorialSeen = __dbg.G.tutorialSeen.filter(k => k === 'why:sections' || !/^why:|^drink:/.test(k)); }); /* окна уже показаны выше; экран про листание второй раз — нет */
  await p.keyboard.press('Space'); const t2 = await cards(); console.log('окна, заказ 2:', JSON.stringify(t2));
  ok(!t2.includes(await sectionsTitle()), '«Как листать бар» второй раз не показан');
  await at('C', 0, 'второй заказ: вход в бар в центре');
  ok(await p.evaluate(() => __dbg.BR.tasks.includes('boba')), 'в заказе есть бабл ти');
  console.log('шаги заказа:', JSON.stringify(await p.evaluate(() => __dbg.BR.exp)));
  await p.evaluate(() => { const B = __dbg.BR; for (const t of B.exp) if (t !== 'boba') { B.done[t] = true; B.res[t] = 1; } }); /* остальное — центр, его проверяют другие сценарии */
  await p.keyboard.press('Space'); await p.waitForTimeout(500);
  ok((await toasts()).some(x => /Станция «Станция бабл ти» в секции «Холодный бар»\. Нажмите стрелку с этим названием\./.test(x)), 'тост про Холодный бар');
  await p.click('[data-secnav="1"]:not([hidden])'); await at('R', 1280, 'стрелка: Холодный бар');
  const rr = await p.evaluate(() => __dbg.ringTarget()); ok(rr && Math.abs(rr[0] - (1280 + 658 + 155)) < 1 && Math.abs(rr[1] - (362 + 74)) < 1, 'кольцо подсказки у бабл ти: ' + JSON.stringify(rr));
  await shot('R_ring_boba');
  await play();
  await p.keyboard.press('KeyA'); await at('C', 0, 'A из R: центр');
  await serve();
  console.log('served бабл ти ok');

  ok(!errs.length, errs.length ? errs.slice(0, 4).join(' | ') : 'ошибок страницы нет');
  console.log(fails ? 'FAILS ' + fails : 'NO_ERRORS'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
