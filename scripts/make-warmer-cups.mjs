// Генератор SVG-кусков «чашки вверх дном на подогреве» для art-src/bar/machine.svg (блок 29-1в).
// Форма — игровая керамика (geomOf, k = 1: W 55, Wb 42,9, H 75, yb −8, ryR 14, reach 26, ручка th = 6·min(k, 1,2) px), отражённая по вертикали и уменьшенная в s раз (экранные px).
// Запуск: node scripts/make-warmer-cups.mjs  → печатает куски; вставляются в machine.svg между <!--cups--> и <!--/cups-->. Тест test/artSrcCenter.test.ts сверяет их с geomOf.
const f = (n) => +n.toFixed(1);
export const GEOM = { W: 55, Wb: 55 * 0.78, H: 75, yb: -8, ryR: 14, reach: 26 };
export const CUPS = [{ s: 0.5, cx: 505 }, { s: 0.425, cx: 577 }, { s: 0.36, cx: 641 }];
export const TRAY_TOP = 184; // верх подноса; нижняя кромка обода на 1 px ниже
const UNIT = 2.5 / 3; // BAR_UNIT керамики: k = s / UNIT
export function cupSvg({ s, cx }) {
  const { W, Wb, H, yb, ryR, reach } = GEOM;
  const k = s / UNIT;
  const yR = TRAY_TOP + 1 - ryR * s;
  const X = (x) => cx + s * x;
  const Y = (y) => yR - s * (y + H); // отражение: обод внизу, донце вверху
  const o = [];
  o.push(`<ellipse cx="${f(cx + 1)}" cy="${f(TRAY_TOP + 1.5)}" rx="${f(W * s + 4)}" ry="2.4" fill="{{SHADOW}}" fill-opacity=".25" stroke="none"/>`);
  // ручка справа: полоса толщиной th = 6·min(k, 1,2) px с контуром M (как у игровой: INK th + 2M, PAPER th)
  const th = 6 * Math.min(k, 1.2), d = th / 2 + 1.5;
  const hx = W - 3, y0 = -H * 0.8, y1 = -H * 0.26;
  const P = (t) => { const u = 1 - t, c = [[hx, y0], [hx + reach, y0 - 6], [hx + reach, y1 + 4], [hx - 3, y1]];
    return [u*u*u*c[0][0] + 3*u*u*t*c[1][0] + 3*u*t*t*c[2][0] + t*t*t*c[3][0], u*u*u*c[0][1] + 3*u*u*t*c[1][1] + 3*u*t*t*c[2][1] + t*t*t*c[3][1]]; };
  const pts = [], N = 14;
  for (let i = 0; i <= N; i++) pts.push(P(i / N));
  const sc = pts.map(([x, y]) => [X(x), Y(y)]);
  const nrm = sc.map((p, i) => { const a = sc[Math.max(0, i - 1)], b = sc[Math.min(N, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const L = sc.map((p, i) => [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d]);
  const R = sc.map((p, i) => [p[0] - nrm[i][0] * d, p[1] - nrm[i][1] * d]).reverse();
  const poly = [...L, ...R].map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z';
  o.push(`<path d="${poly}" fill="{{PAPER}}" stroke-width="{{M}}"/>`);
  // корпус
  const body = `M${f(X(-W))} ${f(Y(-H))}C${f(X(-W * 1.03))} ${f(Y(-H * 0.5))} ${f(X(-Wb * 1.1))} ${f(Y(-H * 0.1))} ${f(X(-Wb))} ${f(Y(yb))}Q${f(X(0))} ${f(Y(4))} ${f(X(Wb))} ${f(Y(yb))}C${f(X(Wb * 1.1))} ${f(Y(-H * 0.1))} ${f(X(W * 1.03))} ${f(Y(-H * 0.5))} ${f(X(W))} ${f(Y(-H))}A${f(W * s)} ${f(ryR * s)} 0 0 1 ${f(X(-W))} ${f(Y(-H))}Z`;
  o.push(`<path d="${body}" fill="{{PAPER}}" stroke-width="{{M}}"/>`);
  // тень справа (как KRAFT_SH у игровой)
  o.push(`<path d="M${f(X(W * 0.55))} ${f(Y(-H * 0.98))}L${f(X(W))} ${f(Y(-H))}C${f(X(W * 1.03))} ${f(Y(-H * 0.5))} ${f(X(Wb * 1.1))} ${f(Y(-H * 0.1))} ${f(X(Wb))} ${f(Y(yb))}Q${f(X(Wb * 0.4))} ${f(Y(1))} ${f(X(Wb * 0.15))} ${f(Y(0))}C${f(X(Wb * 0.5))} ${f(Y(-H * 0.3))} ${f(X(W * 0.72))} ${f(Y(-H * 0.62))} ${f(X(W * 0.55))} ${f(Y(-H * 0.98))}Z" fill="{{KRAFT_SH}}" stroke="none"/>`);
  // донце сверху: плоский эллипс (донце видно сверху, внутри ничего)
  const by = Y(yb);
  o.push(`<ellipse cx="${f(cx)}" cy="${f(by)}" rx="${f(Wb * s)}" ry="${f(0.23 * Wb * s)}" fill="{{PAPER}}" stroke-width="{{M}}"/>`);
  // блик слева (как у игровой: белая дуга)
  o.push(`<path d="M${f(X(-W * 0.82))} ${f(Y(-H * 0.8))}Q${f(X(-W * 0.88))} ${f(Y(-H * 0.45))} ${f(X(-Wb * 0.88))} ${f(Y(-H * 0.2))}" fill="none" stroke="{{HILITE}}" stroke-opacity=".75" stroke-width="{{D}}" stroke-linecap="round"/>`);
  return `<g>${o.join('')}</g>`;
}
if (process.argv[1] && process.argv[1].endsWith('make-warmer-cups.mjs')) console.log(CUPS.map(cupSvg).join('\n'));
