/**
 * Иллюстрации окон станций нового ядра (31-2): те же предметы, что стоят на баре. Предметы берутся из art-src
 * (`bar-parts-left.json`, `bar-parts-right.json`, группы `data-item` / `data-glass` / `data-pot`), масштабируются в сцену окна 400 × 190,
 * а толщины контура пересчитываются так, чтобы на экране остались L / M / D (3,5 / 3 / 2). Цвета только из палитры; цвет налива,
 * струи и порошка — данные напитка (`col`, `col2`).
 */
import LEFT from '../assets/art/bar-parts-left.json';
import RIGHT from '../assets/art/bar-parts-right.json';
import CENTER from '../assets/art/bar-parts.json';
import PAL from '../../art-src/palette.json';
import { layerSourceOf, layerView } from '../game/layers';

type Part = { svg: string };
const PARTS_L = LEFT as unknown as Record<string, Part>;
const PARTS_R = RIGHT as unknown as Record<string, Part>;
const PARTS_C = CENTER as unknown as Record<string, Part>;
const C = PAL.colors as Record<string, string>;
const W = PAL.stroke as { L: number; M: number; D: number };
/** Предметы боковых секций нарисованы в проектных единицах и раскладываются обёртками ×1,10: толщины в JSON = L/M/D ÷ 1,1. */
const SRC_SCALE = 1.1;

export interface Box { x: number; y: number; w: number; h: number }

/** Элемент `<g …>…</g>`, начинающийся с `marker` (например `data-item="bowl"`), со всей вложенностью. */
export function groupOf(svg: string, marker: string): string {
  const at = svg.indexOf(marker);
  if (at < 0) throw new Error('нет группы ' + marker);
  const start = svg.lastIndexOf('<g', at);
  const re = /<g\b|<\/g>/g;
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) return svg.slice(start, re.lastIndex);
  }
  throw new Error('группа не закрыта ' + marker);
}

/** Предмет бара по метке; сторона секции определяется по части. */
export function barObject(part: string, marker: string): string {
  const src = (part in PARTS_L ? PARTS_L : part in PARTS_R ? PARTS_R : PARTS_C)[part];
  if (!src) throw new Error('нет части ' + part);
  return groupOf(src.svg, marker);
}

/** Цвета заливок группы по числу вхождений (для теста «окно берёт главные цвета предмета»). */
export function fillCounts(svg: string): [string, number][] {
  const n = new Map<string, number>();
  for (const m of svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)) n.set((m[1] as string).toUpperCase(), (n.get(m[1] as string) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]);
}

/** Предмет в сцену окна: левый верхний угол рамки `box` встаёт в (x, y), масштаб k, поворот `rot` градусов вокруг центра рамки. */
export function place(obj: string, box: Box, x: number, y: number, k: number, extra = '', rot = 0, o: { flip?: boolean; src?: number } = {}): string {
  const srcScale = o.src ?? SRC_SCALE;
  const body = obj.replace(/stroke-width="([\d.]+)"/g, (_m, v: string) => `stroke-width="${((Number(v) * srcScale) / k).toFixed(2)}"`);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const r = (o.flip ? ` translate(${cx} 0) scale(-1 1) translate(${-cx} 0)` : '') + (rot ? ` rotate(${rot} ${cx} ${cy})` : '');
  return `<g data-k="${k}" ${extra} transform="translate(${(x - box.x * k).toFixed(2)} ${(y - box.y * k).toFixed(2)}) scale(${k})${r}">${body}</g>`;
}

const INK = C.INK as string;
const col = (name: string): string => C[name] as string;
const WRAP = `stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"`;
const sw = (k: 'L' | 'M' | 'D'): string => `stroke-width="${W[k]}"`;

/** Принимающий стакан окна (холодный стакан модели: стенка GLASS, налив, контур, блик); налив через #xpLiq. */
const CUP_PATH = 'M140 28H260L250 172H150Z';
function cup(liq: string, extra = ''): string {
  return `<defs><clipPath id="xpClip"><path d="${CUP_PATH}"/></clipPath></defs>
<path d="${CUP_PATH}" fill="${col('GLASS')}" stroke="none"/>
<g clip-path="url(#xpClip)"><rect id="xpLiq" data-top="172" data-full="140" x="130" y="172" width="140" height="0" fill="${liq}"/>${extra}</g>
<path d="${CUP_PATH}" fill="none" ${sw('M')}/>
<path d="M156 40L162 150" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${sw('M')}/>
<path id="xpMark" data-top="172" data-full="140" data-x0="144" data-x1="256" d="M144 100H256" fill="none" stroke="${INK}" stroke-dasharray="5 5" ${sw('D')}/>`;
}

