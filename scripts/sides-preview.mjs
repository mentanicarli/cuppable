/* Быстрый просмотр арта боковой секции (инструмент для глаз, без игры): фон центра (стена, столешница, фасад, кромка) + части из bar-parts-left.json.
   node scripts/sides-preview.mjs <png> [--items tea,matcha,powders] [--crop x,y,w,h] [--scale 2] [--gray] [--section left]
   Без --items рисует все предметы; декор всегда. Для проверки габаритов: --bbox печатает getBBox каждого data-item и сравнивает с data-box (допуск 4 px). */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'e2e', 'x.js'));
const { chromium } = require('playwright');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const out = path.resolve(process.argv[2] || 'out/sides/preview.png');
const section = arg('section', 'left');
const parts = JSON.parse(fs.readFileSync(path.join(root, `src/assets/art/bar-parts-${section}.json`), 'utf8'));
const center = JSON.parse(fs.readFileSync(path.join(root, 'src/assets/art/bar-parts.json'), 'utf8'));
const items = String(arg('items', Object.keys(parts).filter((k) => k !== 'decor').join(',')))
  .split(',').filter(Boolean);
const crop = String(arg('crop', '0,0,1280,720')).split(',').map(Number);
const scale = Number(arg('scale', 1));
const gray = process.argv.includes('--gray');
const body = ['wall', 'counterTop', 'counterFront', 'counterNose'].map((k) => center[k].svg).join('') + (parts.decor ? parts.decor.svg : '') + items.map((k) => parts[k].svg).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#F1DFC2"/>${body}</svg>`;
const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const page = await b.newPage({ viewport: { width: crop[2], height: crop[3] }, deviceScaleFactor: scale });
await page.setContent(`<body style="margin:0;overflow:hidden"><div style="width:${crop[2]}px;height:${crop[3]}px;overflow:hidden;position:relative;${gray ? 'filter:grayscale(1)' : ''}"><div style="position:absolute;left:${-crop[0]}px;top:${-crop[1]}px">${svg}</div></div></body>`);
fs.mkdirSync(path.dirname(out), { recursive: true });
if (process.argv.includes('--bbox')) {
  const res = await page.evaluate(() => [...document.querySelectorAll('[data-item]')].map((g) => {
    const bb = g.getBBox();
    return { id: g.getAttribute('data-item'), box: g.getAttribute('data-box'), got: [bb.x, bb.y, bb.width, bb.height].map((v) => Math.round(v * 10) / 10) };
  }));
  let bad = 0;
  for (const r of res) {
    const want = r.box.split(' ').map(Number);
    const tol = r.got.every((v, i) => Math.abs(v - want[i]) <= 4);
    if (!tol) bad++;
    console.log((tol ? 'ok  ' : 'ОШИБКА ') + r.id.padEnd(14) + 'ожидалось ' + want.join(' ') + '  получено ' + r.got.join(' '));
  }
  process.exitCode = bad ? 1 : 0;
}
await page.screenshot({ path: out });
await b.close();
