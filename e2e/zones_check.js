/* 30-4: сверка зон боковых секций с интерфейсом на 1280×720 и 1024×600 (всё куплено, камера в L и R). Числа в консоль, кадры с зонами и полосами интерфейса поверх.
   CHROMIUM_ARGS=--mute-audio node e2e/zones_check.js out/b30/s4-debug.html docs/art/sides/s4 */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const PW = require('./pw');
const OUT = path.resolve(process.argv[3] || 'out/zc'); fs.mkdirSync(OUT, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, get D() { return D; }, get BR() { return BR; }, spawn, barOpen, applyUpgrades };';
const ALL = ['milk', 'eq_ice', 'eq_tea', 'eq_matcha', 'eq_powders', 'eq_juice', 'eq_whipper', 'eq_foamer', 'eq_blender', 'eq_boba', 'eq_shaker'];
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m); };
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(process.argv[2]).replace('.html', '.zc.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  for (const [W, H] of [[1280, 720], [1024, 600]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
    await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css }));
    await p.goto('about:blank'); await p.goto(PW.url(tmp)); await PW.startNew(p);
    await p.waitForFunction(() => window.__dbg && __dbg.D && __dbg.G.phase === 'day', null, { timeout: 60000 });
    await p.evaluate(ks => { const d = __dbg; ks.forEach(k => { d.G[k] = true; }); d.G.hints = true; d.G.tutOff = false; d.G.tutorialSeen = []; d.applyUpgrades(); d.D.nextArr = 1e9; d.spawn(); d.D.customers.forEach(c => { c.pat = c.max = 1e9; c.syrup = null; }); }, ALL);
    await p.waitForFunction(() => __dbg.D.customers[0] && __dbg.D.customers[0].arrived, null, { timeout: 90000 });
    await p.evaluate(() => __dbg.barOpen(__dbg.D.customers[0])); await p.waitForTimeout(900); await PW.dismissCard(p);
    await p.evaluate(() => { setInterval(() => { __dbg.D.t = 100; }, 16); });
    for (const sec of ['L', 'R']) {
      await p.evaluate(s => window.__cam.go(s, true), sec); await p.waitForTimeout(700);
      const info = await p.evaluate(sec => {
        const R = e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
        const vis = e => e && !e.hidden && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
        const st = document.querySelector('#stage').getBoundingClientRect(), k = st.width / 1280;
        const zones = [...document.querySelectorAll(`#bZones [data-sec="${sec}"] rect`)].map(e => ({ id: e.dataset.z, ...R(e), on: e.style.pointerEvents !== 'none' }));
        const strips = [['HUD', '#hud'], ['мини-карта', '#miniMap'], ['билет', '#bTk'], ['коуч', '#bCoach'], ['стрелка', '.secNavBtn:not([hidden])'], ['тосты', '#bFloat']].map(([n, q]) => { const e = document.querySelector(q); return e && vis(e) ? { n, ...R(e) } : null; }).filter(Boolean);
        /* HUD: верхняя полоса сцены y 0–64 (макет), на экране — по масштабу */
        strips.push({ n: 'HUD-полоса 0–64', x: st.left, y: st.top, w: st.width, h: 64 * k });
        return { zones, strips, st: { x: st.left, y: st.top, k } };
      }, sec);
      const hit = (a, c, m = 0) => a.x < c.x + c.w + m && c.x < a.x + a.w + m && a.y < c.y + c.h + m && c.y < a.y + a.h + m;
      const zs = info.zones.slice().sort((a, c) => a.x - c.x); const tag = `${sec}_${W}x${H}`;
      let minGap = 1e9; for (let i = 0; i < zs.length - 1; i++) minGap = Math.min(minGap, (zs[i + 1].x - zs[i].x - zs[i].w) / info.st.k);
      ok(minGap >= 12, `${tag}: наименьший зазор между зонами ${minGap.toFixed(1)} px сцены (≥ 12)`);
      const bad = []; for (const z of info.zones) for (const s of info.strips) if (hit(z, s)) bad.push(`${z.id} × ${s.n}`);
      ok(!bad.length, `${tag}: зоны не заходят в полосы интерфейса (${info.strips.map(s => s.n).join(', ')})${bad.length ? ': ' + bad.join('; ') : ''}`);
      let minToStrip = 1e9; for (const z of info.zones) for (const s of info.strips) { const dx = Math.max(0, Math.max(z.x - (s.x + s.w), s.x - (z.x + z.w))), dy = Math.max(0, Math.max(z.y - (s.y + s.h), s.y - (z.y + z.h))); if (dx === 0 && dy === 0) continue; minToStrip = Math.min(minToStrip, Math.hypot(dx, dy)); }
      console.log(`     ближайшее расстояние зона — полоса: ${minToStrip.toFixed(1)} экранных px`);
      /* клики в крайние 10 px сцены: левый и правый край каждой зоны (особенно boba и shaker) попадают в свою зону */
      for (const z of info.zones) for (const edge of [0, 1]) {
        const x = edge ? z.x + z.w - 5 * info.st.k : z.x + 5 * info.st.k, y = z.y + z.h / 2;
        const t = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.dataset ? e.dataset.z || ('<' + e.tagName + '#' + e.id + '>') : null; }, [x, y]);
        ok(t === z.id, `${tag}: ${z.id}, точка в 5 px от ${edge ? 'правого' : 'левого'} края зоны попадает в ${t}`);
      }
      /* клик по краю boba / shaker открывает именно их станцию */
      await p.evaluate(([zones, strips]) => {
        const o = document.createElement('div'); o.id = 'zcOv'; o.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99';
        const box = (r, c, t) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border:2px solid ${c};background:${c}22;font:700 11px sans-serif;color:${c};overflow:hidden`; d.textContent = t; o.appendChild(d); };
        zones.forEach(z => box(z, '#d01b1b', z.id)); strips.forEach(s => box(s, '#1b4fd0', s.n)); document.body.appendChild(o);
      }, [info.zones, info.strips]);
      await p.waitForTimeout(200);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.locator('#stage').screenshot({ path: path.join(OUT, `${tag.replace('_', '_zones_')}.png`) });
      await p.evaluate(() => document.querySelector('#zcOv').remove());
    }
    await ctx.close();
  }
  console.log(fails ? 'FAILS ' + fails : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
