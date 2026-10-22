import { describe, expect, test } from 'vitest';
import PARTS from '../src/assets/art/bar-parts.json';
import PAL from '../art-src/palette.json';
import PITB from '../art-src/bar/pit-back.svg?raw';
import PITF from '../art-src/bar/pit-front.svg?raw';
import MILK from '../art-src/bar/milk.svg?raw';
import SHELF from '../art-src/bar/syrup-shelf.svg?raw';
import SIGN from '../art-src/bar/sign.svg?raw';
import BOARD from '../art-src/bar/cork-board.svg?raw';
import PLANT from '../art-src/bar/plant-shelf.svg?raw';
import BAR from '../src/render/world/bar.ts?raw';
import LEG06 from '../src/legacy/06-bar.js?raw';
import WALL from '../art-src/bar/wall.svg?raw';
import COUNTER_TOP from '../art-src/bar/counter-top.svg?raw';
import NOSE from '../art-src/bar/counter-nose.svg?raw';
import { COUNTER, PLANK_JOINTS, PLANK_PERIOD, SECTION_WIDTH, SECTION_X, STRIPE_OFFSET, STRIPE_STEP, STRIPE_W, WALL_H, counterTopSvg, stripeXs, wallSvg, worldStripeXs, type Fmt, type SectionKey } from '../src/game/backdrop';

/* Блок 29-3: питчер (форма, непрозрачность, уровень овалом и шкалой), полка и бутылки сиропов, вывеска, доска, растение с кружками. Тесты разбирают числа формы и состав собранных частей. */
type Box = { x: number; y: number; w: number; h: number };
const parts = PARTS as unknown as Record<string, { svg: string; box: Box; texts: { t: string; x: number; y: number }[] }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const vb = (s: string): Box => {
  const m = /viewBox="(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)"/.exec(s);
  if (!m) throw new Error('нет viewBox');
  return { x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string) };
};
const zonePos = (name: string): [number, number] => {
  const m = new RegExp(`${name}: \\[(\\d+), (\\d+)\\]`).exec(LEG06);
  if (!m) throw new Error('нет ZONE_POS ' + name);
  return [+(m[1] as string), +(m[2] as string)];
};
const col = (t: string): string => (PAL.colors as Record<string, string>)[t] as string;

