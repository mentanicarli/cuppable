import { describe, expect, test } from 'vitest';
import PAL from '../art-src/palette.json';
import CENTER from '../src/assets/art/bar-parts.json';
import { sizesOf, specOf } from '../src/game/drinkModel';
import { layerView } from '../src/game/layers';
import { drinkPx } from '../src/render/world/drinkModel';
import { paletteOf } from '../src/game/recipes';
import { LAYER_GLASS, barObject, fillCounts, groupOf, jarFor, layerSourceRect, panelArt, sourceOf, whiskGeom } from '../src/ui/panelArt';

/* 31-2, шаг 3: окна станций нового ядра рисуются теми же предметами, что стоят на баре. Тест падает, если окно потеряло главные цвета
   предмета бара, использует цвет вне палитры или толщину вне L/M/D. */
const TASKS = ['whisk', 'brew', 'juice', 'tonic', 'powder', 'boba', 'topping', 'blend', 'shake', 'foam', 'whip', 'layer'] as const;
const colors = new Set(Object.values(PAL.colors).map((c) => c.toLowerCase()));
const TOKENS = [PAL.stroke.L, PAL.stroke.M, PAL.stroke.D];
/** Заливки предмета, которые окно заменяет цветом напитка (налив вместо встроенного чая, порошок банки). */
const REPLACED: Record<string, string[]> = { brew: ['TERRA', 'BAKE'], powder: ['CHOC'] };
const col = (task: string): string => (task === 'powder' ? PAL.colors.CHOC : PAL.colors.MUSTARD);
const art = (task: string, drink?: string): string => panelArt({ task, col: col(task), col2: PAL.colors.PAPER, drink: task === 'layer' ? 'orange_bumble' : task === 'topping' ? 'cappuccino_pumpkin' : task === 'whip' ? 'latte_coconut' : drink });
/** цвета слоёв — данные напитка (спецификация), не палитра */
const espressoSpec = specOf('espresso', sizesOf('espresso', false)[0] as never, false);
const specColors = new Set([...layerView('orange_bumble', 1).map((l) => l.color), ...specOf('latte_coconut', sizesOf('latte_coconut', false)[0] as never, false).liquid.map((l) => l.color), ...espressoSpec.liquid.map((l) => l.color), espressoSpec.top.color].map((c) => c.toLowerCase()));
/* демитас модели напитка: его цвета (кофе, крема, керамика) — данные модели, а не палитры */
for (const m of drinkPx(espressoSpec, { level: 'full', s: 1.1, noSaucer: true }).all.inner.matchAll(/#[0-9a-fA-F]{6}/g)) specColors.add(m[0].toLowerCase());

/** Строка без вложенных групп с масштабом (data-k): толщины внутри них проверяются отдельно (значение × k). */
function split(svg: string): { flat: string; scaled: { k: number; body: string }[] } {
  const scaled: { k: number; body: string }[] = [];
  let flat = svg;
  for (;;) {
    const at = flat.indexOf('<g data-k="');
    if (at < 0) break;
    const el = groupOf(flat, '<g data-k="' + flat.slice(at + 11, flat.indexOf('"', at + 11)) + '"');
    const i = flat.indexOf(el, 0);
    scaled.push({ k: Number(/^<g data-k="([\d.]+)"/.exec(el)?.[1]), body: el });
    flat = flat.slice(0, i) + flat.slice(i + el.length);
  }
  return { flat, scaled };
}

describe('окна станций: предметы бара', () => {
  for (const task of TASKS) {
    test(`${task}: цвета только из палитры, толщины только L/M/D`, () => {
      const svg = art(task, 'cocoa');
      for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)) expect(colors.has((m[1] as string).toLowerCase()) || specColors.has((m[1] as string).toLowerCase()), `цвет ${m[1]}`).toBe(true);
      /* демитас — модель напитка со своими контурами (ручка толще токенов): у него проверяем только цвета */
      const widthSvg = svg.includes('data-vessel="shot"') ? svg.replace(groupOf(svg, 'data-vessel="shot"'), '') : svg;
      const { flat, scaled } = split(widthSvg);
      for (const m of flat.matchAll(/stroke-width="([\d.]+)"/g)) expect(TOKENS, `толщина ${m[1]}`).toContain(Number(m[1]));
      for (const g of scaled) for (const m of g.body.matchAll(/stroke-width="([\d.]+)"/g)) {
        const v = Number(m[1]) * g.k;
        expect(TOKENS.some((t) => Math.abs(t - v) < 0.08), `толщина ${m[1]} × ${g.k} = ${v.toFixed(2)}`).toBe(true);
      }
    });
    test(`${task}: окно берёт три главных цвета предмета бара`, () => {
      const src = sourceOf(task, 'cocoa');
      if (!src.length) return; /* предмет бара — бутылка (форма как у бутылок холодильника и полки сиропов), см. bottleSvg */
      const svg = art(task, 'cocoa').toUpperCase();
      for (const s of src) {
        let obj = barObject(s.part, s.marker);
        for (const name of REPLACED[task] ?? []) obj = obj.replace(new RegExp(`fill="${(PAL.colors as Record<string, string>)[name]}"`, 'gi'), '');
        const top = fillCounts(obj).slice(0, 3).map((x) => x[0]);
        expect(top.length).toBeGreaterThan(0);
        for (const c of top) expect(svg.includes(c), `${task}: цвет ${c} предмета ${s.marker}`).toBe(true);
      }
    });
  }
  test('налив: у каждого окна есть #xpLiq с data-top и data-full; у окон «залить» есть #xpMark', () => {
    for (const t of TASKS) {
      const svg = art(t);
      /* у каждого окна есть то, что растёт по прогрессу: налив (#xpLiq), слой (#xpLayer), жидкость матчи (#xpMat), шарики (data-at), топпинг (#xpTop), пена (#xpFoam), сливки (#xpCream) */
      const grows: Record<string, RegExp> = { whisk: /id="xpMat"/, layer: /id="xpLayer" data-top="[\d.]+" data-full="[\d.]+"/, boba: /data-at="1\.00"/, topping: /id="xpTop" data-grow/, foam: /id="xpFoam" data-top="[\d.]+" data-full="[\d.]+"/, whip: /id="xpCream" data-grow/ };
      expect(svg, t).toMatch(grows[t] ?? /id="xpLiq"( data-start="[\d.]+")? data-top="[\d.]+" data-full="[\d.]+"/);
    }
    for (const t of ['juice', 'tonic', 'powder', 'boba', 'topping']) expect(art(t), t).toMatch(/id="xpMark" data-top=/);
  });
  test('банка порошков выбирается по напитку', () => {
    expect(jarFor('cocoa')).toBe('jarCocoa');
    expect(jarFor('chicory_latte')).toBe('jarChicory');
    expect(jarFor('protein_milk')).toBe('jarProtein');
    expect(sourceOf('powder', 'protein_water')[0]?.marker).toContain('jarProtein');
  });
});

