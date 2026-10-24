/* Склейка кадров в лист: node e2e/tile.js <папка> <выход.png> <высота кадра px> <колонок> "Заголовок" имя1 имя2 ... (имена без .png; подпись = имя) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [dir, outf, hS, colsS, title, ...names] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 800 } });
  const cell = n => `<div style="text-align:center;font:700 12px sans-serif;color:#4A2F25"><img src="file:///${path.resolve(dir, n + '.png').split(path.sep).join('/')}" style="height:${hS}px;display:block"><span>${n}</span></div>`;
  const html = `<body style="margin:0;padding:12px;background:#F6E9D2"><h2 style="font:800 16px sans-serif;color:#4A2F25;margin:0 0 8px">${title}</h2><div style="display:grid;grid-template-columns:repeat(${colsS},auto);gap:8px;justify-content:start">${names.map(cell).join('')}</div>`;
  const tmp = path.resolve(outf + '.html'); fs.writeFileSync(tmp, html);
  await p.goto('file:///' + tmp.split(path.sep).join('/')); await p.waitForTimeout(600); await p.screenshot({ path: outf, fullPage: true }); await b.close(); fs.unlinkSync(tmp);
})();
