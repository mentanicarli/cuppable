/* Вырезка прямоугольника из кадра: node e2e/crop.js out.png in.png x y w h [масштаб]. Инструмент для глаз. */
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, inp, x, y, w, h, sc] = process.argv.slice(2); const S = +(sc || 1);
  const b = await chromium.launch(); const p = await b.newPage();
  const url = await p.evaluate(async ({ d, x, y, w, h, S }) => {
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = d; });
    const c = document.createElement('canvas'); c.width = w * S; c.height = h * S; const g = c.getContext('2d'); g.imageSmoothingEnabled = S < 2; g.drawImage(im, x, y, w, h, 0, 0, w * S, h * S); return c.toDataURL('image/png');
  }, { d: 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64'), x: +x, y: +y, w: +w, h: +h, S });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await b.close();
})();
