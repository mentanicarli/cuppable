/* 31-9: замер рамок иконок магазина. Для каждой иконки с предметом бара (src/ui/shopIcons.ts) собирает разметку, измеряет getBBox объединения слоёв
   в проектных координатах и пишет src/assets/art/shop-icon-boxes.json; кадр иконки считается по этой рамке (центр = центр рамки, поля одинаковые).
   Запуск: node scripts/shop-icon-boxes.mjs  (после смены предметов или набора иконок; результат коммитится). Нужны e2e/node_modules (playwright). */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'e2e', 'x.js'));
const { chromium } = require('playwright');
const tmp = path.join(root, 'out'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'shopicons.cjs');
execSync(`npx esbuild scripts/shop-icon-entry.ts --bundle --format=cjs --platform=node --outfile="${bundle}" --log-level=error`, { cwd: root, stdio: 'inherit' });
const M = require(bundle);
const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
const page = await b.newPage();
const res = {};
for (const id of M.BAR_ICON_IDS) {
  await page.setContent(`<body>${M.shopBarIconRaw(id)}</body>`);
  res[id] = await page.evaluate(() => { const r = document.querySelector('svg > g').getBBox(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(1)); });
}
await b.close();
const file = path.join(root, 'src/assets/art/shop-icon-boxes.json');
fs.writeFileSync(file, JSON.stringify(res, null, 1) + '\n');
console.log(res);