describe('окно «Взбить матчу» (31-3)', () => {
  const svg = panelArt({ task: 'whisk', col: paletteOf('matcha_latte').matcha, col2: PAL.colors.PAPER });
  test('порядок слоёв: чаша сзади, жидкость, венчик, чаша спереди', () => {
    const at = (k: string): number => svg.indexOf(`data-layer="${k}"`);
    expect(at('bowl-back')).toBeGreaterThan(-1);
    expect(at('bowl-back')).toBeLessThan(at('liquid'));
    expect(at('liquid')).toBeLessThan(at('whisk'));
    expect(at('whisk')).toBeLessThan(at('bowl-front'));
  });
  test('зубцы венчика ниже обода чаши не менее чем на 10 % высоты чаши, ручка над ободом', () => {
    const g = whiskGeom();
    expect(g.whiskBottom - g.rimY).toBeGreaterThanOrEqual(0.1 * g.bowlH);
    expect(g.whiskY).toBeLessThan(g.rimY);
    expect(g.whiskBottom).toBeLessThanOrEqual(g.bowlBottom + 1);
  });
  test('жидкость цвета матчи из спецификации напитка, пена растёт по прогрессу', () => {
    const m = paletteOf('matcha_latte').matcha;
    expect(m).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(svg).toContain(`id="xpMat"`);
    expect(svg).toMatch(new RegExp(`id="xpMat"[^>]*fill="${m}"`, 'i'));
    expect([...svg.matchAll(/data-at="([\d.]+)"/g)].length).toBeGreaterThanOrEqual(5);
  });
  test('те же цвета, что у предмета бара: чаша и венчик из matcha.svg', () => {
    for (const marker of ['data-item="bowl"', 'data-item="whisk"']) for (const [c] of fillCounts(barObject('matcha', marker)).slice(0, 2)) expect(svg.toUpperCase().includes(c), `${marker} ${c}`).toBe(true);
  });
});

