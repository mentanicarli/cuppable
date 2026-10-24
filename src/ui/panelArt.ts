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
import { sizesOf, specOf } from '../game/drinkModel';
import { layerSourceOf, layerView } from '../game/layers';
import { buildTasks } from '../game/recipes';
import { drinkPx } from '../render/world/drinkModel';

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
function cup(liq: string, extra = '', pre?: { base: string; top: number; full: number }): string {
  const top = pre ? pre.top.toFixed(1) : '172';
  const full = pre ? pre.full.toFixed(1) : '140';
  return `<defs><clipPath id="xpClip"><path d="${CUP_PATH}"/></clipPath></defs>
<path d="${CUP_PATH}" fill="${col('GLASS')}" stroke="none"/>
<g clip-path="url(#xpClip)">${pre ? pre.base : ''}<rect id="xpLiq" data-top="${top}" data-full="${full}" x="130" y="${top}" width="140" height="0" fill="${liq}"/>${extra}</g>
<path d="${CUP_PATH}" fill="none" ${sw('M')}/>
<path d="M156 40L162 150" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${sw('M')}/>
<path id="xpMark" data-top="${top}" data-full="${full}" data-x0="144" data-x1="256" d="M144 100H256" fill="none" stroke="${INK}" stroke-dasharray="5 5" ${sw('D')}/>`;
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
    case 'foam': return [{ part: 'whipper', marker: 'data-item="whipper"' }];
    case 'drip':
    case 'carafe': return [{ part: 'drip', marker: 'data-item="drip"' }];
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

const ICE_RECV: [number, number, number][] = [[166, 72, -8], [196, 66, 6], [226, 76, -5], [176, 106, 9], [212, 112, -7], [236, 102, 8]];
const iceCube = (cx: number, cy: number, r: number, s = 26): string => `<g transform="rotate(${r} ${cx} ${cy})"><rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" rx="4" fill="${col('GLASS')}" fill-opacity=".7" ${sw('D')}/><path d="M${cx - s / 2 + 4} ${cy - s / 2 + 5}V${cy + 2}" fill="none" stroke="${col('PAPER')}" ${sw('D')}/></g>`;
/** Шаги рецепта до `task` содержат `what` (например лёд насыпан раньше). */
function doneBefore(drink: string | undefined, task: string, what: string, cold?: boolean): boolean {
  if (!drink) return false;
  try {
    const t = buildTasks(drink, { cold: cold ?? true, syrup: false });
    const i = t.indexOf(task);
    return t.indexOf(what) >= 0 && t.indexOf(what) < (i < 0 ? t.length : i);
  } catch {
    return false;
  }
}
const receiverIceFlag = (drink: string | undefined, task: string, cold?: boolean): boolean => doneBefore(drink, task, 'ice', cold);
/** Кубики льда в приёмнике-стакане, если лёд уже насыпан. */
const receiverIce = (drink: string | undefined, task: string, cold?: boolean): string => (receiverIceFlag(drink, task, cold) ? ICE_RECV.map(([x, y, r]) => iceCube(x, y, r)).join('') : '');
/** Кубики во внутренних координатах предмета бара (толщины как в JSON: токен / 1,1); data-fade — тают по прогрессу. */
function receiverCubesDesign(pts: [number, number][], s: number, fade: boolean): string {
  const dw = `stroke-width="${(W.D / SRC_SCALE).toFixed(2)}"`;
  return `<g${fade ? ' data-fade="1"' : ''}>${pts.map(([x, y], i) => `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="3" fill="${col('GLASS')}" fill-opacity=".65" ${dw} transform="rotate(${i % 2 ? 8 : -8} ${x} ${y})"/>`).join('')}</g>`;
}
/** Принимающий стакан без налива (слои уже есть в `inner`): те же стенки, ободок и блик, что у cup(). */
function cupBase(inner: string): string {
  return `<defs><clipPath id="xpClip"><path d="${CUP_PATH}"/></clipPath></defs>
<path d="${CUP_PATH}" fill="${col('GLASS')}" stroke="none"/>
<g clip-path="url(#xpClip)">${inner}</g>
<path d="${CUP_PATH}" fill="none" ${sw('M')}/>
<path d="M156 40L162 150" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${sw('M')}/>`;
}
/** Напиток заказа в стакане: слои из спецификации снизу вверх (цвета — данные напитка), `height` — высота столбца, верх на `topY`. */
function receiverDrink(drink: string | undefined, size: string | undefined, cold: boolean | undefined, height: number, topY: number): { layers: string; surface: number } {
  const bottom = topY + height;
  try {
    const spec = specOf(drink ?? 'latte', (size ?? '0.3') as never, cold ?? true);
    let y = bottom;
    const rects = spec.liquid.map((l) => {
      const h = l.frac * height;
      y -= h;
      return `<rect x="130" y="${y.toFixed(1)}" width="140" height="${h.toFixed(1)}" fill="${l.color}"/>`;
    });
    return { layers: rects.join(''), surface: topY };
  } catch {
    return { layers: `<rect x="130" y="${topY}" width="140" height="${height}" fill="${col('KRAFT')}"/>`, surface: topY };
  }
}

/** Солонка-банка со специями (31-3, шаг 4): рисуется только в окне, из примитивов палитры; координаты проектные (толщины токен / 1,1, как у предметов бара). */
export function spiceShakerSvg(color: string): string {
  const dw = `stroke-width="${(W.D / SRC_SCALE).toFixed(2)}"`;
  const mw = `stroke-width="${(W.M / SRC_SCALE).toFixed(2)}"`;
  return `<g data-spice="1"><path d="M6 14H34Q37 14 37 18V52Q37 58 31 58H9Q3 58 3 52V18Q3 14 6 14Z" fill="${col('GLASS')}" ${mw}/><path d="M4 36H36V52Q36 57 31 57H9Q4 57 4 52Z" fill="${color}" stroke="none"/><path d="M8 20Q7 34 8 50" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${mw}/><rect x="5" y="4" width="30" height="12" rx="4" fill="${col('STEEL_HI')}" ${mw}/><circle cx="12" cy="10" r="1.4" fill="${col('DARK')}" stroke="none"/><circle cx="20" cy="10" r="1.4" fill="${col('DARK')}" stroke="none"/><circle cx="28" cy="10" r="1.4" fill="${col('DARK')}" stroke="none"/><path d="M5 20H35" fill="none" stroke="${col('STEEL_SH')}" ${dw}/></g>`;
}
const SPICE_BOX: Box = { x: 3, y: 4, w: 34, h: 54 };

/** Шаги рецепта после `task` содержат `what`. */
function laterThan(drink: string | undefined, task: string, what: string, cold?: boolean): boolean {
  if (!drink) return false;
  try {
    const t = buildTasks(drink, { cold: cold ?? true, syrup: false });
    return t.indexOf(what) > t.indexOf(task) && t.indexOf(task) >= 0;
  } catch {
    return false;
  }
}
/** Слои спецификации, кроме последнего (он наливается в окне): заварка под соком. */
function receiverLayersSpec(drink: string | undefined, size: string | undefined, cold: boolean | undefined): { base: string; top: number; full: number } | null {
  try {
    const spec = specOf(drink ?? 'latte', (size ?? '0.3') as never, cold ?? true);
    if (spec.liquid.length < 2) return null;
    const H = 128;
    let y = 172;
    const rects: string[] = [];
    for (const l of spec.liquid.slice(0, -1)) {
      const h = l.frac * H;
      y -= h;
      rects.push(`<rect x="130" y="${y.toFixed(1)}" width="140" height="${h.toFixed(1)}" fill="${l.color}"/>`);
    }
    const last = spec.liquid[spec.liquid.length - 1];
    return { base: rects.join(''), top: y, full: (last?.frac ?? 0.2) * H };
  } catch {
    return null;
  }
}

export interface ArtOpts { task: string; col: string; col2: string; drink?: string; size?: string; cold?: boolean }

/** Иллюстрация к шагу. Налив растёт через #xpLiq (его высоту ставит panelUpdate по data-top / data-full). */
/** Кофеварка бара (корпус и колба) и её передний слой; сцена окна 400 × 190: предмет 130 × 160 ставится в (x, 16). */
const DRIP_ITEM: Box = { x: 859, y: 346, w: 130, h: 160 };
const CARAFE_IN = { dx: 25, bottom: 140, w: 44, full: 52 }; /* стеклянная колба внутри предмета: левый край, дно от верха предмета, ширина, высота кофе */
function dripScene(x: number, level: number, k = 1): string {
  const y = 16 + DRIP_ITEM.h * (1 - k); /* основание на одной линии при любом масштабе */
  const body = place(barObject('drip', 'data-item="drip"'), DRIP_ITEM, x, y, k, '', 0, { src: 1 });
  const front = place((PARTS_C['dripFront'] as Part).svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''), { x: 878, y: 424, w: 58, h: 68 }, x + 19 * k, y + 78 * k, k, '', 0, { src: 1 });
  const cx = x + CARAFE_IN.dx * k, bottom = y + CARAFE_IN.bottom * k, full = CARAFE_IN.full * k;
  const liq = `<rect id="xpCar" data-top="${bottom.toFixed(1)}" data-full="${full.toFixed(1)}" data-level="${level.toFixed(3)}" x="${cx.toFixed(1)}" y="${(bottom - full * level).toFixed(1)}" width="${(CARAFE_IN.w * k).toFixed(1)}" height="${(full * level).toFixed(1)}" rx="3" fill="${col('CHOC')}" stroke="none"/>`;
  return `${body}${liq}${front}`;
}