/** Струя: узкая лента цвета наливаемого (без контура), от носика (x1, y1) к стакану (x2, y2). */
export function streamD(x1: number, y1: number, x2: number, y2: number): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * 3, ny = ((x2 - x1) / len) * 3;
  const pt = (x: number, y: number): string => `${x.toFixed(1)} ${y.toFixed(1)}`;
  return `M${pt(x1 + nx, y1 + ny)}L${pt(x2 + nx * 0.6, y2 + ny * 0.6)}L${pt(x2 - nx * 0.6, y2 - ny * 0.6)}L${pt(x1 - nx, y1 - ny)}Z`;
}
const stream = (x1: number, y1: number, x2: number, y2: number, c: string): string =>
  `<path id="xpStream" class="xpStream" data-sx="${x1}" data-sy="${y1}" data-ex="${x2}" d="${streamD(x1, y1, x2, y2)}" fill="${c}" stroke="none"/>`;

const dots = (c: string, xs: number[], y0 = 46): string =>
  `<g id="xpDots" class="xpDots" fill="${c}" stroke="${INK}" ${sw('D')}>${xs.map((x, i) => `<circle cx="${x}" cy="${y0 + (i % 3) * 18}" r="4.5" style="animation-delay:${(i * 0.11).toFixed(2)}s"/>`).join('')}</g>`;

/** Бутылка с носиком: та же форма, что у бутылок холодильника и полки сиропов (`bottle()` в make-side-r.py), проектные единицы. */
export function bottleSvg(liq: string, capName: string, w = 22, h = 70): string {
  const nw = w * 0.36, nx = (w - nw) / 2;
  const dw = `stroke-width="${(W.D / SRC_SCALE).toFixed(2)}"`;
  const d = `<rect x="0" y="10" width="${w}" height="${h - 10}" rx="3" fill="${col('GLASS')}" ${dw}/>`
    + `<path d="M1 ${(h * 0.42).toFixed(1)}H${w - 1}V${h - 3}Q${w - 1} ${h - 1} ${w - 4} ${h - 1}H4Q1 ${h - 1} 1 ${h - 3}Z" fill="${liq}" stroke="none"/>`
    + `<rect x="${nx.toFixed(1)}" y="3" width="${nw.toFixed(1)}" height="9" rx="1.5" fill="${col('GLASS')}" ${dw}/>`
    + `<rect x="${(nx - 1).toFixed(1)}" y="0" width="${(nw + 2).toFixed(1)}" height="5" rx="1.5" fill="${col(capName)}" ${dw}/>`;
  return `<g data-bottle="1">${d}</g>`;
}
const bottleBox = (w = 22, h = 70): Box => ({ x: 0, y: 0, w, h });

/** Какую банку порошков берёт напиток (иконка на банке совпадает с порошком). */
export function jarFor(drink: string | undefined): 'jarCocoa' | 'jarChicory' | 'jarProtein' {
  if (!drink) return 'jarCocoa';
  if (/protein/.test(drink)) return 'jarProtein';
  if (/chicory/.test(drink)) return 'jarChicory';
  return 'jarCocoa';
}

/** Данные сцены: какой предмет бара окно берёт за основу (для теста и документации). */
export function sourceOf(task: string, drink?: string): { part: string; marker: string }[] {
  switch (task) {
    case 'whisk': return [{ part: 'matcha', marker: 'data-item="bowl"' }, { part: 'matcha', marker: 'data-item="whisk"' }];
    case 'brew': return [{ part: 'tea', marker: 'data-item="glassTeapot"' }];
    case 'powder': return [{ part: 'powders', marker: `data-item="${jarFor(drink)}"` }];
    case 'boba': return [{ part: 'boba', marker: 'data-pot="1"' }];
    case 'blend': return [{ part: 'blender', marker: 'data-item="blender"' }];
    case 'shake': return [{ part: 'shaker', marker: 'data-glass="tinBig"' }, { part: 'shaker', marker: 'data-glass="tinSmall"' }];
    case 'foam': return [{ part: 'foamer', marker: 'data-item="foamer"' }];
    case 'whip': return [{ part: 'whipper', marker: 'data-item="whipper"' }];
    default: return [];
  }
}

