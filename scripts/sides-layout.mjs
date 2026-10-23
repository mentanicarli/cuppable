/* Кадры раскладки боковых секций (блок 30-0): простые прямоугольники, без арта.
   Запуск: node scripts/sides-layout.mjs [папка]   (по умолчанию docs/art/sides/s0)
   Результат: <папка>/s0_left.png и s0_right.png (1280×720, 1×) и отчёт о пересечениях в консоли.
   Числа ниже — единственный источник раскладки; таблицы в docs/art/sides/plan.md взяты отсюда.
   Нужны e2e/node_modules (playwright, шрифты); свой Chromium: CHROMIUM=/путь. */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'e2e', 'x.js'));
const { chromium } = require('playwright');
const { css: fontCss } = require('./pw.js');
const out = path.resolve(process.argv[2] || path.join(root, 'docs/art/sides/s0'));
fs.mkdirSync(out, { recursive: true });

/* kind: item — станция (зона = рамка предмета), decor — декор без зоны, wall/counter — где стоит */
const SECTIONS = {
  L: {
    title: 'Чайный бар (левая секция, локальные x 0…1280)',
    arrow: { x: 1092, y: 516, w: 178, h: 30, text: 'стрелка «Кофейный бар»' },
    boxes: [
      { id: 'tea', name: 'Чайная станция', kind: 'item', x: 112, y: 370, w: 226, h: 136 },
      { id: 'matcha', name: 'Набор для матчи', kind: 'item', x: 428, y: 428, w: 266, h: 84 },
      { id: 'powders', name: 'Полка порошков', kind: 'item', x: 716, y: 392, w: 376, h: 118 },
      { id: 'teaShelf', name: 'полка с банками чая', kind: 'decor', x: 130, y: 232, w: 300, h: 74 },
      { id: 'roundWin', name: 'круглое окно', kind: 'decor', x: 1010, y: 150, w: 150, h: 150 },
      { id: 'plant', name: 'растение', kind: 'decor', x: 24, y: 400, w: 70, h: 106 }
    ]
  },
  R: {
    title: 'Холодный бар (правая секция, локальные x 0…1280)',
    arrow: { x: 10, y: 516, w: 178, h: 30, text: 'стрелка «Кофейный бар»' },
    boxes: [
      { id: 'juice', name: 'Холодильник соков и тоника', kind: 'item', x: 66, y: 296, w: 152, h: 214 },
      { id: 'whipper', name: 'Сифон для пены', kind: 'item', x: 262, y: 328, w: 134, h: 182 },
      { id: 'blender', name: 'Блендер', kind: 'item', x: 552, y: 288, w: 130, h: 220 },
      { id: 'boba', name: 'Бабл ти', kind: 'item', x: 716, y: 388, w: 284, h: 122 },
      { id: 'shaker', name: 'Шейкер', kind: 'item', x: 1012, y: 408, w: 150, h: 100 },
      { id: 'glassShelf', name: 'полка со стаканами', kind: 'decor', x: 706, y: 176, w: 296, h: 80 },
      { id: 'window', name: 'окно', kind: 'decor', x: 1040, y: 130, w: 190, h: 190 },
      { id: 'iceBucket', name: 'ведёрко со льдом', kind: 'decor', x: 1182, y: 424, w: 78, h: 82 }
    ]
  }
};

/* занятое интерфейсом, экранные координаты = локальные (камера стоит на секции) */
const UI = [
  { name: 'HUD', x: 0, y: 0, w: 1280, h: 64, always: true },
  { name: 'мини-карта', x: 598, y: 12, w: 168, h: 44, always: true },
  { name: 'билет (кратко)', x: 24, y: 76, w: 840, h: 54, always: true },
  { name: 'билет (развёрнут)', x: 28, y: 136, w: 466, h: 94, always: false },
  { name: 'коуч', x: 472, y: 520, w: 322, h: 100, always: true }
];
const BASE_Y = 506; /* база заднего ряда */
const BAND = { y: 516, h: 30 }; /* полоса стрелок */

const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function report(id, s) {
  const lines = [];
  for (const b of s.boxes) {
    for (const u of UI) if (hit(b, u) && (u.always || b.kind === 'item')) lines.push(`${id}: «${b.name}» пересекает «${u.name}»`);
    if (hit(b, s.arrow)) lines.push(`${id}: «${b.name}» пересекает стрелку`);
    if (b.kind === 'item' && b.y + b.h > BASE_Y + 6) lines.push(`${id}: «${b.name}» ниже базы ${BASE_Y} больше чем на 6 px`);
    if (b.x < 0 || b.x + b.w > 1280) lines.push(`${id}: «${b.name}» вне секции`);
  }
  for (let i = 0; i < s.boxes.length; i++) for (let j = i + 1; j < s.boxes.length; j++) if (hit(s.boxes[i], s.boxes[j])) lines.push(`${id}: «${s.boxes[i].name}» пересекает «${s.boxes[j].name}»`);
  /* предмет под развёрнутым билетом допустим только у декора выше y 232 — проверка выше уже ловит */
  return lines;
}