describe('окно «Налить слоями»: источник, ложка, геометрия (31-3)', () => {
  const DRINKS_LAYER = ['matcha_bumble', 'matcha_tonic', 'orange_bumble', 'pomegranate_bumble', 'espresso_tonic'];
  const art = (drink: string): string => panelArt({ task: 'layer', col: PAL.colors.MUSTARD, col2: PAL.colors.PAPER, drink, size: '0.3', cold: true });
  test('источник не заходит на стакан больше чем на 6 px по x при прогрессе 0, 0,25, 0,5, 0,75, 1; носик над ободом в пределах 10 px от края', () => {
    for (const d of DRINKS_LAYER) for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const r = layerSourceRect(d, p);
      expect(r.x1 - LAYER_GLASS.x0, `${d} p=${p}: заход на стакан`).toBeLessThanOrEqual(6);
      expect(r.x1 - LAYER_GLASS.x0, `${d} p=${p}: носик у края`).toBeGreaterThanOrEqual(-10);
      expect(r.x0, `${d} p=${p}: левее сцены`).toBeGreaterThanOrEqual(0);
      expect(r.y0, `${d} p=${p}: выше сцены`).toBeGreaterThanOrEqual(0);
    }
  });
  test('матча: источник — группа чаши бара; эспрессо: сосуд для шота, питчера нет; ложка и верхний слой на месте', () => {
    for (const d of ['matcha_bumble', 'matcha_tonic']) {
      const s = art(d);
      expect(s).toContain('data-vessel="bowl"');
      expect(s).toContain(PAL.colors.DUSTY);
      expect(s).not.toContain('data-vessel="shot"');
    }
    for (const d of ['orange_bumble', 'pomegranate_bumble', 'espresso_tonic']) {
      const s = art(d);
      expect(s).toContain('data-vessel="shot"');
      expect(s).not.toContain('translate(940 514)'); /* питчер бара только у рафа и в окне «Пар» */
      expect(s).not.toContain('data-vessel="bowl"');
    }
    for (const d of DRINKS_LAYER) {
      const s = art(d);
      expect(s).toContain('id="xpSpoon"');
      expect(s).toContain('id="xpLayer"');
      expect(s).toContain('id="xpSrc"');
    }
  });
  test('источник ниже стакана по z (рисуется раньше), ложка и струя выше', () => {
    const s = art('matcha_bumble');
    expect(s.indexOf('id="xpSrc"')).toBeLessThan(s.indexOf('id="xpLayer"'));
    expect(s.indexOf('id="xpLayer"')).toBeLessThan(s.indexOf('id="xpSpoon"'));
    expect(s.indexOf('id="xpSpoon"')).toBeLessThan(s.indexOf('id="xpStream"'));
  });
});