describe('29-3: питчер', () => {
  const BODY = 'M-28 -80C-29 -50 -35 -30 -33 -12Q-33 -2 -22 -2H22Q33 -2 33 -12C35 -30 29 -50 28 -80Z';
  test('корпус сужается кверху, у дна брюшко: ширина у дна / у обода ≥ 1,12; донышко скруглённое; высота 78', () => {
    expect(PITF).toContain(`<path d="${BODY}"`);
    const rim = 28;
    const belly = 33;
    expect(belly / rim).toBeGreaterThanOrEqual(1.12);
    expect(PITF).toContain('Q-33 -2 -22 -2H22Q33 -2 33 -12'); /* скруглённые углы дна */
    expect(-2 - -80).toBe(78);
    expect((2 * belly) / 46).toBeLessThanOrEqual(1.5); /* ширина по плану 46 × 1,5 */
  });
  test('носик: плавная выемка слева, выступ за корпус 8–10 px, кончик закруглён (угловые дуги ≥ 3 px), верх вровень с ободом (y −80)', () => {
    const m = /<path d="M-28 -80H(-?\d+)Q(-?\d+) -80 (-?\d+) (-?\d+)Q(-?\d+) (-?\d+) (-?\d+) (-?\d+)Q(-?\d+) (-?\d+) (-?\d+) (-?\d+)L(-?\d+) (-?\d+)Z"/.exec(PITF);
    expect(m).not.toBeNull();
    const [, h, qx, tipX, tipY] = m as RegExpExecArray;
    expect(-28 - +(tipX as string)).toBeGreaterThanOrEqual(8);
    expect(-28 - +(tipX as string)).toBeLessThanOrEqual(10);
    expect(Math.abs(+(h as string) - +(qx as string))).toBeGreaterThanOrEqual(3); /* первая дуга кончика */
    expect(Math.abs(+(tipY as string) - -80)).toBeGreaterThanOrEqual(3);
  });
  test('ручка: плоская полоса 5,5 px (контур L), горизонтальный выступ вправо ≤ 18 px, ножка наискось возвращается к корпусу на 72 % высоты', () => {
    const m = /<path d="M28 -77\.75H([\d.]+)L([\d.]+) ([\d.-]+)L([\d.]+) ([\d.-]+)L([\d.]+) -72\.25H28Z" fill="\{\{STEEL\}\}" stroke-width="\{\{L\}\}"/.exec(PITF);
    expect(m).not.toBeNull();
    const [, rx, cx, cy, dx, dy] = m as RegExpExecArray;
    expect(-72.25 - -77.75).toBeCloseTo(5.5, 5);
    expect(+(rx as string) - 28).toBeLessThanOrEqual(18);
    const legY = (+(cy as string) + +(dy as string)) / 2;
    expect((legY - -80) / 78).toBeGreaterThan(0.7);
    expect((legY - -80) / 78).toBeLessThan(0.74);
    expect(+(cx as string)).toBeLessThan(+(rx as string)); /* ножка уходит наискось к корпусу */
    expect(+(dx as string)).toBeLessThan(+(cx as string));
  });
  test('сталь: светлый блик в левой трети, тёмная полоса правее центра, тёмная кайма у обода (контур M), цвета кофемашины (STEEL, STEEL_SH, STEEL_HI)', () => {
    expect(PITF).toContain('<path d="M-25 -70H-21V-18Q-23 -14 -25 -16Z" fill="{{HILITE}}"'); /* x −25…−21: левая треть −28…−9 */
    expect(PITF).toContain('<path d="M6 -72H12V-16Q9 -12 6 -14Z" fill="{{STEEL_SH}}"'); /* правее центра */
    expect(PITF).toContain('<ellipse cx="0" cy="-80" rx="28" ry="5" fill="{{STEEL_HI}}" stroke-width="{{M}}"/>');
    for (const t of ['STEEL', 'STEEL_SH', 'STEEL_HI']) expect(PITF).toContain(`{{${t}}}`);
  });
  test('корпус и ручка непрозрачные; в частях питчера нет заливок цвета жидкости (PAPER, CHOC, DARK, BAKE_SH): уровень рисует только bar.ts (овал и шкала)', () => {
    const svg = svgOf('pitFront') + svgOf('pitBack');
    for (const t of ['PAPER', 'CHOC', 'BAKE_SH']) expect(svg.includes(col(t))).toBe(false); /* DARK — только тёмная выемка шкалы */
    const body = new RegExp(`<path d="${BODY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" fill="#CFC7BA" stroke-width="3"/>`);
    expect(body.test(svgOf('pitFront'))).toBe(true); /* заливка STEEL без прозрачности */
    expect(PITF.includes('fill-opacity') && /\{\{STEEL\}\}"[^>]*fill-opacity/.test(PITF)).toBe(false);
    expect(PITB.includes('<path d="M-34')).toBe(false); /* прозрачного заднего корпуса, через который было видно молоко, больше нет */
  });
  test('шкала на корпусе слева от центра: выемка 5 px (x −12…−7, y −66…−14) с рисками слева; цветную полоску 3 px внутри рисует PitLevel; овал rx 24 × ry 3,8 у обода', () => {
    expect(PITF).toContain('<rect x="-12" y="-66" width="5" height="52" rx="2.5" fill="{{DARK}}"');
    expect(PITF).toContain('M-17 -66H-13M-17 -53H-13M-17 -40H-13M-17 -27H-13M-17 -14H-13');
    expect(BAR).toContain('this.bar.rect(-11, -15 - fr * 50, 3, fr * 50).fill(col)');
    expect(BAR).toContain('this.oval.ellipse(0, -79.6 + dy, 24, 3.8).fill(col)');
    expect(BAR).toContain('this.mask.ellipse(0, -79.6, 24, 3.8)');
    expect(-11).toBeGreaterThan(-12);
    expect(-8).toBeLessThan(-7); /* полоска внутри выемки */
  });
  test('питчер раф под группой использует те же части (pitBack, pitFront) и тот же PitLevel; старого Graphics-питчера и маски молока нет', () => {
    expect(BAR).toContain("rel('pitBack')");
    expect(BAR).toContain("rel('pitFront')");
    expect(BAR).toContain('pu.addChild(this.pitUnderLvl.root)');
    expect(BAR).toContain('this.pitUnderLvl.set(h / 74,');
    expect(BAR).toContain('this.pitLvl.set(f.pitH / 74,');
    expect(BAR.includes('pitMilk')).toBe(false);
    expect(BAR.includes('pitCoffee')).toBe(false);
    expect(BAR.includes('pmask')).toBe(false);
    expect(vb(PITB)).toEqual({ x: 880, y: 420, w: 130, h: 110 });
    expect(vb(PITF)).toEqual({ x: 880, y: 420, w: 130, h: 110 });
    expect(count(svgOf('pitFront'), '<g transform=')).toBe(1);
    expect(count(svgOf('pitBack'), '<g transform=')).toBe(1);
  });
});

describe('29-3: полка и бутылки сиропов', () => {
  test('доска 862–1074 × 296–308, тень снизу, два кронштейна; из static полка и старая заливка gWoodFront убраны', () => {
    expect(SHELF).toContain('<rect x="862" y="296" width="212" height="12" rx="4" fill="{{WOOD}}" stroke-width="{{M}}"/>');
    expect(SHELF).toContain('M874 308V326L890 308Z');
    expect(SHELF).toContain('M1062 308V326L1046 308Z');
    expect(SHELF).toContain('<rect x="866" y="308" width="204" height="3" fill="{{SHADOW}}"');
    const st = svgOf('static');
    expect(st.includes('translate(870 296)')).toBe(false);
    expect(st.includes('gWoodFront')).toBe(false);
  });
  test('три бутылки 44 × 120: центры x 902 / 968 / 1034 = центры зон syr1…syr3 (ZONE_POS), этикетка 36 × 32 с центром y 250 под подписями static, жидкость MUSTARD / BAKE_SH / CHOC, тёмное горлышко, насос', () => {
    const xs = [...SHELF.matchAll(/<g transform="translate\((\d+) 296\)">/g)].map((m) => +(m[1] as string));
    expect(xs).toEqual([zonePos('syr1')[0], zonePos('syr2')[0], zonePos('syr3')[0]]);
    expect(xs).toEqual([902, 968, 1034]);
    expect(296 - 46).toBe(zonePos('syr1')[1]); /* центр этикетки y 250 = y зоны */
    expect(count(SHELF, '<rect x="-18" y="-62" width="36" height="32" rx="5"')).toBe(3);
    expect(count(SHELF, 'M-22 -70Q-22 -84 -9 -86H9Q22 -84 22 -70V-8Q22 0 14 0H-14Q-22 0 -22 -8Z')).toBe(3); /* корпус 44 px */
    expect(count(SHELF, 'fill="{{DARK}}"')).toBe(3);
    expect(count(SHELF, 'M-9 -120H12Q16 -120 16 -116V-112H-9Z')).toBe(3); /* головка насоса, верх y −120 */
    const liquids = [...SHELF.matchAll(/V-8Q18 -4 12 -4H-12Q-18 -4 -18 -8Z" fill="\{\{(\w+)\}\}"/g)].map((m) => m[1]);
    expect(liquids).toEqual(['MUSTARD', 'BAKE_SH', 'CHOC']);
    expect(count(SHELF, 'stroke="{{HILITE}}" stroke-opacity=".7"')).toBe(3); /* блик слева */
    /* слова сиропов ушли: Pixi-текстов подписей в static не осталось (блок 29-4, шаг 0) */
    const words = (parts.static as { texts: { t: string }[] }).texts.map((t) => t.t);
    for (const w of ['ваниль', 'карамель', 'миндаль']) expect(words.includes(w)).toBe(false);
  });
  test('на табличках ровно три иконки (ваниль — стручок и цветок, карамель — капля, миндаль — орех со швом), высота каждой 14–16 px, центр в центре таблички (y −46), внутри таблички 36 × 32, контур D', () => {
    const icons = [...SHELF.matchAll(/<g data-icon="(\w+)">([\s\S]*?)<\/g>/g)];
    expect(icons.map((m) => m[1])).toEqual(['vanilla', 'caramel', 'almond']);
    expect(count(SHELF, '<g data-icon=')).toBe(3);
    expect(count(svgOf('syrupShelf'), '<g data-icon=')).toBe(3);
    for (const m of icons) {
      const body = m[2] as string;
      const ys: number[] = [];
      const xs: number[] = [];
      for (const d of body.matchAll(/ d="([^"]+)"/g)) {
        const nums = [...(d[1] as string).matchAll(/-?\d+(?:\.\d+)?/g)].map((n) => +n[0]);
        for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i] as number); ys.push(nums[i + 1] as number); }
      }
      for (const c of body.matchAll(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)" r="([\d.]+)"/g)) {
        const [cx, cy, r] = [+(c[1] as string), +(c[2] as string), +(c[3] as string)];
        xs.push(cx - r, cx + r);
        ys.push(cy - r, cy + r);
      }
      const h = Math.max(...ys) - Math.min(...ys);
      expect(h, m[1]).toBeGreaterThanOrEqual(14);
      expect(h, m[1]).toBeLessThanOrEqual(16);
      expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(-46, 0);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(-18 + 3); /* внутри таблички с полем */
      expect(Math.max(...xs)).toBeLessThanOrEqual(18 - 3);
      expect(body).toContain('stroke-width="{{D}}"');
      for (const bad of ['stroke-width="{{L}}"', 'stroke-width="{{M}}"']) expect(body.includes(bad)).toBe(false);
    }
  });
  test('край полки у холодильника молока в части milk — те же фигуры и заливка, что в syrupShelf (нет шва)', () => {
    for (const piece of ['<rect x="862" y="296" width="212" height="12" rx="4" fill="{{WOOD}}" stroke-width="{{M}}"/>', '<path d="M868 299H1068" fill="none" stroke="{{WOOD_HI}}" stroke-width="{{D}}"/>', '<rect x="866" y="308" width="204" height="3" fill="{{SHADOW}}" fill-opacity=".18" stroke="none"/>', '<path d="M1062 308V326L1046 308Z" fill="{{WOOD_SH}}" stroke-width="{{M}}"/>']) {
      expect(SHELF).toContain(piece);
      expect(MILK).toContain(piece);
    }
  });
  test('число групп в собранных частях точное: syrupShelf — одна внешняя и три бутылки, без остатков', () => {
    expect(count(svgOf('syrupShelf'), '<g stroke=')).toBe(1);
    expect(count(svgOf('syrupShelf'), '<g transform=')).toBe(3);
    expect(vb(SHELF)).toEqual({ x: 854, y: 170, w: 228, h: 162 });
  });
});

