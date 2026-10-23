/* Два кадра рядом на одной высоте: node e2e/pair.js out.png левый.png правый.png [высота]. Инструмент для глаз. */
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [out, a, bb, hs] = process.argv.slice(2), H = +(hs || 430);
  const d = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const b = await chromium.launch(); const p = await b.newPage();
  const url = await p.evaluate(async ({ a, bb, H }) => {
    const L = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([L(a), L(bb)]);
    const wa = Math.round(A.width * H / A.height), wb = Math.round(B.width * H / B.height);
    const c = document.createElement('canvas'); c.width = wa + wb + 12; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, c.width, H); g.drawImage(A, 0, 0, wa, H); g.drawImage(B, wa + 12, 0, wb, H);
    return c.toDataURL('image/png');
  }, { a: d(a), bb: d(bb), H });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); await b.close();
})();
