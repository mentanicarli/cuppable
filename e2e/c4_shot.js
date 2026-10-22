/* Кадры блока 29-4 (инструмент для глаз): шаг 0 — таблички бутылок и «молоко» (1× и 2×); шаг 2 — центр с молоком и без, стыки центр/боковые секции (4×), кромка столешницы (4×).
   Отладочная сборка. STEP=0 node e2e/c4_shot.js out/c4/new0-debug.html docs/art/center/c4 c4   — только шаг 0
                    node e2e/c4_shot.js out/c4/new-debug.html docs/art/center/c4 c4          — все кадры (шаг 2)
   Состояние подменяется через WORLD.paintBar, остальное считает игра. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/c4/shot'); fs.mkdirSync(out, { recursive: true });
const tag = process.argv[4] || 'c4';
const STEP0 = process.env.STEP === '0';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, WORLD, spawn, barOpen, applyUpgrades };');
  if (!src.includes('window.__dbg')) { console.error('нужна отладочная сборка'); process.exit(2); }
  const tmp = path.resolve(process.argv[2]).replace('.html', '.dbg.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean) });
  const errs = [];
  const PF = { grinder: { x: 160, y: 440 } };
  const cfg = STEP0 ? [[{ width: 1312, height: 752 }, 1, '1x'], [{ width: 1312, height: 752 }, 2, '2x']] : [[{ width: 1312, height: 752 }, 2, '2x'], [{ width: 1056, height: 632 }, 1, '1024'], [{ width: 1312, height: 752 }, 4, '4x']];
  for (const [vp, dsf, suffix] of cfg) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
    await p.goto('about:blank'); await p.goto(PW.url(tmp) + '#dev'); await p.waitForSelector('[data-sandbox]', { timeout: 60000 }); await p.waitForTimeout(400);
    await p.evaluate(() => window.__sandbox.start({ day: 14, profile: 'medium' })); await p.waitForSelector('#screen', { state: 'hidden', timeout: 20000 });
    await p.evaluate(() => { const d = __dbg; d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); d.G.tutOff = true; d.G.hints = false; d.G.milk = true; d.applyUpgrades(); });
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => { const c = __dbg.D.customers[0]; c.drink = 'espresso'; c.order.key = 'espresso'; c.order.id = 'espresso'; c.order.size = '0.2'; c.order.cold = false; c.order.food = null; __dbg.barOpen(c); });
    await p.waitForTimeout(900); await PW.dismissCard(p);
    await p.evaluate(() => document.querySelectorAll('#hud,#bTk,#bCoach,#toast,#bFloat,#bGoal,.say,#frontHint,#secNav,#miniMap').forEach(e => { e.style.visibility = 'hidden'; }));
    await p.evaluate(() => { const W = __dbg.WORLD, o = W.paintBar.bind(W); window.__over = {}; W.paintBar = f => o({ ...f, ...window.__over }); });
    const stage = await p.locator('#stage').boundingBox(); const k = stage.width / 1280;
    const shot = async (name, x, y, w, h, file) => p.screenshot({ path: file || `${out}/${tag}_${name}_${suffix}.png`, timeout: 180000, clip: { x: stage.x + x * k, y: stage.y + y * k, width: w * k, height: h * k } });
    const over = async (o) => { await p.evaluate(o => { window.__over = o; }, o); await p.waitForTimeout(700); };
    const milk = async (on) => { await p.evaluate((on) => { __dbg.G.milk = on; __dbg.applyUpgrades(); }, on); await p.waitForTimeout(700); };
    const go = async (id) => { await p.evaluate(id => window.__sec.go(id, true), id); await p.waitForTimeout(900); };
    await p.waitForTimeout(800);
    await over({ pf: PF.grinder, cof: false, dose: 0, pitH: 40 });
    if (process.env.HIDE) {
      /* без стены и столешницы: у старой сборки скрыт первый спрайт (static), у новой первые два (wall, counterTop); всё остальное должно совпасть побитово */
      await p.evaluate((m) => { const ch = __dbg.WORLD.bar.world.children; ch[2].visible = false; if (m === 'new') ch[3].visible = false; }, process.env.HIDE);
      await p.waitForTimeout(500); await shot('center_hidden', 0, 0, 1280, 720, `${out}/hidden_2x.png`);
    } else if (STEP0) {
      await shot('syrup_labels', 850, 160, 240, 180, `${out}/syrup_labels_${suffix}.png`);
      await shot('milk_label', 1050, 230, 220, 290, `${out}/milk_label_${suffix}.png`);
      if (suffix === '2x') await shot('center_milk', 0, 0, 1280, 720, `${out}/center_milk_2x.png`);
    } else if (suffix !== '4x') {
      await shot('center_milk', 0, 0, 1280, 720);
      await milk(false); await shot('center_nomilk', 0, 0, 1280, 720); await milk(true);
    } else {
      /* стыки: правая полоса боковой секции (камера на ней) и левая полоса центра рядом; то же справа */
      const strip = async (sec, x, w, name) => { await go(sec); await shot(name, x, 380, w, 260, `${out}/_${name}.png`); };
      await strip('L', 1240, 40, 'L_edge'); await strip('C', 0, 40, 'C_left'); await strip('C', 1240, 40, 'C_right'); await strip('R', 0, 40, 'R_edge'); await go('C');
      const img = n => 'data:image/png;base64,' + fs.readFileSync(`${out}/_${n}.png`).toString('base64');
      const c = await ctx.newPage();
      for (const [name, a, bb] of [['seam_left', 'L_edge', 'C_left'], ['seam_right', 'C_right', 'R_edge']]) {
        await c.setContent(`<body style="margin:0;background:#fff"><div style="display:inline-flex;gap:0;background:#f0f"><img style="display:block;width:80px" src="${img(a)}"><img style="display:block;width:80px" src="${img(bb)}"></div>`); await c.waitForTimeout(300);
        await c.locator('div').screenshot({ path: `${out}/${tag}_${name}_4x.png` });
      }
      await c.close();
      await shot('counter_edge', 300, 590, 160, 70);
      for (const n of ['L_edge', 'C_left', 'C_right', 'R_edge']) fs.unlinkSync(`${out}/_${n}.png`);
    }
    await ctx.close();
  }
  console.log(errs.length ? errs.slice(0, 5).join('\n') : 'NO_ERRORS'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
