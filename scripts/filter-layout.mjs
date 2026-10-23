/* Схемы размещения капельной кофеварки (блок 31-8, этап A): три варианта, простые прямоугольники без арта, 1280×720, масштаб 1×.
   Запуск: node scripts/filter-layout.mjs [папка]   (по умолчанию docs/art/fixes/31-8)
   Результат: filter_A_right, filter_B_left, filter_C_center (.svg и .png); в консоль — зазоры и пересечения.
   Числа ниже — единственный источник раскладки; таблицы в docs/design/filter-coffee.md взяты отсюда. Нужны e2e/node_modules (playwright). */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'e2e', 'x.js'));
const { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || path.join(root, 'docs/art/fixes/31-8'));
fs.mkdirSync(out, { recursive: true });

const BASE = 506; /* база заднего ряда */
const S = 1.1; /* раскладка ×1,10, как у остальных предметов боковых секций */
/* кофеварка: проектный размер 112 × 158 px (24 × 34 см при 4,64 px/см), итог ×1,10 = 123,2 × 173,8 */
const BREW = { w: 112 * S, h: 158 * S };
const UI = [
  { name: 'HUD', x: 0, y: 0, w: 1280, h: 64 },
  { name: 'билет', x: 24, y: 76, w: 840, h: 54 },
  { name: 'билет развёрнут', x: 28, y: 136, w: 466, h: 94, soft: true },
  { name: 'тосты', x: 484, y: 136, w: 380, h: 120, soft: true },
  { name: 'коуч', x: 472, y: 520, w: 322, h: 100 }
];
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/* равные промежутки между рамками слева направо */
const evenGaps = (list, left, right) => {
  const sum = list.reduce((a, b) => a + b.w, 0), gap = (right - left - sum) / (list.length - 1);
  let x = left;
  const laid = list.map((b) => { const r = { ...b, x: +x.toFixed(1) }; x += b.w + gap; return r; });
  return { laid, gap: +gap.toFixed(1) };
};
const place = (list) => list.map((b) => ({ ...b, y: +(BASE - b.h).toFixed(1) }));

/* A. Правая секция «Холодный бар»: кофеварка между шейкером и ведёрком (рядом с раковиной: вода рядом) */
const A = (() => {
  const base = [
    { id: 'juice', name: 'холодильник соков', w: 167.2, h: 235 }, { id: 'whipper', name: 'сифон', w: 148.5, h: 196 },
    { id: 'blender', name: 'блендер', w: 146.3, h: 240 }, { id: 'shaker', name: 'шейкер', w: 162.8, h: 113 },
    { id: 'drip', name: 'КОФЕВАРКА', w: BREW.w, h: BREW.h, isNew: true },
    { id: 'bucket', name: 'ведёрко', w: 86.9, h: 89, decor: true }, { id: 'sink', name: 'раковина', w: 190.3, h: 62, decor: true }
  ];
  const { laid, gap } = evenGaps(base, 14, 1256.3);
  return { title: 'А. Правая секция «Холодный бар»: кофеварка между шейкером и ведёрком', arrow: { x: 10, y: 516, w: 178, h: 30 }, gap, items: place(laid), extra: [{ id: 'glassShelf', name: 'полка со стаканами (стена)', x: 706, y: 176, w: 326, h: 88, decor: true }] };
})();
/* Б. Левая секция «Чайный бар»: пять предметов, все в масштабе ×1,0 вместо ×1,10 (иначе не помещаются) */
const B = (() => {
  const base = [
    { id: 'tea', name: 'чайная станция', w: 221, h: 116 }, { id: 'matcha', name: 'набор для матчи', w: 266, h: 75 },
    { id: 'boba', name: 'бабл ти', w: 282, h: 122 }, { id: 'powders', name: 'порошки', w: 304, h: 118 },
    { id: 'drip', name: 'КОФЕВАРКА', w: 112, h: 158, isNew: true }
  ];
  const { laid, gap } = evenGaps(base, 14, 1266);
  return { title: 'Б. Левая секция «Чайный бар»: пять предметов в масштабе ×1,0', arrow: { x: 1092, y: 516, w: 178, h: 30 }, gap, items: place(laid), extra: [{ id: 'teaShelf', name: 'полка с банками чая (стена)', x: 140, y: 232, w: 330, h: 81, decor: true }] };
})();
/* В. Центр: занятые места (части bar-parts.json); кофеварка на месте питчера пересекает питчер и звонок */
const C = {
  title: 'В. Центр: ряд занят, кофеварка на месте питчера пересекает питчер и звонок',
  arrow: null, gap: null,
  items: [
    { id: 'grinder', name: 'кофемолка', x: 60, y: 120, w: 200, h: 370 }, { id: 'mat', name: 'мат темпера', x: 262, y: 492, w: 136, h: 44 },
    { id: 'machine', name: 'кофемашина', x: 436, y: 130, w: 410, h: 392 }, { id: 'pitcher', name: 'питчер', x: 880, y: 420, w: 130, h: 110 },
    { id: 'bell', name: 'звонок', x: 1002, y: 474, w: 60, h: 60 }, { id: 'milk', name: 'холодильник молока', x: 1058, y: 236, w: 206, h: 278 },
    { id: 'drip', name: 'КОФЕВАРКА', x: 880, y: +(BASE - BREW.h).toFixed(1), w: +BREW.w.toFixed(1), h: +BREW.h.toFixed(1), isNew: true }
  ],
  extra: [{ id: 'syrups', name: 'полка сиропов (стена)', x: 854, y: 170, w: 228, h: 162, decor: true }]
};

