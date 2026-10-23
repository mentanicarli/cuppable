/**
 * Панели «станций» нового ядра: налив, таймер «держите», заварка.
 * HTML-панель в стиле игры с живой SVG-иллюстрацией; логика — в src/game/stations.
 */
import { BREW_TEMPS } from '../game/stations/brew';
import { panelArt, streamD } from './panelArt';

export type PanelKind = 'fill' | 'timed' | 'brew' | 'carafe';
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
  /** окно заварки колбы (31-8Б): фаза и порции */
  carafe?: { phase: 'size' | 'coffee' | 'water' | 'brewing'; sizes: { size: string; label: string; disabled: boolean }[]; doneLabel: string; holdLabel: string };
}

/** Что рисуется заново каждый кадр. */
export interface PanelLive {
  value: number;
  readout: string;
  holding: boolean;
  brewStarted?: boolean;
  /** уровень кофе в колбе 0..1 (окна «drip» и «carafe») */
  level?: number;
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
  } else if (v.kind === 'carafe' && v.carafe) {
    const c = v.carafe;
    if (c.phase === 'size') {
      const sizes = c.sizes.map((s) => `<button type="button" class="xpTemp" data-xsize="${s.size}"${s.disabled ? ' disabled' : ''}>${s.label}</button>`).join('');
      controls = `<div class="xpTemps">${sizes}</div>
<div class="xpRead" id="xpRead"></div>`;
    } else if (c.phase === 'brewing') {
      controls = `<div class="xpBar"><i class="fill" id="xpFill"></i></div>
<div class="xpRead" id="xpRead"></div>`;
    } else {
      controls = `<div class="xpBar"><i class="zone" style="left:${lo}%;width:${Math.max(2, hi - lo)}%"></i><i class="fill" id="xpFill"></i></div>
<div class="xpRead" id="xpRead"></div>
<div class="xpBtns four"><button type="button" class="xpHold" data-xhold>${c.holdLabel}</button><button type="button" class="xpDump" data-xdump>Вылить</button><button type="button" class="xpDone" data-xdone>${c.doneLabel}</button><button type="button" class="xpDump" data-xback>Назад</button></div>`;
    }
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
  const car = root.querySelector<SVGGraphicsElement>('#xpCar');
  if (car && l.level !== undefined) {
    const top = Number(car.getAttribute('data-top'));
    const full = Number(car.getAttribute('data-full'));
    const h = Math.min(1, Math.max(0, l.level)) * full;
    car.setAttribute('y', (top - h).toFixed(1));
    car.setAttribute('height', h.toFixed(1));
  }
  const liq = root.querySelector<SVGGraphicsElement>('#xpLiq');
  if (liq) {
    /* верх (дно сосуда) и полная высота налива задаёт иллюстрация: у каждого предмета бара свои */
    const top = Number(liq.getAttribute('data-top') ?? 172);
    const full = Number(liq.getAttribute('data-full') ?? 140);
    const start = Number(liq.getAttribute('data-start') ?? 0);
    const h = Math.min(full, (start + (1 - start) * frac) * full);
    liq.setAttribute('y', (top - h).toFixed(1));
    liq.setAttribute('height', h.toFixed(1));
  }
  /* «Взбить матчу»: жидкость насыщается, пена появляется по мере взбивания (доля времени цели) */
  /* общий прогресс окна: доля налива для «налить», доля времени цели для «держать» */
  const prog = v.kind === 'fill' ? frac : Math.min(1, l.value / ((v.zone[0] + v.zone[1]) / 2));
  root.querySelectorAll<SVGGraphicsElement>('[data-at]').forEach((e) => e.setAttribute('opacity', prog >= Number(e.getAttribute('data-at')) ? '1' : '0'));
  root.querySelectorAll<SVGGraphicsElement>('[data-fade]').forEach((e) => e.setAttribute('opacity', (1 - 0.85 * prog).toFixed(2)));
  root.querySelectorAll<SVGGraphicsElement>('[data-grow]').forEach((e) => {
    const ry = Number(e.getAttribute('data-ry')) * prog;
    e.setAttribute('ry', ry.toFixed(1));
    e.setAttribute('cy', (Number(e.getAttribute('data-base')) - ry * 0.55).toFixed(1));
  });
  const mat = root.querySelector<SVGGraphicsElement>('#xpMat');
  if (mat) {
    const p = Math.min(1, l.value / ((v.zone[0] + v.zone[1]) / 2));
    mat.setAttribute('fill-opacity', (0.35 + 0.65 * p).toFixed(2));
  }
  /* «Налить слоями»: верхний слой растёт за время цели, нижние налиты заранее; ложка поднимается с поверхностью, источник наклоняется, струя кончается на лопатке */
  const lay = root.querySelector<SVGGraphicsElement>('#xpLayer');
  if (lay) {
    const p = Math.min(1, l.value / ((v.zone[0] + v.zone[1]) / 2));
    const top = Number(lay.getAttribute('data-top'));
    const full = Number(lay.getAttribute('data-full'));
    lay.setAttribute('y', (top - full * p).toFixed(1));
    lay.setAttribute('height', (full * p).toFixed(1));
    const spoon = root.querySelector<SVGGraphicsElement>('#xpSpoon');
    if (spoon) spoon.setAttribute('transform', `translate(0 ${(-full * p).toFixed(1)})`);
    const src = root.querySelector<SVGGraphicsElement>('#xpSrc');
    if (src) {
      const a = Number(src.getAttribute('data-a0')) + (Number(src.getAttribute('data-a1')) - Number(src.getAttribute('data-a0'))) * p;
      src.setAttribute('transform', `rotate(${a.toFixed(1)} ${src.getAttribute('data-cx')} ${src.getAttribute('data-cy')})`);
    }
    const sl = root.querySelector<SVGGraphicsElement>('#xpSrcLiq');
    if (sl) sl.style.transform = `scale(${(1 - 0.8 * p).toFixed(2)})`;
    const st = root.querySelector<SVGPathElement>('#xpStream');
    if (st) st.setAttribute('d', streamD(Number(st.getAttribute('data-sx')), Number(st.getAttribute('data-sy')), Number(st.getAttribute('data-ex')), top - full * p - 2));
  }
  const mark = root.querySelector<SVGPathElement>('#xpMark');
  if (mark && v.kind === 'fill') {
    const tgt = (v.zone[0] + v.zone[1]) / 2 / v.max;
    const top = Number(mark.getAttribute('data-top') ?? 172);
    const full = Number(mark.getAttribute('data-full') ?? 140);
    const y = top - tgt * full;
    mark.setAttribute('d', `M${mark.getAttribute('data-x0') ?? 144} ${y.toFixed(1)}H${mark.getAttribute('data-x1') ?? 256}`);
  }
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
