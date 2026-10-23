/* Склейка кадров в лист: node e2e/sheet.js out.png колонки масштаб файл1 файл2 … (подписи — имена файлов без расширения). Инструмент для глаз, не тест. */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const [out, colsS, scS, ...files] = process.argv.slice(2); const cols = +colsS, sc = +scS;
  const imgs = files.map(f => ({ n: path.basename(f, '.png'), d: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') }));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  const url = await p.evaluate(async ({ imgs, cols, sc }) => {
    const ims = await Promise.all(imgs.map(i => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = i.d; })));
    const w = Math.round(ims[0].width * sc), h = Math.round(ims[0].height * sc), rows = Math.ceil(ims.length / cols), lab = 16;
    const c = document.createElement('canvas'); c.width = w * cols; c.height = (h + lab) * rows; const g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, c.width, c.height); g.font = '12px sans-serif'; g.fillStyle = '#fff';
    ims.forEach((m, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (h + lab); g.drawImage(m, x, y + lab, w, h); g.fillText(imgs[i].n, x + 4, y + 12); });
    return c.toDataURL('image/png');
  }, { imgs, cols, sc });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await b.close();
})();
