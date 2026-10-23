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
/* Центр бара (31-8А2): предметы по частям bar-parts.json, зоны по index.html (#bZones). when: условие показа (milk — G.milk, cream — eq_cream, rank2 — ранг ≥ 2). */
const CENTER_BASE = [
  { id: 'grinder', name: 'кофемолка', x: 60, y: 120, w: 200, h: 370 }, { id: 'mat', name: 'мат темпера', x: 262, y: 492, w: 136, h: 44 },
  { id: 'tamper', name: 'темпер', x: 306, y: 440, w: 48, h: 72 }, { id: 'machine', name: 'кофемашина', x: 436, y: 130, w: 410, h: 392 },
  { id: 'pitcher', name: 'питчер', x: 880, y: 420, w: 130, h: 110, when: 'milkOrCream' }, { id: 'bell', name: 'звонок', x: 1002, y: 474, w: 60, h: 60 },
  { id: 'milk', name: 'холодильник молока', x: 1058, y: 236, w: 206, h: 278, when: 'milk' },
  { id: 'cork', name: 'пробковая доска (стена)', x: 230, y: 78, w: 208, h: 144, decor: true },
  { id: 'syrups', name: 'полка сиропов (стена)', x: 854, y: 170, w: 228, h: 162, decor: true, when: 'rank2' }
];
const CENTER_ZONES = [
  { id: 'z:grind', name: 'зона помола', x: 90, y: 170, w: 140, h: 300 }, { id: 'z:tamp', name: 'зона темпера', x: 260, y: 440, w: 140, h: 90 },
  { id: 'z:water', name: 'зона воды', x: 466, y: 296, w: 70, h: 80 }, { id: 'z:steam', name: 'зона пара', x: 776, y: 296, w: 100, h: 170 },
  { id: 'z:bell', name: 'зона звонка', x: 984, y: 470, w: 96, h: 70 }, { id: 'z:milk', name: 'зона молока', x: 1066, y: 244, w: 190, h: 262, when: 'milk' },
  { id: 'z:syr', name: 'зоны сиропов', x: 878, y: 170, w: 180, h: 130, when: 'rank2' }
];
/* Ц1 (рекомендуется): на стенной полке над мат-темпером, масштаб ×1,0 (112 × 158 px); сдвигаемых предметов нет */
const C1 = {
  title: 'Ц1. Центр: полка на стене над матом темпера, ничего не сдвигается',
  arrow: null, gap: null,
  items: [...CENTER_BASE, { id: 'drip', name: 'КОФЕВАРКА', x: 276, y: 252, w: 112, h: 158, isNew: true }, { id: 'shelf', name: 'полка с кронштейнами', x: 272, y: 410, w: 120, h: 18, decor: true, isNew: true, own: true }],
  zones: [...CENTER_ZONES, { id: 'z:drip', name: 'зона кофеварки', x: 276, y: 242, w: 112, h: 186, isNew: true }],
  extra: []
};
/* Ц2: на столешнице справа от кофемашины вместо питчера; питчер ×0,7 уходит на передний край столешницы, зоны пара и звонка уже */
const C2 = {
  title: 'Ц2. Центр: справа от кофемашины, питчер (×0,7) переезжает вперёд, зоны пара и звонка уже',
  arrow: null, gap: null,
  items: [...CENTER_BASE.map((b) => (b.id === 'pitcher' ? { ...b, x: 880, y: 530, w: 91, h: 77 } : b)), { id: 'drip', name: 'КОФЕВАРКА', x: 868, y: 348, w: 112, h: 158, isNew: true }],
  zones: [...CENTER_ZONES.map((z) => (z.id === 'z:steam' ? { ...z, w: 76 } : z.id === 'z:bell' ? { ...z, x: 992, w: 88 } : z)), { id: 'z:drip', name: 'зона кофеварки', x: 868, y: 338, w: 112, h: 176, isNew: true }],
  extra: []
};
const COMBOS = [['без молока и сливок, ранг 1', {}], ['ранг 2, сиропы', { rank2: true }], ['молоко (холодильник и питчер)', { milk: true, milkOrCream: true, rank2: true }], ['только сливки (питчер)', { milkOrCream: true, rank2: true }]];
const dist = (a, b) => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h));
function comboReport(v) {
  const rows = [];
  for (const [label, st] of COMBOS) {
    const vis = (b) => !b.when || st[b.when];
    const drip = v.items.find((b) => b.id === 'drip'), dz = v.zones.find((b) => b.id === 'z:drip');
    const bad = [];
    for (const own of v.items.filter((b) => b.id === 'drip' || b.own)) for (const b of v.items) if (b.id !== 'drip' && !b.own && vis(b) && dist(own, b) < 12) bad.push(`«${own.name}» и «${b.name}» ${dist(own, b).toFixed(0)} px`);
    for (const z of v.zones) if (z.id !== 'z:drip' && vis(z) && dist(dz, z) < 12) bad.push(`зона «${z.name}» ${dist(dz, z).toFixed(0)} px`);
    for (const z of v.zones) if (z.id !== 'z:drip' && vis(z)) for (const b of v.items) if (b.id === 'drip' && dist(b, z) < 12) bad.push(`предмет×зона «${z.name}» ${dist(b, z).toFixed(0)} px`);
    for (const u of UI) if (dist(dz, u) < (u.soft ? 12 : 0) || (u.soft && dist(dz, u) < 12)) bad.push(`полоса «${u.name}» ${dist(dz, u).toFixed(0)} px`);
    rows.push({ label, ok: !bad.length, bad });
  }
  return rows;
}

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
  for (const z of v.zones || []) r.push(`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="8" fill="${z.isNew ? '#F0BC55' : 'none'}" fill-opacity=".18" stroke="${z.isNew ? '#C4694A' : '#2F5F66'}" stroke-width="${z.isNew ? 2.5 : 1.2}" stroke-dasharray="6 4"/>`);
  for (const b of [...(v.extra || []), ...v.items]) {
    const fill = b.isNew ? '#F0BC55' : b.decor ? '#B9CAA9' : '#E6DAC0';
    r.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${fill}" fill-opacity=".85" stroke="${INK}" stroke-width="${b.isNew ? 3.5 : 2}"/>`);
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" font-size="13" font-weight="700" fill="${INK}">${b.name}</text>`);
    r.push(`<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 15}" text-anchor="middle" font-size="11" fill="${INK}">${Math.round(b.w)}×${Math.round(b.h)} · x ${Math.round(b.x)}</text>`);
  }
  r.push(`<text x="20" y="700" font-size="16" font-weight="800" fill="${INK}">${v.title}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" font-family="Nunito, Arial, sans-serif">${r.join('')}</svg>`;
}

const variants = [['A_right', A], ['B_left', B], ['C1_shelf', C1], ['C2_right', C2]];
const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const [name, v] of variants) {
  const rep = report(v);
  if (v.zones) for (const r of comboReport(v)) console.log(`   [${r.label}] ${r.ok ? 'зазоры ≥ 12 px, пересечений нет' : 'НАРУШЕНИЯ: ' + r.bad.join('; ')}`);
  console.log(`${name}: промежуток между рамками ${v.gap ?? '-'} px (наименьший ${rep.minGap ?? '-'});`, rep.lines.length ? rep.lines.join('; ') : 'пересечений нет');
  v.items.forEach((x) => console.log(`   ${x.id}: x ${x.x}, y ${x.y}, ${Math.round(x.w * 10) / 10} × ${Math.round(x.h * 10) / 10}`));
  const svg = svgOf(v);
  fs.writeFileSync(path.join(out, `filter_${name}.svg`), svg);
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({ path: path.join(out, `filter_${name}.png`) });
}
await b.close();