const BOX = {
  bowl: { x: 512, y: 454, w: 70, h: 44 },
  whisk: { x: 596, y: 446, w: 30, h: 52 },
  teapot: { x: 200, y: 442, w: 72, h: 64 },
  jar: { x: 734, y: 392, w: 84, h: 92 },
  pot: { x: 716, y: 434, w: 108, h: 72 },
  blender: { x: 552, y: 288, w: 133, h: 218 },
  tinBig: { x: 1014, y: 404, w: 42, h: 102 },
  tinSmall: { x: 1062, y: 426, w: 44, h: 80 },
  foamer: { x: 420, y: 342.6, w: 106, h: 163.4 },
  whipper: { x: 262.5, y: 328, w: 135, h: 178 }
} as const;

/** Первый путь слоя `back` сосуда (контур полости) — по нему обрезается налив. */
function backPath(vessel: string): string {
  const m = /data-layer="back" d="([^"]+)"/.exec(vessel);
  if (!m) throw new Error('нет слоя back');
  return m[1] as string;
}

/** Убрать у предмета встроенный налив/слой (его рисует окно), оставив всё остальное. */
const without = (svg: string, re: RegExp): string => svg.replace(re, '');

/** Геометрия окна «Взбить матчу»: чаша бара k × 2,3, венчик (k × 2,6) опущен головой в чашу; всё в координатах окна 400 × 190. */
export function whiskGeom(): { k: number; bx: number; by: number; cx: number; rimY: number; rx: number; ry: number; bowlBottom: number; bowlH: number; wk: number; whiskX: number; whiskY: number; whiskBottom: number } {
  const k = 2.3, wk = 2.6;
  const bx = 200 - (BOX.bowl.w * k) / 2, by = 176 - BOX.bowl.h * k;
  const whiskY = 37;
  return { k, bx, by, cx: 200, rimY: by + (458 - BOX.bowl.y) * k, rx: 35 * k, ry: 6.5 * k, bowlBottom: 176, bowlH: BOX.bowl.h * k, wk, whiskX: 200 - (BOX.whisk.w * wk) / 2, whiskY, whiskBottom: whiskY + BOX.whisk.h * wk };
}

export interface ArtOpts { task: string; col: string; col2: string; drink?: string; size?: string; cold?: boolean }

