/* Склейка крупных планов кофеварки (31-8В): node e2e/levels_sheet.js папка префикс_файлов имя_результата x y w h масштаб, файлы вида <префикс>_<имя>.png */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [dir, prefix, outName, x, y, w, h, k] = process.argv.slice(2); const names = (process.env.NAMES || 'empty,quarter,half,3q,full').split(',');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: names.length * w * k, height: h * k } });
  const imgs = names.map(n => { const f = path.resolve(dir, `${prefix}_${n}.png`); const d = fs.readFileSync(f).toString('base64'); return `<div style="width:${w * k}px;height:${h * k}px;overflow:hidden;position:relative"><img src="data:image/png;base64,${d}" style="position:absolute;left:${-x * k}px;top:${-y * k}px;width:${1280 * k}px;image-rendering:auto"></div>`; });
  await p.setContent(`<body style="margin:0;display:flex;background:#fff">${imgs.join('')}</body>`); await p.waitForTimeout(500);
  await p.screenshot({ path: path.resolve(dir, outName + '.png') }); await b.close(); console.log('ok');
})();
