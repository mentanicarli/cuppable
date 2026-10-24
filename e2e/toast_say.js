/* 31-9: тост зала и реплика гостя не налезают друг на друга (худший случай: гость у левого края, реплика под тостом), 1280×720 и 1024×600.
   CHROMIUM_ARGS=--mute-audio node e2e/toast_say.js dist/artifact.html docs/art/fixes/31-9   (отладочная сборка) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/toast'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, spawn, toast, showSay, hideSay, placeSay, placeToast };';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m); };
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(process.argv[2]).replace('.html', '.ts.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  for (const [W, H] of [[1280, 720], [1024, 600]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await p.goto(PW.url(tmp)); await PW.startNew(p);
    await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
    await p.evaluate(() => { const d = __dbg; d.G.tutOff = true; d.G.hints = false; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; }); });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    const tag = `${W}x${H}`;
    /* раскладочные координаты сцены (offset*, без масштаба и без анимаций transform): тост — по своему положению, реплика — по left (центр) и bottom */
    const rects = () => p.evaluate(() => {
      const t = document.querySelector('#toast');
      const tb = t.classList.contains('low') ? { x: (1280 - t.offsetWidth) / 2, y: 720 - parseFloat(getComputedStyle(t).bottom) - t.offsetHeight, w: t.offsetWidth, h: t.offsetHeight } : { x: t.offsetLeft, y: t.offsetTop, w: t.offsetWidth, h: t.offsetHeight };
      return { toast: tb, low: t.classList.contains('low'), says: [...document.querySelectorAll('.say')].map(d => ({ x: parseFloat(d.style.left) - d.offsetWidth / 2, y: 720 - parseFloat(d.style.bottom) - d.offsetHeight, w: d.offsetWidth, h: d.offsetHeight })) };
    });
    const hit = (a, c, g = 0) => a.x < c.x + c.w + g && c.x < a.x + a.w + g && a.y < c.y + c.h + g && c.y < a.y + a.h + g;
    /* гость у левого края (как при приходе), реплика над его пузырём, потом тост */
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.px = 110; c.x = 110; c.tx = 110; c.act.root && 0; __dbg.showSay(c); });
    await p.waitForTimeout(900);
    await p.evaluate(() => __dbg.toast('Сначала обслужите первого гостя'));
    await p.waitForTimeout(700);
    let r = await rects();
    ok(r.says.length === 1, `${tag}: реплика на экране`);
    ok(r.says.every(s => !hit(r.toast, s, 6)), `${tag}: тост (${Math.round(r.toast.x)},${Math.round(r.toast.y)}) не задевает реплику (${r.says.map(s => Math.round(s.x) + ',' + Math.round(s.y) + ',' + Math.round(s.w) + '×' + Math.round(s.h)).join(' ')})`);
    ok(r.toast.x >= 0 && r.toast.x + r.toast.w <= 1280 && r.toast.y + r.toast.h <= 720, `${tag}: тост внутри сцены`);
    await p.evaluate(() => { document.querySelectorAll('#devBtn,#devPanel').forEach(e => { e.style.visibility = 'hidden'; }); });
    await p.locator('#stage').screenshot({ path: `${out}/t1_toast_say_${tag}.png`, timeout: 120000 });
    console.log(`   тост ${r.low ? 'внизу по центру' : 'наверху слева'}`);
    /* реплика ушла: тост возвращается на обычное место */
    await p.evaluate(() => { __dbg.D.customers.forEach(c => { __dbg.hideSay(c); c.sayDone = true; }); __dbg.toast('Сначала обслужите первого гостя'); });
    await p.waitForTimeout(1600); r = await rects();
    await p.waitForTimeout(400); r = await rects();
    ok(!r.low && Math.round(r.toast.x) === 24 && Math.round(r.toast.y) === 70, `${tag}: без реплик тост на обычном месте (24, 70): ${Math.round(r.toast.x)}, ${Math.round(r.toast.y)}`);
    /* гость в слоте очереди, длинная реплика */
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.px = 380; c.x = 380; c.tx = 380; c.sayDone = false; __dbg.showSay(c); __dbg.toast('Фильтр-кофе закончился'); });
    await p.waitForTimeout(900); r = await rects();
    ok(r.says.every(s => !hit(r.toast, s, 6)), `${tag}: гость в слоте 380: тост и реплика не пересекаются`);
    await p.locator('#stage').screenshot({ path: `${out}/t2_toast_say_slot_${tag}.png`, timeout: 120000 });
    await ctx.close();
  }
  await b.close();
  console.log(errs.length ? 'ERRORS:' + errs.join(' | ') : 'NO_ERRORS'); if (fails) { console.log('FAILED ' + fails); process.exit(1); }
})();
