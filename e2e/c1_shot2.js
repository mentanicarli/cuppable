/* Кадры блока 29-1б (инструмент для глаз, не тест): подогрев чашек, портафильтр в четырёх положениях, фазы, фрагмент, зоны, тост и развёрнутый билет поверх верха машины (с замером перекрытия).
   Отладочная сборка. node e2e/c1_shot2.js out/c1/new-debug.html docs/art/center/c1 r2   (1280×720 при 2× и 1024×600) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c1/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'r2';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, tickDay, barOpen, barShow, applyUpgrades, zoneClick, barMsg };');
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  for (const [vp, dsf, suffix] of [[{ width: 1312, height: 752 }, 2, '2x'], [{ width: 1056, height: 632 }, 1, '1024']]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev-nosec'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
    await p.evaluate(() => window.__sandbox.start({ day: 14, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
    await p.evaluate(() => { const d = __dbg; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); d.G.tutOff = true; d.G.hints = false; d.G.milk = true; d.applyUpgrades(); });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.drink = 'cappuccino'; c.order.key = 'cappuccino'; c.order.id = 'cappuccino'; c.order.size = '0.2'; c.order.cold = false; c.order.food = null; __dbg.barOpen(c); });
    await p.waitForTimeout(900); await PW.dismissCard(p);
    const hide = async (v) => p.evaluate(v => document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,.say,#frontHint,#secNav,#miniMap').forEach(e => { e.style.visibility = v; }), v);
    await hide('hidden');
    await p.evaluate(() => { const W = __dbg.WORLD, o = W.paintBar.bind(W); window.__over = {}; W.paintBar = f => o({ ...f, ...window.__over }); });
    const stage = await p.locator('#stage').boundingBox(); const k = stage.width / 1280;
    const shot = async (name, x, y, w, h) => p.screenshot({ path: `${out}/${tag}_${name}_${suffix}.png`, timeout: 120000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
    const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(600); };
    await p.waitForTimeout(800);
    await shot('center_rest', 0, 0, 1280, 720);
    await shot('warmer', 436, 124, 390, 100);
    await shot('fragment', 40, 120, 860, 410);
    const PF = { grinder: { x: 160, y: 440 }, mat: { x: 330, y: 470 }, group: { x: 630, y: 350 } };
    await over({ pf: PF.grinder, cof: true, dose: 30 }); await shot('pf_grinder', 60, 330, 260, 190);
    await over({ pf: PF.mat, cof: true, dose: 30 }); await shot('pf_mat', 230, 360, 260, 190);
    await over({ pf: PF.group, cof: true, dose: 30 }); await shot('pf_group', 510, 280, 300, 200);
    await over({ pf: PF.group, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } }); await shot('pf_stream', 510, 280, 300, 250);
    const PH = {
      grind: { pf: PF.grinder, cof: true, dose: 26, grindDeg: 40 },
      tamp: { pf: PF.mat, cof: true, dose: 30, tamperUp: true },
      shot: { pf: PF.group, cof: true, dose: 30, gaugeDeg: 70, stream: { y: 354, h: 110, col: '#4A2E20' } },
      steam: { pf: PF.group, cof: false, dose: 0, steam: true, gaugeDeg: 40, pitH: 52 },
      serve: { pf: PF.mat, cof: false, dose: 0, ready: true, bell: 0.06 }
    };
    for (const [name, o] of Object.entries(PH)) { await over(o); await shot('phase_' + name, 40, 120, 1100, 440); }
    await over({ pf: PF.grinder, cof: false, dose: 0 });
    await p.evaluate(() => { document.querySelectorAll('#bZones rect').forEach(r => { r.style.fill = 'rgba(214,69,65,.18)'; r.style.stroke = '#D64541'; r.style.strokeWidth = '2'; }); });
    await p.waitForTimeout(300); await shot('zones', 0, 0, 1280, 720);
    await p.evaluate(() => { document.querySelectorAll('#bZones rect').forEach(r => { r.style.fill = ''; r.style.stroke = ''; r.style.strokeWidth = ''; }); });
    /* тост и развёрнутый билет поверх верха машины */
    await hide('visible');
    await p.evaluate(() => { __dbg.barMsg('Нужно подержать пар, пока молоко не нагреется'); const m = document.querySelector('#bTk [data-tkmore]'); if (m) m.click(); });
    await p.waitForTimeout(700);
    const rep = await p.evaluate(() => {
      const st = document.querySelector('#stage').getBoundingClientRect(), K = st.width / 1280;
      const rc = el => { const r = el.getBoundingClientRect(); return { x: (r.left - st.left) / K, y: (r.top - st.top) / K, w: r.width / K, h: r.height / K }; };
      const q = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => ({ s, ...rc(e), t: e.textContent.slice(0, 40) }));
      return [...q('#bTk'), ...q('#bTk .tkDrop'), ...q('#bFloat > *'), ...q('#toast')];
    });
    const warmer = { x: 446, y: 137, w: 368, h: 60 }; /* поднос и чашки */
    const ov = r => { const x = Math.max(0, Math.min(r.x + r.w, warmer.x + warmer.w) - Math.max(r.x, warmer.x)), y = Math.max(0, Math.min(r.y + r.h, warmer.y + warmer.h) - Math.max(r.y, warmer.y)); return Math.round(x * y); };
    console.log(suffix, 'перекрытие с подносом и чашками (px² при 1280×720):'); rep.forEach(r => console.log('  ', r.s, JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }), 'пересечение', ov(r), r.t.replace(/\s+/g, ' ')));
    await shot('toast_ticket', 0, 0, 1280, 330);
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
