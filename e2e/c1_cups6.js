/* Кадры 29-1е (инструмент для глаз): чашки на подогреве (вектор из machine.svg) и игровая керамическая чашка (drinkArt) в 6× без размытия: оба рисуются как SVG в нужном масштабе, а не растром.
   Отладочная сборка. node e2e/c1_cups6.js out/c1/new6-debug.html docs/art/center/c1 r6 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c1/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'r6';
const pal = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../art-src/palette.json'), 'utf8'));
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev-nosec'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
  await p.evaluate(() => window.__sandbox.start({ day: 14, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
  const game = await p.evaluate(() => window.__dbg.WORLD.drinkArt({ id: 'cappuccino', size: '0.2', cold: false }, 1));
  const parts = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/assets/art/bar-parts.json'), 'utf8'));
  const machine = parts.machine.svg;
  /* куски чашек из собранной части: всё от первой группы чашек до поднося (поднос y 184 — следующий rect) */
  const i0 = machine.indexOf('<g><ellipse'), i1 = machine.indexOf('<rect x="446" y="184"');
  const cups = machine.slice(i0, i1), tray = machine.slice(i1, machine.indexOf('<rect x="456" y="201"'));
  const S = 6;
  const c = await ctx.newPage();
  await c.setContent(`<body style="margin:0;background:#F6D49F"><div style="display:flex;align-items:flex-end;gap:40px;padding:20px;background:#F6D49F">
  <svg viewBox="470 134 200 54" width="${200 * S}" height="${54 * S}" stroke="#4A2F25" stroke-linejoin="round" stroke-linecap="round">${cups}${tray}</svg>
  <div style="background:#3B2F2A;padding:10px;width:${110 * S}px;height:${54 * S}px;overflow:hidden;display:flex;align-items:flex-end;justify-content:center"><div style="width:${110 * S}px">${(game || '').replace('<svg ', '<svg style="width:100%;height:auto" ')}</div></div></div>`);
  await c.waitForTimeout(400);
  await c.locator('div').first().screenshot({ path: `${out}/${tag}_compare_cups_6x.png` });
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