describe('29-3: вывеска', () => {
  test('рама 924–1196 × 78–166 (L), подвесы до y 44, тёмная плашка внутри рамы; вордмарк (контуры 12 / 9 / 7) — отдельная часть без изменений; подпись остаётся Pixi-текстом', () => {
    expect(SIGN).toContain('<rect x="924" y="78" width="272" height="88" rx="16" fill="{{WOOD}}" stroke-width="{{L}}"/>');
    expect(SIGN).toContain('<rect x="932" y="86" width="256" height="72" rx="11" fill="{{DARK}}" stroke-width="{{M}}"/>');
    expect(SIGN).toContain('<rect x="974" y="44" width="4" height="36"');
    expect(SIGN).toContain('<rect x="1142" y="44" width="4" height="36"');
    expect(vb(SIGN).x).toBeLessThanOrEqual(924);
    expect(vb(SIGN).x + vb(SIGN).w).toBeGreaterThanOrEqual(1196);
    expect(vb(SIGN).y).toBeLessThanOrEqual(44);
    expect(vb(SIGN).y + vb(SIGN).h).toBeGreaterThanOrEqual(166);
    const wm = svgOf('wordmark');
    for (const w of ['stroke-width="12"', 'stroke-width="9"', 'stroke-width="7"']) expect(wm.includes(w)).toBe(true);
    expect(wm).toContain('M53,50.7 A30,30 0 1 0 53,89.3');
    expect(wm).toContain('translate(1060 128)');
    expect(count(svgOf('wordmark'), '<g transform="translate(-102 -40)')).toBe(1);
    expect(svgOf('static').includes('translate(1060 128)')).toBe(false);
    expect((parts.static as { texts: { t: string }[] }).texts.some((t) => t.t === 'Кофе между парами')).toBe(true);
  });
});