describe('аудит окон (31-3): приёмник и источник по предыдущим шагам рецепта', () => {
  const win = (task: string, drink: string, cold = true): string => panelArt({ task, col: PAL.colors.MUSTARD, col2: PAL.colors.PAPER, drink, size: '0.3', cold });
  const cubes = (s: string): number => s.split('rx="4" fill="' + PAL.colors.GLASS).length - 1;
  test('лёд, насыпанный шагом «Лёд», лежит в приёмнике: сок, тоник, шарики, сливки', () => {
    for (const [t, d] of [['juice', 'orange_bumble'], ['tonic', 'espresso_tonic'], ['boba', 'boba_guava'], ['whip', 'latte_coconut']] as const) expect(cubes(win(t, d)), `${t} ${d}`).toBeGreaterThanOrEqual(5);
    expect(cubes(win('juice', 'hot_bumble', false)), 'горячий бамбл без льда').toBe(0);
  });
  test('блендер и шейкер: кувшин уже полон (data-start), лёд тает по прогрессу (data-fade); без льда кубиков нет', () => {
    expect(win('blend', 'milkshake_vanilla')).toMatch(/data-start="0\.72"/);
    expect(win('blend', 'milkshake_vanilla')).toContain('data-fade="1"');
    expect(win('shake', 'boba_guava')).toContain('data-fade="1"');
    expect(win('shake', 'protein_milk')).not.toContain('data-fade="1"');
  });
  test('шарики: стакан с чаем и льдом, шарики кастрюли появляются по прогрессу на дне; кастрюля бара — источник', () => {
    const s = win('boba', 'boba_guava');
    expect(s).toContain('data-pot="1"');
    expect([...s.matchAll(/data-at="/g)].length).toBeGreaterThanOrEqual(15);
  });
  test('пена: разрез кувшина миксера (молоко и поднимающаяся пена), а не стакан; шапка пены появляется в конце', () => {
    const s = win('foam', 'latte_coconut', false);
    expect(s).toContain('id="xpFoam"');
    expect(s).toContain('data-at="0.9"');
    expect(s).not.toContain(`d="${'M140 28H260L250 172H150Z'}"`);
  });
  test('сливки и топпинг лежат на напитке в стакане: растущие эллипсы, а не жидкость с дна', () => {
    expect(win('whip', 'latte_coconut')).toContain('id="xpCream"');
    expect(win('topping', 'cappuccino_pumpkin')).toContain('id="xpTop"');
    expect(win('topping', 'cappuccino_pumpkin')).not.toContain('id="xpLiq"');
  });
});

describe('решения владельца по аудиту окон (31-4)', () => {
  const win = (task: string, drink: string, cold = true): string => panelArt({ task, col: PAL.colors.MUSTARD, col2: PAL.colors.PAPER, drink, size: '0.3', cold });
  const rest = (s: string, marker: string): string => s.replace(groupOf(s, marker), '');
  test('протеин: приёмник — большой стакан шейкера бара; какао и цикорий остаются со стаканом', () => {
    for (const d of ['protein_milk', 'protein_water']) {
      const s = win('powder', d);
      expect(s).toContain('data-receiver="shaker"');
      const top = fillCounts(barObject('shaker', 'data-glass="tinBig"')).slice(0, 3).map((x) => x[0]);
      for (const c of top) expect(s.toUpperCase().includes(c), `${d} ${c}`).toBe(true);
      expect(s).toContain('class="xpTilt"'); /* банка-источник наклонена над шейкером */
    }
    for (const d of ['cocoa', 'chicory_latte']) expect(win('powder', d, false)).not.toContain('data-receiver="shaker"');
  });
  test('чай со смородиной: в стакане слой заварки по спецификации, сок — отдельным слоем сверху; остальные напитки с соком без заварки', () => {
    const spec = specOf('tea_currant', sizesOf('tea_currant', false)[0] as never, false);
    const s = win('juice', 'tea_currant', false);
    expect(s.toLowerCase()).toContain((spec.liquid[0] as { color: string }).color.toLowerCase());
    expect(s).toMatch(/id="xpLiq" data-top="[5-9]\d\.\d"/); /* сок льётся выше слоя заварки, а не со дна */
    expect(win('juice', 'orange_bumble')).toMatch(/id="xpLiq" data-top="172"/);
  });
  test('милкшейк банан: приёмник сока — кувшин блендера бара с молоком; в бамблах стакан', () => {
    const s = win('juice', 'milkshake_banana');
    expect(s).toContain('data-receiver="blender"');
    expect(s).toContain('data-glass="blenderJug"');
    for (const c of fillCounts(barObject('blender', 'data-item="blender"')).slice(0, 3).map((x) => x[0])) expect(s.toUpperCase().includes(c), c).toBe(true);
    expect(s).toContain(`fill="${PAL.colors.PAPER}"`); /* молоко */
    expect(win('juice', 'orange_bumble')).not.toContain('data-receiver="blender"');
  });
  test('тыквенный капучино: солонка со специями из примитивов палитры; остальные топпинги без неё', () => {
    const s = win('topping', 'cappuccino_pumpkin', false);
    expect(s).toContain('data-spice="1"');
    expect(s).not.toContain('data-item="jarCocoa"');
    expect(s).toContain(PAL.colors.MUSTARD); /* цвет специи */
    expect(s).toContain(PAL.colors.STEEL_HI); /* крышка */
    expect(win('juice', 'orange_bumble')).not.toContain('data-spice="1"');
  });
  test('солонка рисуется только в окне: у предметов бара её нет', () => {
    expect(JSON.stringify(Object.keys(CENTER))).not.toMatch(/spice/i);
    expect(rest(win('topping', 'cappuccino_pumpkin', false), 'data-spice="1"').length).toBeGreaterThan(100);
  });
});
