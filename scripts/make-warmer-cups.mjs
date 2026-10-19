// Генератор SVG-кусков «чашки вверх дном на подогреве» для art-src/bar/machine.svg (блок 29-1д).
// Каждая чашка нарисована явным контуром (не отражением игровой геометрии): низ на подносе — обод, самая широкая часть;
// стенки сужаются к донышку наверху до 72 % ширины обода; донышко — плоский светлый эллипс ≈ 58 % ширины обода с тонким кольцом ножки;
// ручка справа: верхний крепёж у донышка (1/4 высоты от верха), нижний на 2/3, петля наружу.
// Размеры и положения: масштабы 0,50 / 0,425 / 0,36 игровой керамики 0,2 л (обод 55 ед. → ширина 55 / 47 / 40 px), высота 45 / 39 / 33 px.
// Запуск: node scripts/make-warmer-cups.mjs  → печатает куски для machine.svg (между <!--cups--> и <!--/cups-->). Тест test/artSrcCenter.test.ts разбирает их.
const f = (n) => +n.toFixed(1);
export const RIM = 55;          // полуширина обода игровой керамики 0,2 л, ед.
export const TOP_K = 0.72;      // ширина у донышка / ширина у обода
export const FOOT_K = 0.58;     // ширина светлого эллипса донышка / ширина у обода
export const CUPS = [{ s: 0.5, h: 45, cx: 505 }, { s: 0.425, h: 39, cx: 577 }, { s: 0.36, h: 33, cx: 641 }];
export const TRAY_TOP = 184;    // верх подноса; линия обода на 1 px ниже
const UNIT = 2.5 / 3;           // BAR_UNIT керамики: k = s / UNIT
export function cupSvg({ s, h, cx }) {
  const Wr = RIM * s, Wt = TOP_K * Wr, Wf = FOOT_K * Wr;
  const ryR = 0.15 * Wr, ryT = 0.25 * Wt, ryF = 0.25 * Wf;     // обод почти прямая линия по подносу
  const yb = TRAY_TOP + 1;                                       // нижняя точка обода (линия по подносу)
  const yR = yb - ryR;                                           // центр эллипса обода
  const B = h - ryR - ryT;                                       // высота стенки
  const yT = yR - B;                                             // центр эллипса донышка
  const o = [];
  o.push(`<ellipse cx="${f(cx + 1)}" cy="${f(yb + 0.5)}" rx="${f(Wr + 4)}" ry="2.4" fill="{{SHADOW}}" fill-opacity=".25" stroke="none"/>`);
  // ручка: от донышка к ободу, петля наружу
  const k = s / UNIT, th = 6 * Math.min(k, 1.2), d = th / 2 + 1.5;
  const wallX = (t) => Wt + (Wr - Wt) * t;                       // полуширина стенки на доле высоты от верха
  const t0 = 0.25, t1 = 0.67;
  const c = [[cx + wallX(t0) - 1, yT + t0 * B], [cx + wallX(t0) + 0.62 * Wr, yT + t0 * B - 0.06 * B], [cx + wallX(t1) + 0.55 * Wr, yT + t1 * B + 0.1 * B], [cx + wallX(t1) - 2, yT + t1 * B]];
  const P = (t) => { const u = 1 - t; return [0, 1].map((i) => u*u*u*c[0][i] + 3*u*u*t*c[1][i] + 3*u*t*t*c[2][i] + t*t*t*c[3][i]); };
  const N = 14, sc = [];
  for (let i = 0; i <= N; i++) sc.push(P(i / N));
  const nrm = sc.map((p, i) => { const a = sc[Math.max(0, i - 1)], b = sc[Math.min(N, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const L = sc.map((p, i) => [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d]);
  const R = sc.map((p, i) => [p[0] - nrm[i][0] * d, p[1] - nrm[i][1] * d]).reverse();
  o.push(`<path d="${[...L, ...R].map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')}Z" fill="{{PAPER}}" stroke-width="{{M}}"/>`);
  // корпус: левая стенка вверх к донышку, дальняя дуга донышка, правая стенка вниз, ближняя дуга обода (почти прямая по подносу)
  const body = `M${f(cx - Wr)} ${f(yR)}C${f(cx - 1.03 * Wr)} ${f(yR - 0.5 * B)} ${f(cx - 1.08 * Wt)} ${f(yT + 0.12 * B)} ${f(cx - Wt)} ${f(yT)}A${f(Wt)} ${f(ryT)} 0 0 1 ${f(cx + Wt)} ${f(yT)}C${f(cx + 1.08 * Wt)} ${f(yT + 0.12 * B)} ${f(cx + 1.03 * Wr)} ${f(yR - 0.5 * B)} ${f(cx + Wr)} ${f(yR)}A${f(Wr)} ${f(ryR)} 0 0 1 ${f(cx - Wr)} ${f(yR)}Z`;
  o.push(`<path d="${body}" fill="{{PAPER}}" stroke-width="{{M}}"/>`);
  // тень справа
  o.push(`<path d="M${f(cx + 0.66 * Wt)} ${f(yT + 0.7 * ryT)}L${f(cx + Wt)} ${f(yT)}C${f(cx + 1.08 * Wt)} ${f(yT + 0.12 * B)} ${f(cx + 1.03 * Wr)} ${f(yR - 0.5 * B)} ${f(cx + Wr)} ${f(yR)}L${f(cx + 0.68 * Wr)} ${f(yR + 0.73 * ryR)}C${f(cx + 0.7 * Wr)} ${f(yR - 0.3 * B)} ${f(cx + 0.68 * Wt)} ${f(yT + 0.3 * B)} ${f(cx + 0.66 * Wt)} ${f(yT + 0.7 * ryT)}Z" fill="{{KRAFT_SH}}" stroke="none"/>`);
  // край донышка (ближняя дуга) и светлый эллипс ножки с тонким кольцом
  o.push(`<path d="M${f(cx - Wt)} ${f(yT)}A${f(Wt)} ${f(ryT)} 0 0 0 ${f(cx + Wt)} ${f(yT)}" fill="none" stroke="{{KRAFT_SH}}" stroke-width="{{D}}"/>`);
  o.push(`<ellipse cx="${f(cx)}" cy="${f(yT)}" rx="${f(Wf)}" ry="${f(ryF)}" fill="{{HILITE}}" stroke="{{KRAFT_SH}}" stroke-width="{{D}}"/>`);
  // блик слева
  o.push(`<path d="M${f(cx - 0.82 * Wr)} ${f(yR - 0.2 * B)}Q${f(cx - 0.86 * Wr)} ${f(yR - 0.5 * B)} ${f(cx - 0.8 * Wt)} ${f(yT + 0.25 * B)}" fill="none" stroke="{{HILITE}}" stroke-opacity=".75" stroke-width="{{D}}" stroke-linecap="round"/>`);
  return `<g>${o.join('')}</g>`;
}
if (process.argv[1] && process.argv[1].endsWith('make-warmer-cups.mjs')) console.log(CUPS.map(cupSvg).join('\n'));