function report(v) {
  const lines = [];
  const drip = v.items.find((b) => b.id === 'drip');
  for (const u of UI) if (!u.soft && hit(drip, u)) lines.push(`кофеварка пересекает «${u.name}»`);
  if (v.arrow && hit(drip, v.arrow)) lines.push('кофеварка пересекает стрелку');
  for (const b of v.items) if (b !== drip && hit(b, drip)) lines.push(`кофеварка пересекает «${b.name}»`);
  for (const e of v.extra || []) if (hit(drip, e)) lines.push(`кофеварка пересекает «${e.name}»`);
  const xs = [...v.items].sort((a, b) => a.x - b.x);
  let minGap = Infinity;
  if (v.gap !== null) for (let i = 0; i < xs.length - 1; i++) minGap = Math.min(minGap, xs[i + 1].x - (xs[i].x + xs[i].w));
  return { lines, minGap: Number.isFinite(minGap) ? +minGap.toFixed(1) : null };
}

const INK = '#4A2F25';
function svgOf(v) {
  const r = [`<rect width="1280" height="720" fill="#F6EAD3"/><rect y="466" width="1280" height="146" fill="#E9C9A3"/><rect y="612" width="1280" height="108" fill="#B9906D"/>`,
    `<line x1="0" x2="1280" y1="${BASE}" y2="${BASE}" stroke="${INK}" stroke-dasharray="3 5" opacity=".5"/>`];
  for (const u of UI) r.push(`<rect x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" fill="#7FA3A8" fill-opacity="${u.soft ? 0.12 : 0.28}" stroke="#4F7F86"${u.soft ? ' stroke-dasharray="4 4"' : ''}/><text x="${u.x + 6}" y="${u.y + 16}" font-size="12" fill="#2F5F66">${u.name}</text>`);
  if (v.arrow) r.push(`<rect x="${v.arrow.x}" y="${v.arrow.y}" width="${v.arrow.w}" height="${v.arrow.h}" rx="15" fill="#FBE3D8" stroke="#C4694A"/><text x="${v.arrow.x + 8}" y="${v.arrow.y + 20}" font-size="12" fill="#9A4A30">стрелка к центру</text>`);
  for (const b of [...(v.extra || []), ...v.items]) {
    const fill = b.isNew ? '#F0BC55' : b.decor ? '#B9CAA9' : '#E6DAC0';
    r.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${fill}" fill-opacity=".85" stroke="${INK}" stroke-width="${b.isNew ? 3.5 : 2}"/>`);
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">${b.name}</text>`);
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 15}" text-anchor="middle" font-size="11" fill="${INK}">${Math.round(b.w)}×${Math.round(b.h)} · x ${Math.round(b.x)}</text>`);
  }
  r.push(`<text x="20" y="700" font-size="16" font-weight="800" fill="${INK}">${v.title}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Nunito, Arial, sans-serif">${r.join('')}</svg>`;
}

const variants = [['A_right', A], ['B_left', B], ['C_center', C]];
const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const [name, v] of variants) {
  const rep = report(v);
  console.log(`${name}: промежуток между рамками ${v.gap ?? '-'} px (наименьший ${rep.minGap ?? '-'});`, rep.lines.length ? rep.lines.join('; ') : 'пересечений нет');
  v.items.forEach((x) => console.log(`   ${x.id}: x ${x.x}, y ${x.y}, ${Math.round(x.w * 10) / 10} × ${Math.round(x.h * 10) / 10}`));
  const svg = svgOf(v);
  fs.writeFileSync(path.join(out, `filter_${name}.svg`), svg);
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({ path: path.join(out, `filter_${name}.png`) });
}
await b.close();