function svgOf(id, s) {
  const INK = '#4A2F25';
  const r = [];
  r.push(`<rect width="1280" height="720" fill="#F6EAD3"/>`);
  r.push(`<rect y="466" width="1280" height="146" fill="#E9C9A3"/>`); /* столешница y 466–612 */
  r.push(`<rect y="612" width="1280" height="108" fill="#B9906D"/>`); /* фасад тумбы */
  r.push(`<line x1="0" x2="1280" y1="${BASE_Y}" y2="${BASE_Y}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 5" opacity=".5"/>`);
  const onRight = s.arrow.x > 640; /* подпись базы — с той стороны, где нет стрелки */
  r.push(`<text x="${onRight ? 6 : 1274}" y="${BASE_Y + 24}" text-anchor="${onRight ? 'start' : 'end'}" font-size="12" fill="${INK}" opacity=".7">база заднего ряда y ${BASE_Y}</text>`);
  /* свободные полосы штриховкой */
  const hatch = (b, label, col) => {
    r.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#h${col})" stroke="${col === 'R' ? '#C4694A' : '#4F7F86'}" stroke-width="2"/>`);
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="${col === 'R' ? '#9A4A30' : '#2F5F66'}">${label}</text>`);
  };
  for (const u of UI) if (u.name !== 'HUD') hatch(u, `${u.name}${u.always ? '' : ' (по клику)'}`, u.name.startsWith('коуч') ? 'R' : 'B');
  r.push(`<rect x="0" y="0" width="1280" height="64" fill="url(#hB)" stroke="#4F7F86" stroke-width="2"/><text x="200" y="38" text-anchor="middle" font-size="14" font-weight="700" fill="#2F5F66">HUD</text>`);
  hatch(s.arrow, s.arrow.text, 'R');
  r.push(`<rect x="0" y="${BAND.y}" width="1280" height="${BAND.h}" fill="none" stroke="#C4694A" stroke-width="1" stroke-dasharray="2 4"/>`);
  for (const b of s.boxes) {
    const item = b.kind === 'item';
    r.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${item ? '#F0BC55' : '#B9CAA9'}" fill-opacity="${item ? 0.75 : 0.8}" stroke="${INK}" stroke-width="2.5"/>`);
    if (item) r.push(`<rect x="${b.x - 3}" y="${b.y - 3}" width="${b.w + 6}" height="${b.h + 6}" rx="11" fill="none" stroke="#2F5F66" stroke-width="2" stroke-dasharray="7 5"/>`); /* зона */
    const lines = b.name.length > b.w / 9 ? wrap(b.name, Math.floor(b.w / 9)) : [b.name];
    lines.forEach((t, i) => r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + (i - (lines.length - 1) / 2) * 17 + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}">${t}</text>`));
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h - 6}" text-anchor="middle" font-size="11" fill="${INK}" opacity=".75">${b.w}×${b.h}</text>`);
    r.push(`<text x="${b.x + 4}" y="${b.y - 6}" font-size="11" fill="${INK}">x ${b.x}, y ${b.y}</text>`);
  }
  /* легенда */
  const lg = [['#F0BC55', 'предмет станции (рамка), пунктир — зона'], ['#B9CAA9', 'декор (без зоны)'], ['hB', 'занято интерфейсом'], ['hR', 'коуч и стрелки (держим свободно)']];
  r.push(`<rect x="300" y="652" width="680" height="56" rx="10" fill="#FFF8EC" stroke="${INK}" stroke-width="2"/>`);
  r.push(`<text x="316" y="674" font-size="15" font-weight="800" fill="${INK}">${s.title}. Кадр раскладки 1×, без арта.</text>`);
  r.push(`<text x="316" y="696" font-size="13" fill="${INK}">${lg.map((l) => l[1]).join('  ·  ')}</text>`);
  const defs = `<defs><pattern id="hB" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#DDEBEA" fill-opacity=".6"/><line x1="0" y1="0" x2="0" y2="10" stroke="#7FA3A8" stroke-width="3"/></pattern><pattern id="hR" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" fill="#FBE3D8" fill-opacity=".6"/><line x1="0" y1="0" x2="0" y2="10" stroke="#C4694A" stroke-width="3"/></pattern></defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Nunito, sans-serif">${defs}${r.join('')}</svg>`;
}

function wrap(t, n) {
  const w = t.split(' ');
  const res = [];
  let cur = '';
  for (const x of w) {
    if ((cur + ' ' + x).trim().length > n && cur) { res.push(cur); cur = x; } else cur = (cur + ' ' + x).trim();
  }
  if (cur) res.push(cur);
  return res;
}

let bad = 0;
for (const [id, s] of Object.entries(SECTIONS)) {
  const lines = report(id, s);
  bad += lines.length;
  console.log(lines.length ? lines.join('\n') : `${id}: пересечений нет`);
}
const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
for (const [id, s] of Object.entries(SECTIONS)) {
  await page.setContent(`<style>${fontCss}body{margin:0}</style>${svgOf(id, s)}`);
  await page.evaluate(() => document.fonts.ready);
  const f = path.join(out, id === 'L' ? 's0_left.png' : 's0_right.png');
  await page.screenshot({ path: f });
  console.log('записан', path.relative(root, f));
}
await b.close();
process.exit(bad ? 1 : 0);
