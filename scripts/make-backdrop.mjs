// Генератор art-src/bar/wall.svg и counter-top.svg (блок 29-4): стена и столешница центральной секции по числам src/game/backdrop.ts.
// Те же числа и та же функция рисуют заглушки боковых секций (placeholderSvg в bar.ts), поэтому ритм полос и стыки досок на стыках секций совпадают.
// Запуск: node scripts/make-backdrop.mjs (потом npm run art). Тест test/artSrcBackdrop.test.ts сверяет файлы с функцией.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from 'esbuild';

const ROOT = resolve(import.meta.dirname, '..');
const code = transformSync(readFileSync(resolve(ROOT, 'src/game/backdrop.ts'), 'utf8'), { loader: 'ts', format: 'esm' }).code;
const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const tok = { col: (n) => `{{${n}}}`, w: (n) => `{{${n}}}` };

const wall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 480" data-part="wall" data-after="static" data-scale="1">
<!--
  Стена центральной секции (блок 29-4): плоский фон KRAFT и десять вертикальных полос KRAFT_SH (прозрачность .55) шириной 26, шаг 130, первая на x 60. У боковых секций та же полоса со смещением 40 (L) и 80 (R), так что ритм на стыках не рвётся (мировые x полос −70, 60, 190 … 1230, 1360 …). Низ стены на y 480 уходит под столешницу. Файл создаёт scripts/make-backdrop.mjs по src/game/backdrop.ts, руками не править.
-->
${mod.wallSvg('C', tok)}
</svg>
`;
const counter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 460 1280 160" data-part="counterTop" data-after="static" data-scale="1">
<!--
  Столешница центральной секции (блок 29-4): задний бортик y 466–480, две доски (y 480–543 и 543–612) с контуром M между ними, стыки досок через 640 px (x 180 и 820 в верхней, 420 и 1060 в нижней), блик по верху каждой доски. Низ y 612 лежит под носом плиты (counterNose, y 607–628). Одинаково у всех трёх секций: стыки не ближе 140 px к краю. Файл создаёт scripts/make-backdrop.mjs, руками не править.
-->
${mod.counterTopSvg(tok)}
</svg>
`;
writeFileSync(resolve(ROOT, 'art-src/bar/wall.svg'), wall);
writeFileSync(resolve(ROOT, 'art-src/bar/counter-top.svg'), counter);
console.log('wall.svg', wall.length, 'counter-top.svg', counter.length);
