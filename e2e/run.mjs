// Раннер e2e (блок 34): читает e2e/manifest.json и гонит сценарии по одному процессу с таймаутом.
//   npm run e2e                      — группа «release» (только stable)
//   npm run e2e -- --only milk_flow  — один или несколько сценариев (через запятую), любой статус
//   npm run e2e -- --all             — все stable-сценарии (включая вне release)
//   npm run e2e -- --build           — перед прогоном собрать отладочную сборку в out/e2e/debug.html
//   npm run e2e -- --list            — показать манифест
// Сценарии берут отладочную сборку (CUPPABLE_DEBUG=1). По умолчанию out/e2e/debug.html; другой файл — --html путь.
// Результат каждого: код возврата 0, в выводе есть маркер успеха (по умолчанию NO_ERRORS) и нет строк FAIL.
// Кадры и логи лежат в out/e2e/<имя>/. Код возврата раннера 1, если упал хоть один выбранный сценарий.
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, 'manifest.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (name) => argv.includes(name);
const html = resolve(root, opt('--html') ?? 'out/e2e/debug.html');
const outRoot = resolve(root, 'out/e2e');

if (flag('--list')) {
  for (const t of manifest.tests) console.log(`${t.stability.padEnd(8)} ${t.kind.padEnd(7)} ${(manifest.groups.release.includes(t.name) ? 'release' : '').padEnd(8)} ${t.name.padEnd(20)} ${t.note}`);
  process.exit(0);
}

if (flag('--build')) {
  mkdirSync(outRoot, { recursive: true });
  const env = { ...process.env, CUPPABLE_DEBUG: '1' };
  for (const cmd of ['npx vite build', 'node scripts/fragment.mjs']) {
    const r = spawnSync(cmd, { cwd: root, env, shell: true, stdio: 'inherit' });
    if (r.status !== 0) { console.error('сборка не удалась: ' + cmd); process.exit(2); }
  }
  copyFileSync(resolve(root, 'dist/artifact.html'), html);
  console.log('отладочная сборка → ' + html);
}
if (!existsSync(html)) { console.error(`нет отладочной сборки ${html}: запустите npm run e2e -- --build`); process.exit(2); }

const only = opt('--only')?.split(',');
let picked;
if (only) picked = only.map((n) => manifest.tests.find((t) => t.name === n) ?? (console.error('нет сценария ' + n), process.exit(2)));
else if (flag('--all')) picked = manifest.tests.filter((t) => t.kind === 'test' && t.stability === 'stable');
else picked = manifest.groups.release.map((n) => manifest.tests.find((t) => t.name === n));

const fill = (s, name) => s.replaceAll('{html}', html).replaceAll('{out}', resolve(outRoot, name, 'o')).replaceAll('{dir}', resolve(outRoot, name));
const killTree = (child) => { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']); else child.kill('SIGKILL'); };

async function serverUp(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if ((await fetch(url)).ok) return true; } catch { /* ещё не поднялся */ } await new Promise((r) => setTimeout(r, 500)); }
  return false;
}

function once(t) {
  return new Promise((done) => {
    const dir = resolve(outRoot, t.name);
    mkdirSync(dir, { recursive: true });
    const env = { ...process.env, CHROMIUM_ARGS: '--mute-audio', HASH: '#nopixi-lowfx', ...(t.env ?? {}) };
    const args = [resolve(root, 'e2e', t.file), ...t.args.map((a) => fill(a, t.name))];
    const t0 = Date.now();
    const child = spawn(process.execPath, args, { cwd: dir, env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, t.timeout * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      writeFileSync(resolve(dir, 'log.txt'), out);
      const sec = Math.round((Date.now() - t0) / 1000);
      const passRe = new RegExp(t.pass ?? 'NO_ERRORS'), failRe = new RegExp(t.fail ?? '^FAIL', 'm');
      let result = 'ok', why = '';
      if (timedOut) { result = 'FAIL'; why = `таймаут ${t.timeout} с`; }
      else if (code !== 0) { result = 'FAIL'; why = `код возврата ${code}: ` + (out.trim().split('\n').slice(-1)[0] ?? '').slice(0, 120); }
      else if (failRe.test(out)) { result = 'FAIL'; why = (out.split('\n').find((l) => failRe.test(l)) ?? '').slice(0, 140); }
      else if (!passRe.test(out)) { result = 'FAIL'; why = `нет маркера ${t.pass ?? 'NO_ERRORS'}`; }
      done({ result, sec, why });
    });
  });
}

const rows = [];
let preview = null;
try {
  if (picked.some((t) => t.server)) {
    preview = spawn('npx vite preview --port 4173 --strictPort', { cwd: root, shell: true, stdio: 'ignore' });
    if (!(await serverUp('http://localhost:4173/'))) { console.error('vite preview не поднялся на 4173 (нужна сборка в dist/)'); killTree(preview); process.exit(2); }
  }
  for (const t of picked) {
    if (!only && t.stability !== 'stable') continue;
    let r = await once(t);
    let tries = 1;
    while (r.result === 'FAIL' && tries <= (t.retry ?? 0)) { tries++; r = await once(t); }
    if (r.result === 'ok' && tries > 1) r.why = `прошёл с попытки ${tries}`;
    rows.push([t.name, r.result, String(r.sec), r.why || (t.stability !== 'stable' ? `статус ${t.stability}` : '')]);
    console.log(`${r.result === 'ok' ? 'ok  ' : 'FAIL'} ${t.name} ${r.sec} с ${r.why}`);
  }
} finally {
  if (preview) killTree(preview);
}

const w = [Math.max(6, ...rows.map((r) => r[0].length)), 6, 7];
console.log('\n' + ['тест'.padEnd(w[0]), 'результат'.padEnd(9), 'секунд'.padEnd(6), 'причина'].join(' | '));
for (const r of rows) console.log([r[0].padEnd(w[0]), r[1].padEnd(9), r[2].padEnd(6), r[3]].join(' | '));
const bad = rows.filter((r) => r[1] !== 'ok');
console.log(`\nвсего ${rows.length}, упало ${bad.length}`);
process.exit(bad.length ? 1 : 0);
