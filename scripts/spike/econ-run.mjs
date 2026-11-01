// 33-Г: собирает scripts/spike/<entry>.ts через esbuild и запускает (node scripts/spike/econ-run.mjs econ-grid). Пишет в out/economy/.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..', '..');
const name = process.argv[2];
if (!name) throw new Error('укажите имя файла из scripts/spike без .ts');
const outfile = resolve(root, `.tmp/${name}.mjs`);
mkdirSync(resolve(root, '.tmp'), { recursive: true });
await build({ entryPoints: [resolve(root, `scripts/spike/${name}.ts`)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
const t0 = Date.now();
await import(pathToFileURL(outfile).href);
console.log('за', Math.round((Date.now() - t0) / 1000), 'с');
