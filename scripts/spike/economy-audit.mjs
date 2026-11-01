// Аудит экономики (33-А): собирает economy-audit.ts через esbuild и запускает. Пишет только в out/economy/.
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..', '..');
const outfile = resolve(root, '.tmp/economy-audit.mjs');
mkdirSync(resolve(root, '.tmp'), { recursive: true });
await build({ entryPoints: [resolve(root, 'scripts/spike/economy-audit.ts')], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error', banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" } });
const t0 = Date.now();
await import(pathToFileURL(outfile).href);
console.log('за', Math.round((Date.now() - t0) / 1000), 'с');