/** Иллюстрация к шагу. Налив растёт через #xpLiq (его высоту ставит panelUpdate по data-top / data-full). */
export function panelArt(o: ArtOpts): string {
  const { task, col: c, col2: c2, drink } = o;
  switch (task) {
    case 'layer':
      return layerArt(drink ?? 'orange_bumble', o.size ?? '0.3', o.cold ?? true);
    case 'juice':
    case 'tonic': {
      const cap = task === 'tonic' ? 'SAGE' : 'TERRA';
      return `<g ${WRAP}>${cup(c)}<g class="xpTilt">${place(bottleSvg(c, cap), bottleBox(), 61, -19, 1.55, '', 98)}</g>${stream(134, 47, 182, 104, c)}</g>`;
    }
    case 'topping': {
      return `<g ${WRAP}>${cup(col('KRAFT_SH'))}<g class="xpTilt">${place(bottleSvg(c, 'DARK', 20, 56), bottleBox(20, 56), 66, -5, 1.55, '', 98)}</g>${dots(c, [168, 188, 205, 225])}</g>`;
    }
    case 'powder': {
      const jar = jarFor(drink);
      const src = barObject('powders', `data-item="${jar}"`);
      /* порошок в банке — цвет порошка напитка; остальное как на баре */
      const tinted = src.replace(/(<path d="M\d+ 424H\d+V476[^"]*" fill=")[^"]+(")/, `$1${c}$2`);
      return `<g ${WRAP}>${cup(c)}<g class="xpTilt">${place(tinted, BOX.jar, 32, 1, 0.85, '', 95)}</g>${dots(c, [150, 170, 190, 210, 230])}</g>`;
    }
    case 'boba': {
      const pot = barObject('boba', 'data-pot="1"');
      return `<g ${WRAP}>${cup(col('KRAFT'))}<g id="xpPearls" fill="${col('DARK')}" stroke="none"></g><g class="xpTilt">${place(pot, BOX.pot, 16, 26, 1.0, '', 25)}</g>${dots(col('DARK'), [166, 190, 214])}</g>`;
    }
    case 'whisk': {
      const g = whiskGeom();
      const bowl = barObject('matcha', 'data-item="bowl"');
      const whisk = barObject('matcha', 'data-item="whisk"');
      const k = g.k;
      /* передняя стенка: тот же предмет, обрезанный по нижней дуге обода (всё ниже дуги закрывает венчик) */
      const front = `M${g.cx - g.rx - 200} ${g.rimY}H${g.cx - g.rx}A${g.rx} ${g.ry} 0 0 0 ${g.cx + g.rx} ${g.rimY}H${g.cx + g.rx + 200}V${g.bowlBottom + 40}H${g.cx - g.rx - 200}Z`;
      const foam = [[-46, 1, 0.1], [-30, 5, 0.25], [-12, 2, 0.4], [6, 6, 0.55], [26, 1, 0.7], [44, 4, 0.85], [58, -1, 0.95]]
        .map(([dx, dy, at]) => `<circle data-at="${at}" cx="${(g.cx + (dx as number) * 0.9).toFixed(1)}" cy="${(g.rimY + 1 + (dy as number)).toFixed(1)}" r="${(3 + (at as number) * 2).toFixed(1)}" fill="${col('SAGE_LT')}" stroke="none" opacity="0"/>`)
        .join('');
      return `<g ${WRAP}><ellipse cx="200" cy="${(g.bowlBottom + 3).toFixed(1)}" rx="${(BOX.bowl.w * k * 0.6).toFixed(1)}" ry="9" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/>
<g data-layer="bowl-back">${place(bowl, BOX.bowl, g.bx, g.by, k)}</g>
<g data-layer="liquid"><ellipse id="xpMat" cx="${g.cx}" cy="${(g.rimY + 1).toFixed(1)}" rx="${(g.rx * 0.9).toFixed(1)}" ry="${(g.ry * 0.78).toFixed(1)}" fill="${c}" fill-opacity=".35" stroke="none"/>${foam}</g>
<path id="xpMark" d="M0 0" opacity="0"/>
<g data-layer="whisk"><g class="xpWhiskIn">${place(whisk, BOX.whisk, g.whiskX, g.whiskY, g.wk, '', 180)}</g>
<g class="xpSwish" fill="none" stroke="${col('SAGE')}" ${sw('D')} stroke-linecap="round"><path d="M${g.cx - 62} ${g.rimY - 4}Q${g.cx - 54} ${g.rimY - 15} ${g.cx - 44} ${g.rimY - 5}"/><path d="M${g.cx + 44} ${g.rimY - 5}Q${g.cx + 54} ${g.rimY - 15} ${g.cx + 62} ${g.rimY - 4}"/></g></g>
<defs><clipPath id="xpFront"><path d="${front}"/></clipPath></defs>
<g data-layer="bowl-front" clip-path="url(#xpFront)">${place(bowl, BOX.bowl, g.bx, g.by, k)}</g>
<ellipse cx="${g.cx}" cy="${g.rimY}" rx="${g.rx.toFixed(1)}" ry="${g.ry.toFixed(1)}" fill="none" ${sw('M')} clip-path="url(#xpFront)"/></g>`;
    }
    case 'brew': {
      const pot = barObject('tea', 'data-item="glassTeapot"');
      const k = 2.35;
      const tx = 200 - (BOX.teapot.w * k) / 2 - 6, ty = 186 - BOX.teapot.h * k;
      /* встроенный чай (терракотовый слой и тёмная полоса) убран: окно наливает заварку само */
      const empty = without(without(pot, /<path d="M203\.5 488A31 22 0 0 0 264\.5 488Z"[^>]*\/>/), /<ellipse cx="234" cy="488" rx="29" ry="3"[^>]*\/>/);
      const ex = (v: number): number => tx + (v - BOX.teapot.x) * k;
      const ey = (v: number): number => ty + (v - BOX.teapot.y) * k;
      const bot = ey(506), top = ey(468);
      return `<g ${WRAP}><ellipse cx="${ex(234).toFixed(1)}" cy="${(ey(506) + 3).toFixed(1)}" rx="${(34 * k).toFixed(1)}" ry="9" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/>
<defs><clipPath id="xpClip"><ellipse cx="${ex(234).toFixed(1)}" cy="${ey(484).toFixed(1)}" rx="${(31 * k).toFixed(1)}" ry="${(22 * k).toFixed(1)}"/></clipPath></defs>
${place(empty, BOX.teapot, tx, ty, k)}
<g clip-path="url(#xpClip)"><rect id="xpLiq" data-top="${bot.toFixed(1)}" data-full="${(bot - top).toFixed(1)}" x="${(tx).toFixed(1)}" y="${bot.toFixed(1)}" width="${(BOX.teapot.w * k).toFixed(1)}" height="0" fill="${c}"/></g>
<path id="xpMark" d="M0 0" opacity="0"/>
<g id="xpSteamG" fill="none" stroke="${col('STEEL_SH')}" ${sw('M')} stroke-linecap="round" opacity="0"><path d="${`M${ex(222).toFixed(0)} ${(ty - 6).toFixed(0)}Q${(ex(222) - 10).toFixed(0)} ${(ty - 20).toFixed(0)} ${ex(222).toFixed(0)} ${(ty - 32).toFixed(0)}`}"/><path d="${`M${ex(246).toFixed(0)} ${(ty - 6).toFixed(0)}Q${(ex(246) - 10).toFixed(0)} ${(ty - 20).toFixed(0)} ${ex(246).toFixed(0)} ${(ty - 32).toFixed(0)}`}"/></g></g>`;
    }
    case 'blend': {
      const bl = barObject('blender', 'data-item="blender"');
      const jug = groupOf(bl, 'data-glass="blenderJug"');
      const clip = backPath(jug);
      const k = 0.84;
      const bx = 200 - (BOX.blender.w * k) / 2, by = 184 - BOX.blender.h * k;
      const mapY = (v: number): number => by + (v - BOX.blender.y) * k;
      /* налив внутри кувшина, поверх задней стенки (рисуется до контура и пестика) */
      const liqRect = `<g clip-path="url(#xpClip)"><rect id="xpLiq" data-top="${mapY(427).toFixed(1)}" data-full="${(mapY(427) - mapY(318)).toFixed(1)}" x="540" y="${mapY(427).toFixed(1)}" width="130" height="0" fill="${c}"/></g>`;
      const withLiq = bl.replace(/(<path data-layer="back" d="[^"]+"[^>]*\/>)/, `$1${liqRect}`);
      return `<g ${WRAP}><defs><clipPath id="xpClip"><path d="${clip}"/></clipPath></defs><ellipse cx="200" cy="186" rx="64" ry="5" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/><g class="xpShake">${place(withLiq, BOX.blender, bx, by, k)}</g><path id="xpMark" d="M0 0" opacity="0"/></g>`;
    }
    case 'shake': {
      const big = barObject('shaker', 'data-glass="tinBig"');
      const small = barObject('shaker', 'data-glass="tinSmall"');
      const clip = backPath(big);
      const k = 1.6;
      const bx = 120, by = 182 - BOX.tinBig.h * k;
      const mapY = (v: number): number => by + (v - BOX.tinBig.y) * k;
      const liqRect = `<g clip-path="url(#xpClip)"><rect id="xpLiq" data-top="${mapY(505).toFixed(1)}" data-full="${(mapY(505) - mapY(412)).toFixed(1)}" x="1000" y="${mapY(505).toFixed(1)}" width="60" height="0" fill="${c}" fill-opacity=".9"/></g>`;
      const bigLiq = big.replace(/(<path data-layer="back" d="[^"]+"[^>]*\/>)/, `$1${liqRect}`);
      return `<g ${WRAP}><ellipse cx="200" cy="186" rx="86" ry="6" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/><defs><clipPath id="xpClip" clipPathUnits="userSpaceOnUse"><path d="${clip}"/></clipPath></defs><g class="xpShake">${place(bigLiq, BOX.tinBig, bx, by, k)}${place(small, BOX.tinSmall, bx + (BOX.tinSmall.x - BOX.tinBig.x) * k, 182 - BOX.tinSmall.h * k, k)}</g><path id="xpMark" d="M0 0" opacity="0"/></g>`;
    }
    case 'foam': {
      const fo = barObject('foamer', 'data-item="foamer"');
      return `<g ${WRAP}>${place(fo, BOX.foamer, 26, 14, 0.92)}${cup(col('BAKE'), `<rect id="xpFoam" x="130" y="172" width="140" height="0" fill="${c2}"/>`)}<g class="xpWhisk" style="transform-origin:206px 30px"><rect x="202" y="10" width="8" height="112" rx="4" fill="${col('STEEL')}" ${sw('M')}/><ellipse cx="206" cy="124" rx="16" ry="4" fill="${col('STEEL_HI')}" ${sw('M')}/></g></g>`;
    }
    case 'whip': {
      const wh = barObject('whipper', 'data-item="whipper"');
      return `<g ${WRAP}>${place(wh, BOX.whipper, 18, 8, 1.0)}<ellipse cx="318" cy="178" rx="62" ry="9" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/><path d="M262 154H374L366 176H270Z" fill="${col('PAPER')}" ${sw('M')}/><path d="M280 154Q280 124 318 122Q356 124 356 154Z" fill="${c2}" ${sw('M')}/>
<rect id="xpLiq" x="0" y="0" width="0" height="0" fill="none"/><path id="xpMark" d="M0 0" opacity="0"/>${dots(c2, [168, 186, 204], 84)}</g>`;
    }
    default:
      return `<g ${WRAP}>${cup(c)}</g>`;
  }
}

/** Окно «Налить слоями»: нижние слои (сок, тоник) налиты и неподвижны, верхний (эспрессо или матча) льётся из кувшина и растёт до конца шага. */
const LAYER_BASE = 172;
const LAYER_FULL = 124;
const ICE_CUBES: [number, number, number][] = [[160, 70, -8], [190, 62, 6], [222, 72, -5], [172, 100, 9], [208, 104, -7], [232, 98, 8]];
function layerArt(drink: string, size: string, cold: boolean): string {
  const lv = layerView(drink, 0, size as never, cold);
  let y = LAYER_BASE;
  const base: string[] = [];
  for (const l of lv.slice(0, -1)) {
    const h = l.share * LAYER_FULL;
    base.push(`<rect x="130" y="${(y - h).toFixed(1)}" width="140" height="${h.toFixed(1)}" fill="${l.color}"/>`);
    y -= h;
  }
  const top = lv[lv.length - 1] as (typeof lv)[number];
  const topFull = top.share * LAYER_FULL;
  const cubes = ICE_CUBES.map(([cx, cy, r]) => `<g transform="rotate(${r} ${cx} ${cy})"><rect x="${cx - 13}" y="${cy - 13}" width="26" height="26" rx="4" fill="${col('GLASS')}" fill-opacity=".7" ${sw('D')}/><path d="M${cx - 9} ${cy - 8}V${cy + 2}" fill="none" stroke="${col('PAPER')}" ${sw('D')}/></g>`).join('');
  const matcha = layerSourceOf(drink) === 'matcha';
  const pourer = matcha
    ? place(groupOf(PARTS_L.matcha?.svg ?? '', 'data-item="kyusu"'), { x: 436, y: 438, w: 64, h: 60 }, 24, 14, 1.75, '', 28)
    : place(groupOf(PARTS_C.pitFront?.svg ?? '', 'transform="translate(940 514)"'), { x: 903, y: 434, w: 83, h: 78 }, 22, 16, 1.4, '', -32, { flip: true, src: 1 });
  const sx = matcha ? 124 : 126, sy = matcha ? 70 : 62;
  return `<g ${WRAP}><defs><clipPath id="xpClip"><path d="${CUP_PATH}"/></clipPath></defs>
<path d="${CUP_PATH}" fill="${col('GLASS')}" stroke="none"/>
<g clip-path="url(#xpClip)">${base.join('')}<rect id="xpLayer" data-top="${y.toFixed(1)}" data-full="${topFull.toFixed(1)}" x="130" y="${y.toFixed(1)}" width="140" height="0" fill="${top.color}"/>${cubes}</g>
<path d="${CUP_PATH}" fill="none" ${sw('M')}/>
<path d="M156 40L162 150" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${sw('M')}/>
<path id="xpMark" d="M0 0" opacity="0"/>
<g class="xpTilt">${pourer}</g>${stream(sx, sy, 176, y, top.color)}</g>`;
}