describe('29-3: пробковая доска', () => {
  test('рама 196 × 132 (x 236–432, y 84–216), плоская пробка TOP, четыре записки разных цветов с кнопками; нет старой группы в static', () => {
    expect(BOARD).toContain('<rect x="236" y="84" width="196" height="132" rx="10" fill="{{WOOD}}" stroke-width="{{L}}"/>');
    expect(BOARD).toContain('<rect x="244" y="92" width="180" height="116" rx="6" fill="{{TOP}}"');
    const notes = [...BOARD.matchAll(/<rect x="\d+" y="\d+" width="\d+" height="\d+" fill="\{\{(\w+)\}\}" transform="rotate/g)].map((m) => m[1]);
    expect(notes).toEqual(['PAPER', 'GLASS', 'MUSTARD', 'PINK']);
    expect(new Set(notes).size).toBe(4);
    expect(count(BOARD, '<circle cx=')).toBe(4); /* кнопки */
    expect(svgOf('static').includes('translate(236 84)')).toBe(false);
    expect(vb(BOARD).x).toBeLessThanOrEqual(236);
    expect(vb(BOARD).x + vb(BOARD).w).toBeGreaterThanOrEqual(432);
  });
});

describe('29-3: растение и кружки на полке справа', () => {
  test('полка 1112–1244 × 330–342, горшок с тремя листьями и две кружки внутри границ x 1112–1244, y 252–342; нет старой группы в static', () => {
    expect(PLANT).toContain('<rect x="1112" y="330" width="132" height="12" rx="4" fill="{{WOOD}}"');
    expect(count(PLANT, '<ellipse cx="11')).toBeGreaterThanOrEqual(3);
    expect(PLANT).toContain('<path d="M1134 330L1130 298H1160L1156 330Z" fill="{{TERRA}}"'); /* горшок */
    expect(count(PLANT, 'rotate(')).toBe(3); /* три листа */
    expect(PLANT).toContain('<path d="M1190 330L1188 308H1212L1210 330Z" fill="{{PAPER}}"'); /* кружка 1 */
    expect(PLANT).toContain('<path d="M1222 330L1221 314H1237L1236 330Z" fill="{{MUSTARD}}"'); /* кружка 2 */
    const xs = [...PLANT.matchAll(/[ML](\d{4}) /g)].map((m) => +(m[1] as string));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(1112);
    expect(Math.max(...xs)).toBeLessThanOrEqual(1244);
    expect(259 - 5).toBeGreaterThanOrEqual(252); /* верх листа */
    expect(svgOf('static').includes('translate(1112 330)')).toBe(false);
  });
});

describe('29-3: части без токенов вне палитры', () => {
  test('все цвета новых и перерисованных частей из palette.json (вордмарк бренда и static не в счёте)', () => {
    const allowed = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
    for (const id of ['pitBack', 'pitFront', 'syrupShelf', 'sign', 'corkBoard', 'plantShelf', 'milk']) {
      const svg = svgOf(id);
      for (const m of svg.matchAll(/#[0-9a-fA-F]{6}/g)) expect(allowed.has(m[0].toLowerCase()), `${id} ${m[0]}`).toBe(true);
      expect(svg.includes('url(#')).toBe(false);
      expect(svg.includes('linearGradient')).toBe(false);
    }
  });
});

describe('29-4: стена и столешница одной полосой на три секции', () => {
  const tok: Fmt = { col: (n) => '{{' + n + '}}', w: (n) => '{{' + n + '}}' };
  const body = (svg: string): string => svg.slice(svg.indexOf('-->') + 3, svg.lastIndexOf('</svg>')).trim();
  const SECS: SectionKey[] = ['L', 'C', 'R'];
  test('шаг полос 130, ширина 26, десять полос в каждой секции; у центра первая на x 60, у боковых смещение 40 и 80', () => {
    expect(STRIPE_STEP).toBe(130);
    expect(STRIPE_W).toBe(26);
    expect(STRIPE_OFFSET).toEqual({ L: 40, C: 60, R: 80 });
    for (const sec of SECS) {
      const xs = stripeXs(sec);
      expect(xs).toHaveLength(10);
      for (let i = 1; i < xs.length; i++) expect((xs[i] as number) - (xs[i - 1] as number)).toBe(STRIPE_STEP);
      expect(xs[0]).toBe(STRIPE_OFFSET[sec]);
      expect((xs[xs.length - 1] as number) + STRIPE_W).toBeLessThanOrEqual(SECTION_WIDTH); /* ни одна полоса не пересекает край секции */
    }
  });
  test('фаза на стыках: в мировых координатах от левой до правой секции шаг между всеми полосами ровно 130 (смещение фазы на стыке L/C и C/R = 0 px)', () => {
    const world = [...worldStripeXs('L'), ...worldStripeXs('C'), ...worldStripeXs('R')];
    expect(world).toHaveLength(30);
    for (let i = 1; i < world.length; i++) expect((world[i] as number) - (world[i - 1] as number)).toBe(STRIPE_STEP);
    expect(worldStripeXs('C')[0]).toBe(60);
    expect(worldStripeXs('C')[9]).toBe(1230);
    expect(worldStripeXs('L')[9]).toBe(-70);
    expect(worldStripeXs('R')[0]).toBe(1360);
    expect(SECTION_X).toEqual({ L: -1280, C: 0, R: 1280 });
  });
  test('стыки досок: период 640 делит 1280, в мировых координатах все стыки каждого ряда через 640 по трём секциям, у краёв секции стыков нет (≥ 140 px)', () => {
    expect(SECTION_WIDTH % PLANK_PERIOD).toBe(0);
    for (const row of [PLANK_JOINTS.row1, PLANK_JOINTS.row2]) {
      const world = SECS.flatMap((sec) => row.map((x) => x + SECTION_X[sec]));
      for (let i = 1; i < world.length; i++) expect((world[i] as number) - (world[i - 1] as number)).toBe(PLANK_PERIOD);
      for (const x of row) {
        expect(x).toBeGreaterThanOrEqual(140);
        expect(x).toBeLessThanOrEqual(SECTION_WIDTH - 140);
      }
    }
  });
  test('столешница: бортик y 466–480, две доски (480–543, 543–612) с контуром M между ними; низ под носом плиты (y 607–628), нос не двигался', () => {
    expect(COUNTER).toEqual({ rimTop: 466, rimBottom: 480, seam: 543, bottom: 612 });
    expect(COUNTER.bottom).toBeGreaterThan(607);
    expect(COUNTER.bottom).toBeLessThanOrEqual(628);
    expect(NOSE).toMatch(/<rect x="-6" y="607" width="1292"/);
    const ct = counterTopSvg(tok);
    expect(ct).toContain('<path d="M-6 543H1286" fill="none" stroke-width="{{M}}"/>');
    expect(ct).toContain('fill="{{TOP}}"');
    expect(ct).toContain('fill="{{WOOD_HI}}"');
    expect(WALL_H).toBe(480);
  });
  test('файлы art-src (wall.svg, counter-top.svg) — ровно результат общей функции для центра; боковые заглушки в bar.ts строятся той же функцией', () => {
    expect(body(WALL)).toBe(wallSvg('C', tok));
    expect(body(COUNTER_TOP)).toBe(counterTopSvg(tok));
    expect(BAR).toContain('wallSvg(id, PAL_FMT) + counterTopSvg(PAL_FMT)');
    expect(BAR).toContain('(P.counterFront as Part).svg + (P.counterNose as Part).svg');
    const L = wallSvg('L', tok);
    const R = wallSvg('R', tok);
    expect(count(L, '<rect x="')).toBe(11);
    expect(count(R, '<rect x="')).toBe(11);
    expect(L).toContain('<rect x="40" y="0" width="26" height="480"/>');
    expect(R).toContain('<rect x="80" y="0" width="26" height="480"/>');
  });
  test('плоские заливки: в собранных wall и counterTop нет градиентов и url(#), толщины только 3,5 / 3 / 2; в bar-parts.json нигде не осталось gWall, gWoodTop, gWoodFront', () => {
    for (const id of ['wall', 'counterTop']) {
      const svg = svgOf(id);
      expect(svg.includes('url(#') || svg.includes('linearGradient')).toBe(false);
      for (const m of svg.matchAll(/stroke-width="([\d.]+)"/g)) expect(['3.5', '3', '2']).toContain(m[1]);
      const allowed = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
      for (const m of svg.matchAll(/#[0-9a-fA-F]{6}/g)) expect(allowed.has(m[0].toLowerCase())).toBe(true);
    }
    for (const id of Object.keys(parts)) for (const g of ['gWall', 'gWoodTop', 'gWoodFront']) expect((parts[id] as { svg: string }).svg.includes(g), id + ' ' + g).toBe(false);
  });
  test('число групп без остатков старых: в wall одна группа полос и один фон, в counterTop одна внешняя группа; static пустой (только подпись вывески Pixi-текстом)', () => {
    expect(count(svgOf('wall'), '<g ')).toBe(1);
    expect(count(svgOf('wall'), '<rect')).toBe(11);
    expect(count(svgOf('counterTop'), '<g stroke=')).toBe(1);
    expect(count(svgOf('counterTop'), '<rect')).toBe(3);
    const st = parts.static as { svg: string; box: Box; texts: { t: string }[] };
    expect(st.svg).toBe('');
    expect(st.box.w * st.box.h).toBeLessThanOrEqual(4);
    expect(st.texts.map((t) => t.t)).toEqual(['Кофе между парами']);
  });
});
