/* 30-4: склейка кадров «чашка гостя 28,8 против 23» (инструмент для глаз). node scripts/spike/guest-cup-compose.cjs out/b30/gd288 out/b30/gd23 docs/art/sides/s4/guest_cup_28_8_vs_23.png */
const { chromium } = require('../../e2e/node_modules/playwright'); const fs = require('fs'); const path = require('path');
const [A, B, OUT] = process.argv.slice(2);
const u = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const rows = [['take_latte_sakura_1280x720_2x.png', 'Гость у стойки с чашкой 0,4 л (2×)'], ['table_latte_sakura_1280x720_2x.png', 'Сидящий гость с чашкой (2×)'], ['hand_latte_sakura_1280x720_4x.png', 'Рука и чашка ×4']];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const html = `<body style="margin:0;background:#fff;font:600 22px Nunito,sans-serif;color:#4A2F25"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">` +
    `<div style="text-align:center;font-size:28px">CUP_TOP_PX.guest = 28,8 (сейчас)</div><div style="text-align:center;font-size:28px">CUP_TOP_PX.guest = 23</div>` +
    rows.map(([f, t]) => [A, B].map(d => `<div><div style="margin:4px 0">${t}</div><img style="max-width:100%;image-rendering:${f.includes('hand') ? 'pixelated' : 'auto'}" src="${u(path.join(d, f))}"></div>`).join('')).join('') + `</div></body>`;
  await p.setContent(html); await p.waitForTimeout(500);
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); await p.screenshot({ path: OUT, fullPage: true }); await b.close();
})();
