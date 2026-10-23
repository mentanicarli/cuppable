/**
 * Панели «станций» нового ядра: налив, таймер «держите», заварка.
 * HTML-панель в стиле игры с живой SVG-иллюстрацией; логика — в src/game/stations.
 */
import { BREW_TEMPS } from '../game/stations/brew';
import { panelArt, streamD } from './panelArt';

export type PanelKind = 'fill' | 'timed' | 'brew';
export interface PanelView {
  task: string;
  /** напиток заказа: выбирает банку порошков и т. п. */
  drink?: string;
  /** размер и холодность заказа (окно «слои» берёт слои из спецификации напитка) */
  size?: string;
  cold?: boolean;
  kind: PanelKind;
  title: string;
  hint: string;
  /** Цвет содержимого / второй цвет (пена, топпинг). */
  col: string;
  col2: string;
  /** Шкала: максимум значения и зона цели. */
  max: number;
  zone: [number, number];
  holdLabel: string;
  brew?: { set: number | null; started: boolean; target: { temp: number; minutes: number } | null };
}

/** Что рисуется заново каждый кадр. */
export interface PanelLive {
  value: number;
  readout: string;
  holding: boolean;
  brewStarted?: boolean;
}

/** Иллюстрация к шагу: предметы бара (31-2), см. panelArt.ts. Налив растёт через #xpLiq (data-top / data-full ставит panelUpdate). */
export function artFor(v: Pick<PanelView, 'task' | 'col' | 'col2' | 'drink' | 'size' | 'cold'>): string {
  return panelArt({ task: v.task, col: v.col, col2: v.col2, drink: v.drink, size: v.size, cold: v.cold });
}

const f1 = (n: number) => n.toFixed(1).replace('.', ',');

export function panelHTML(v: PanelView): string {
  const pct = (x: number) => Math.min(100, Math.max(0, (x / v.max) * 100));
  const lo = pct(v.zone[0]);
  const hi = pct(v.zone[1]);
  let controls: string;
  if (v.kind === 'brew') {
    const b = v.brew;
    const temps = BREW_TEMPS.map(
      (t) => `<button type="button" class="xpTemp${b?.set === t ? ' on' : ''}" data-xtemp="${t}"${b?.started ? ' disabled' : ''}>${t}°</button>`
    ).join('');
    controls = `<div class="xpTemps">${temps}</div>
<div class="xpBar"><i class="zone" style="left:${lo}%;width:${Math.max(2, hi - lo)}%"></i><i class="fill" id="xpFill"></i></div>
<div class="xpRead" id="xpRead"></div>
<div class="xpBtns"><button type="button" class="xpGo" data-xstart${b?.started ? ' disabled' : ''}>Залить водой</button><button type="button" class="xpDone" data-xdone>Вынуть</button></div>`;
  } else {
    controls = `<div class="xpBar"><i class="zone" style="left:${lo}%;width:${Math.max(2, hi - lo)}%"></i><i class="fill" id="xpFill"></i></div>
<div class="xpRead" id="xpRead"></div>
<div class="xpBtns"><button type="button" class="xpHold" data-xhold>${v.holdLabel}</button>${v.kind === 'fill' ? '<button type="button" class="xpDump" data-xdump>Вылить</button>' : ''}<button type="button" class="xpDone" data-xdone>Готово</button></div>`;
  }
  return `<div class="xp" data-task="${v.task}"><div class="xpHead"><b>${v.title}</b><span>${v.hint}</span></div>
<svg class="xpArt" viewBox="0 0 400 190" aria-hidden="true">${artFor(v)}</svg>${controls}</div>`;
}

/** Покадровое обновление: шкала, число, уровень жидкости, анимации. */
export function panelUpdate(root: HTMLElement, v: PanelView, l: PanelLive): void {
  const frac = Math.min(1, Math.max(0, l.value / v.max));
  const fill = root.querySelector<HTMLElement>('#xpFill');
  if (fill) fill.style.width = (frac * 100).toFixed(1) + '%';
  const rd = root.querySelector<HTMLElement>('#xpRead');
  if (rd && rd.textContent !== l.readout) rd.textContent = l.readout;
  const xp = root.querySelector<HTMLElement>('.xp');
  if (xp) { xp.classList.toggle('hold', l.holding); xp.classList.toggle('run', !!l.brewStarted); }
  const liq = root.querySelector<SVGGraphicsElement>('#xpLiq');
  if (liq) {
    /* верх (дно сосуда) и полная высота налива задаёт иллюстрация: у каждого предмета бара свои */
    const top = Number(liq.getAttribute('data-top') ?? 172);
    const full = Number(liq.getAttribute('data-full') ?? 140);
    const h = Math.min(full, frac * full);
    liq.setAttribute('y', (top - h).toFixed(1));
    liq.setAttribute('height', h.toFixed(1));
  }
  /* «Налить слоями»: верхний слой растёт за время цели, нижние налиты заранее; струя кончается на поверхности */
  const lay = root.querySelector<SVGGraphicsElement>('#xpLayer');
  if (lay) {
    const p = Math.min(1, l.value / ((v.zone[0] + v.zone[1]) / 2));
    const top = Number(lay.getAttribute('data-top'));
    const full = Number(lay.getAttribute('data-full'));
    lay.setAttribute('y', (top - full * p).toFixed(1));
    lay.setAttribute('height', (full * p).toFixed(1));
    const st = root.querySelector<SVGPathElement>('#xpStream');
    if (st) st.setAttribute('d', streamD(Number(st.getAttribute('data-sx')), Number(st.getAttribute('data-sy')), Number(st.getAttribute('data-ex')), top - full * p));
  }
  const mark = root.querySelector<SVGPathElement>('#xpMark');
  if (mark && v.kind === 'fill') {
    const tgt = (v.zone[0] + v.zone[1]) / 2 / v.max;
    const top = Number(mark.getAttribute('data-top') ?? 172);
    const full = Number(mark.getAttribute('data-full') ?? 140);
    const y = top - tgt * full;
    mark.setAttribute('d', `M${mark.getAttribute('data-x0') ?? 144} ${y.toFixed(1)}H${mark.getAttribute('data-x1') ?? 256}`);
  }
  const foam = root.querySelector<SVGGraphicsElement>('#xpFoam');
  if (foam) { const h = Math.min(30, frac * 30); foam.setAttribute('y', (172 - 60 - h).toFixed(1)); foam.setAttribute('height', h.toFixed(1)); }
  const liq2 = root.querySelector<SVGGraphicsElement>('#xpLiq2');
  if (liq2) { const h = Math.min(60, frac * 60); liq2.setAttribute('y', (172 - 70 - h).toFixed(1)); liq2.setAttribute('height', h.toFixed(1)); }
  const sg = root.querySelector<SVGGraphicsElement>('#xpSteamG');
  if (sg) sg.setAttribute('opacity', l.brewStarted ? '1' : '0');
}

const num = (v: number, target: number): string => (target < 5 ? f1(v) : String(Math.round(v)));
export const readoutFill = (value: number, unit: string, target: number) => `${num(value, target)} ${unit} · нужно ${num(target, target)}`;
export const readoutTime = (t: number, target: number) => `${f1(t)} с · нужно ${f1(target)}`;
export const readoutBrew = (min: number, show: { temp: number; minutes: number } | null) =>
  `${f1(min)} мин` + (show ? ` · рецепт: ${show.temp}°, ${show.minutes} мин` : '');