export function panelArt(o: ArtOpts): string {
  const { task, col: c, col2: c2, drink } = o;
  switch (task) {
    case 'carafe':
      /* окно заварки колбы: кофеварка по центру, уровень кофе в колбе обновляет panelUpdate (#xpCar, PanelLive.level) */
      return `<g ${WRAP}>${dripScene(144, 0)}<path id="xpMark" d="M0 0" opacity="0"/></g>`;
    case 'drip': {
      /* налив из колбы: кофеварка слева (уровень падает по мере налива), стакан справа; налив растёт через #xpLiq */
      const pre = { base: '', top: 172, full: 140 };
      return `<g ${WRAP}>${dripScene(4, 0)}${cup(c, '', pre)}</g>`;
    }
    case 'layer':
      return layerArt(drink ?? 'orange_bumble', o.size ?? '0.3', o.cold ?? true);
    case 'juice':
    case 'tonic': {
      const cap = task === 'tonic' ? 'SAGE' : 'TERRA';
      const bottle = `<g class="xpTilt">${place(bottleSvg(c, cap), bottleBox(), 61, -19, 1.55, '', 98)}</g>${stream(134, 47, 182, 104, c)}`;
      /* блендерный напиток (молоко → сок → блендер): приёмник — кувшин блендера бара с уже налитым молоком */
      if (task === 'juice' && doneBefore(drink, task, 'milk', o.cold) && laterThan(drink, task, 'blend', o.cold)) {
        const bl = barObject('blender', 'data-item="blender"');
        const clip = backPath(groupOf(bl, 'data-glass="blenderJug"'));
        const k = 0.84, bx = 168, by = 184 - BOX.blender.h * k;
        const mapY = (v: number): number => by + (v - BOX.blender.y) * k;
        const milkTop = 428 - (428 - 318) * 0.5;
        const content = `<g clip-path="url(#xpClip)"><rect x="540" y="${milkTop}" width="130" height="${428 - milkTop}" fill="${col('PAPER')}"/><rect id="xpLiq" data-top="${milkTop}" data-full="${(milkTop - 322).toFixed(1)}" x="540" y="${milkTop}" width="130" height="0" fill="${c}"/>${receiverIceFlag(drink, task, o.cold) ? receiverCubesDesign([[590, 352], [618, 346], [600, 388], [628, 384]], 15, false) : ''}</g>`;
        const withLiq = bl.replace(/(<path data-layer="back" d="[^"]+"[^>]*\/>)/, `$1${content}`);
        return `<g ${WRAP}><defs><clipPath id="xpClip"><path d="${clip}"/></clipPath></defs><ellipse cx="${(bx + 56).toFixed(0)}" cy="186" rx="64" ry="5" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/>${place(withLiq, BOX.blender, bx, by, k, 'data-receiver="blender"')}<path id="xpMark" data-top="${mapY(milkTop).toFixed(1)}" data-full="${(mapY(milkTop) - mapY(322)).toFixed(1)}" data-x0="190" data-x1="250" d="M0 0" opacity="0"/>${bottle}</g>`;
      }
      /* настой из прошлого шага (чай со смородиной): в стакане уже слой заварки по спецификации, сок наливается отдельной полосой сверху */
      if (task === 'juice' && doneBefore(drink, task, 'brew', o.cold)) {
        const r = receiverLayersSpec(drink, o.size, o.cold);
        if (r) return `<g ${WRAP}>${cup(c, receiverIce(drink, task, o.cold), r)}${bottle}</g>`;
      }
      /* приёмник — стакан заказа: лёд, насыпанный шагом «Лёд», уже лежит в нём */
      return `<g ${WRAP}>${cup(c, receiverIce(drink, task, o.cold))}${bottle}</g>`;
    }
    case 'topping': {
      /* приёмник — стакан с уже налитым напитком (слои из спецификации); топпинг ложится сверху и растёт по прогрессу */
      const r = receiverDrink(drink, o.size, o.cold, 120, 52);
      const spice = /pumpkin/.test(drink ?? '');
      const src = spice
        ? place(spiceShakerSvg(c), SPICE_BOX, 58, 4, 1.7, '', 98)
        : place(bottleSvg(c, 'DARK', 20, 56), bottleBox(20, 56), 66, -5, 1.55, '', 98);
      return `<g ${WRAP}>${cupBase(r.layers + receiverIce(drink, task, o.cold))}<ellipse id="xpTop" data-grow="1" data-base="${r.surface.toFixed(1)}" data-ry="9" cx="200" cy="${r.surface.toFixed(1)}" rx="52" ry="0" fill="${c}" ${sw('M')}/><path id="xpMark" data-top="172" data-full="120" data-x0="144" data-x1="256" d="M0 0" opacity="0"/><g class="xpTilt">${src}</g>${dots(c, [168, 188, 205, 225], 22)}</g>`;
    }
    case 'powder': {
      const jar = jarFor(drink);
      const src = barObject('powders', `data-item="${jar}"`);
      /* порошок в банке — цвет порошка напитка; остальное как на баре */
      const tinted = src.replace(/(<path d="M\d+ 424H\d+V476[^"]*" fill=")[^"]+(")/, `$1${c}$2`);
      const jarSvg = `<g class="xpTilt">${place(tinted, { ...BOX.jar, x: { jarCocoa: 734, jarChicory: 826, jarProtein: 918 }[jar] }, 32, 1, 0.85, '', 95)}</g>${dots(c, [160, 178, 196, 214, 232])}`;
      /* протеин: порошок сыплют сразу в большой стакан шейкера бара (дальше молоко или вода и шейкер) */
      if (/protein/.test(drink ?? '')) {
        const big = barObject('shaker', 'data-glass="tinBig"');
        const clip = backPath(big);
        const k = 1.45, bx = 168, by = 182 - BOX.tinBig.h * k;
        const mapY = (v: number): number => by + (v - BOX.tinBig.y) * k;
        const liqRect = `<g clip-path="url(#xpClip)"><rect id="xpLiq" data-top="${mapY(505).toFixed(1)}" data-full="${(mapY(505) - mapY(412)).toFixed(1)}" x="1000" y="${mapY(505).toFixed(1)}" width="60" height="0" fill="${c}"/></g>`;
        const tin = big.replace(/(<path data-layer="back" d="[^"]+"[^>]*\/>)/, `$1${liqRect}`);
        return `<g ${WRAP}><defs><clipPath id="xpClip" clipPathUnits="userSpaceOnUse"><path d="${clip}"/></clipPath></defs><ellipse cx="${(bx + 30).toFixed(0)}" cy="186" rx="44" ry="5" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/>${place(tin, BOX.tinBig, bx, by, k, 'data-receiver="shaker"')}<path id="xpMark" data-top="${mapY(505).toFixed(1)}" data-full="${(mapY(505) - mapY(412)).toFixed(1)}" data-x0="${(bx + 6).toFixed(0)}" data-x1="${(bx + 56).toFixed(0)}" d="M0 0" fill="none" stroke="${INK}" stroke-dasharray="5 5" ${sw('D')}/>${jarSvg}</g>`;
      }
      return `<g ${WRAP}>${cup(c)}${jarSvg}</g>`;
    }
    case 'boba': {
      const pot = barObject('boba', 'data-pot="1"');
      /* приёмник — стакан с чаем и льдом из прошлых шагов (чай заварен, лёд насыпан, взболтано); кастрюля сыплет шарики на дно */
      const pearls = [[160, 164], [172, 164], [184, 164], [196, 164], [208, 164], [220, 164], [232, 164], [166, 152], [178, 152], [190, 152], [202, 152], [214, 152], [226, 152], [172, 140], [184, 140], [196, 140], [208, 140], [220, 140]]
        .map(([x, y], i, a) => `<circle data-at="${((i + 1) / a.length).toFixed(2)}" cx="${x}" cy="${y}" r="5.6" fill="${col('DARK')}" ${sw('D')} opacity="0"/>`)
        .join('');
      const tea = `<rect x="130" y="${(172 - 100).toFixed(1)}" width="140" height="100" fill="${c}"/>`;
      return `<g ${WRAP}>${cupBase(tea + receiverIce(drink, task, o.cold) + pearls)}<path id="xpMark" data-top="172" data-full="36" data-x0="144" data-x1="256" d="M144 100H256" fill="none" stroke="${INK}" stroke-dasharray="5 5" ${sw('D')}/><g class="xpTilt">${place(pot, BOX.pot, 16, 26, 1.0, '', 25)}</g>${dots(col('DARK'), [166, 190, 214])}</g>`;
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
      /* кувшин уже полон: молоко, лёд и добавки налиты прошлыми шагами; блендер их взбивает (лёд тает по прогрессу) */
      const cubes = receiverCubesDesign([[590, 352], [618, 346], [600, 388], [628, 384]], 15, true);
      const liqRect = `<g clip-path="url(#xpClip)"><rect id="xpLiq" data-start="0.72" data-top="${mapY(427).toFixed(1)}" data-full="${(mapY(427) - mapY(318)).toFixed(1)}" x="540" y="${mapY(427).toFixed(1)}" width="130" height="0" fill="${c}"/>${receiverIceFlag(drink, task, o.cold) ? cubes : ''}</g>`;
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
      /* стакан уже полон (чай и лёд / порошок и молоко из прошлых шагов); встряхивание смешивает, лёд тает */
      const cubes = receiverCubesDesign([[1028, 440], [1042, 462], [1030, 484]], 11, true);
      const liqRect = `<g clip-path="url(#xpClip)"><rect id="xpLiq" data-start="0.72" data-top="${mapY(505).toFixed(1)}" data-full="${(mapY(505) - mapY(412)).toFixed(1)}" x="1000" y="${mapY(505).toFixed(1)}" width="60" height="0" fill="${c}" fill-opacity=".9"/>${receiverIceFlag(drink, task, o.cold) ? cubes : ''}</g>`;
      const bigLiq = big.replace(/(<path data-layer="back" d="[^"]+"[^>]*\/>)/, `$1${liqRect}`);
      return `<g ${WRAP}><ellipse cx="200" cy="186" rx="86" ry="6" fill="${col('SHADOW')}" fill-opacity=".25" stroke="none"/><defs><clipPath id="xpClip" clipPathUnits="userSpaceOnUse"><path d="${clip}"/></clipPath></defs><g class="xpShake">${place(bigLiq, BOX.tinBig, bx, by, k)}${place(small, BOX.tinSmall, bx + (BOX.tinSmall.x - BOX.tinBig.x) * k, 182 - BOX.tinSmall.h * k, k)}</g><path id="xpMark" d="M0 0" opacity="0"/></g>`;
    }
    case 'foam': {
      /* сифон бара взбивает пенку на напиток в стакане: приёмник — стакан с готовым напитком, пенка растёт шапкой сверху */
      const wh = barObject('whipper', 'data-item="whipper"');
      const r = receiverDrink(drink, o.size, o.cold, 100, 52);
      const wrap = `<ellipse id="xpCream" data-grow="1" data-base="${r.surface.toFixed(1)}" data-ry="20" cx="258" cy="${r.surface.toFixed(1)}" rx="46" ry="0" fill="${c2}" ${sw('M')} transform="translate(-58 0)"/>`;
      return `<g ${WRAP}>${place(wh, BOX.whipper, 6, 14, 0.9)}${cupBase(r.layers + receiverIce(drink, task, o.cold))}${wrap}<path id="xpMark" d="M0 0" opacity="0"/>${dots(c2, [150, 168, 186], 44)}</g>`;
    }
    default:
      return `<g ${WRAP}>${cup(c)}</g>`;
  }
}

/** Окно «Налить слоями» (31-3): стакан справа, источник слева выше и наклонён носиком к краю, ложка у поверхности. Нижние слои налиты и неподвижны, верхний растёт. */
export const LAYER_GLASS = { x0: 140, x1: 260, top: 48, bottom: 176 } as const;
const LAYER_PATH = 'M140 48H260L250 176H150Z';
const LAYER_FULL = 108;
const ICE_CUBES: [number, number, number][] = [[162, 82, -8], [192, 74, 6], [224, 84, -5], [174, 114, 9], [210, 118, -7], [234, 110, 8]];
/** Наклон источника, градусов по часовой стрелке: растёт с прогрессом налива. */
export const LAYER_ANGLE = { a0: 26, a1: 34 } as const;
/** Носик (кромка источника) стоит над ободом стакана слева от его края. */
const LIP = { x: 132, y: 47 };

interface SourceBox { w: number; h: number; cx: number; cy: number }
/** Рамка источника без поворота (центр, размер) для проверки пересечения со стаканом; поворот — вокруг центра на угол из LAYER_ANGLE. */
export function layerSourceBox(drink: string): SourceBox {
  const matcha = layerSourceOf(drink) === 'matcha';
  const w = matcha ? BOX.bowl.w * 1.25 : espressoBox().w, h = matcha ? BOX.bowl.h * 1.25 : espressoBox().h;
  /* носик — правый верхний угол рамки; центр выбран так, чтобы при среднем угле носик встал в LIP */
  const a = (((LAYER_ANGLE.a0 + LAYER_ANGLE.a1) / 2) * Math.PI) / 180;
  const lx = (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), ly = (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a);
  return { w, h, cx: LIP.x - lx, cy: LIP.y - ly };
}
/** Охватывающий прямоугольник источника при прогрессе p (поворот рамки вокруг центра). */
export function layerSourceRect(drink: string, p: number): { x0: number; y0: number; x1: number; y1: number } {
  const b = layerSourceBox(drink);
  const a = ((LAYER_ANGLE.a0 + (LAYER_ANGLE.a1 - LAYER_ANGLE.a0) * p) * Math.PI) / 180;
  const xs: number[] = [], ys: number[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    const x = (sx * b.w) / 2, y = (sy * b.h) / 2;
    xs.push(b.cx + x * Math.cos(a) - y * Math.sin(a));
    ys.push(b.cy + x * Math.sin(a) + y * Math.cos(a));
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function espressoBox(): { x: number; y: number; w: number; h: number; inner: string } {
  const px = drinkPx(specOf('espresso', sizesOf('espresso', false)[0] as never, false), { level: 'full', s: 1.1, noSaucer: true });
  return { ...px.all.box, inner: px.all.inner };
}

function layerArt(drink: string, size: string, cold: boolean): string {
  const lv = layerView(drink, 0, size as never, cold);
  let y: number = LAYER_GLASS.bottom;
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
  const sb = layerSourceBox(drink);
  const a0 = LAYER_ANGLE.a0;
  let source: string;
  if (matcha) {
    /* чаша, в которой взбивали матчу: та же группа бара; зелёная гладь в обводе чаши убывает по мере налива */
    const bowl = barObject('matcha', 'data-item="bowl"');
    const liq = `<ellipse id="xpSrcLiq" cx="547" cy="458" rx="31" ry="4.6" fill="${top.color}" stroke="none" style="transform-box:fill-box;transform-origin:center"/>`;
    const withLiq = bowl.replace(/<path d="M530 497H564"/, `${liq}<path d="M530 497H564"`);
    source = place(withLiq, BOX.bowl, sb.cx - sb.w / 2, sb.cy - sb.h / 2, 1.25, 'data-vessel="bowl"');
  } else {
    /* сосуд для шота: демитас модели (чашка с эспрессо), ручка слева, носик справа */
    const e = espressoBox();
    source = place(e.inner, e, sb.cx - sb.w / 2, sb.cy - sb.h / 2, 1, 'data-vessel="shot"', 0, { flip: true, src: 1 });
  }
  const spoonY = y;
  const spoon = `<g id="xpSpoon" data-top="${y.toFixed(1)}" data-full="${topFull.toFixed(1)}" transform="translate(0 0)"><path d="M206 ${(spoonY - 2).toFixed(1)}L262 ${(spoonY - 62).toFixed(1)}L266 ${(spoonY - 59).toFixed(1)}L210 ${(spoonY + 1).toFixed(1)}Z" fill="${col('STEEL')}" ${sw('D')}/><ellipse cx="192" cy="${(spoonY - 1).toFixed(1)}" rx="19" ry="4" fill="${col('STEEL_HI')}" ${sw('M')}/><ellipse cx="192" cy="${(spoonY - 1.6).toFixed(1)}" rx="13" ry="1.8" fill="${col('STEEL_SH')}" stroke="none"/></g>`;
  return `<g ${WRAP}><defs><clipPath id="xpClip"><path d="${LAYER_PATH}"/></clipPath></defs>
<g id="xpSrc" data-a0="${a0}" data-a1="${LAYER_ANGLE.a1}" data-cx="${sb.cx.toFixed(1)}" data-cy="${sb.cy.toFixed(1)}" transform="rotate(${a0} ${sb.cx.toFixed(1)} ${sb.cy.toFixed(1)})">${source}</g>
<path d="${LAYER_PATH}" fill="${col('GLASS')}" stroke="none"/>
<g clip-path="url(#xpClip)">${base.join('')}<rect id="xpLayer" data-top="${y.toFixed(1)}" data-full="${topFull.toFixed(1)}" x="130" y="${y.toFixed(1)}" width="140" height="0" fill="${top.color}"/>${cubes}</g>
<path d="${LAYER_PATH}" fill="none" ${sw('M')}/>
<path d="M156 60L162 160" fill="none" stroke="${col('HILITE')}" stroke-opacity=".75" ${sw('M')}/>
<path id="xpMark" d="M0 0" opacity="0"/>
${spoon}${stream(LIP.x + 3, LIP.y + 3, 190, y, top.color)}</g>`;
}
