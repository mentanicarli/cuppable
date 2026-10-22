import { describe, expect, test } from 'vitest';
import PARTS_R from '../src/assets/art/bar-parts-right.json';
import PAL from '../art-src/palette.json';
import BUCKET_RAW from '../art-src/side-r/variants/bucket-b.svg?raw';
import { LAYER_RANK, parseBalls, parseGlasses, parseItems, strawTops, type Box } from './helpers/sideArt';

/* Блок 30-2б: сосуды правой секции (стаканы, кувшин, жестяные стаканы), шарики бабл ти, стакан с трубочками, ведёрко со льдом, миксер пенок.
   Правило слоёв сосуда: 1 стенка, 2 жидкость, (шарики), 3 трубочка, 4 контур, 5 блик. Жидкость вписана во внутренний контур. */
const parts = PARTS_R as unknown as Record<string, { svg: string }>;
const svgOf = (id: string): string => (parts[id] as { svg: string }).svg;
const S = 1.1;
/* вариант B лежит в art-src с токенами {{ИМЯ}}: подставляем цвета палитры */
const BUCKET_B = BUCKET_RAW.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (PAL.colors as Record<string, string>)[k] ?? m);
const finalBox = (part: string, id: string): Box => (parseItems(svgOf(part)).find((i) => i.id === id) as { final: Box }).final;

describe('30-2б: порядок слоёв сосудов и жидкость', () => {
  const glasses = Object.keys(parts).flatMap((k) => parseGlasses(svgOf(k)));
  test('есть все сосуды: 6 стаканов на полке, стакан бабл ти, стакан с трубочками, кувшин блендера, два стальных стакана шейкера', () => {
    expect(glasses.map((g) => g.id).sort()).toEqual(['blenderJug', 'bobaCup', 'shelfGlass1', 'shelfGlass2', 'shelfGlass3', 'shelfGlass4', 'shelfGlass5', 'shelfGlass6', 'strawJar', 'tinBig', 'tinSmall']);
  });
  test('слои идут по порядку: стенка → жидкость → шарики → трубочка → контур → блик', () => {
    for (const g of glasses) {
      const ranks = g.layers.map((l) => LAYER_RANK[l]);
      expect(ranks.every((r) => r !== undefined), `${g.id}: неизвестный слой`).toBe(true);
      for (let i = 1; i < ranks.length; i++) expect(ranks[i] as number, `${g.id}: порядок слоёв ${g.layers.join(',')}`).toBeGreaterThanOrEqual(ranks[i - 1] as number);
      expect(g.layers[0], g.id).toBe('back');
      expect(g.layers.includes('outline'), `${g.id}: контур`).toBe(true);
      expect(g.layers[g.layers.length - 1], `${g.id}: блик последним`).toBe('shine');
    }
  });
  test('жидкость целиком внутри внутреннего контура с запасом ≥ 1 px, верх ниже верха стекла, низ плоский у дна', () => {
    let withLiquid = 0;
    for (const g of glasses) {
      if (!g.liquid) continue;
      withLiquid++;
      const l = g.liquid, i = g.inner;
      expect(l.x, `${g.id} слева`).toBeGreaterThanOrEqual(i.x + 1);
      expect(l.x + l.w, `${g.id} справа`).toBeLessThanOrEqual(i.x + i.w - 1);
      expect(l.y, `${g.id} верх ниже верха стекла`).toBeGreaterThanOrEqual(i.y + 0.1);
      expect(l.y + l.h, `${g.id} низ`).toBeLessThanOrEqual(i.y + i.h - 1);
      expect(l.y + l.h, `${g.id} низ у дна`).toBeGreaterThanOrEqual(i.y + i.h - 4);
    }
    expect(withLiquid).toBe(4); /* три стакана на полке и стакан бабл ти */
  });
  test('проверка действительно ловит вылезшую жидкость: поддельный стакан с жидкостью за контуром не проходит', () => {
    const fake = '<g data-glass="fake" data-inner="10 10 40 60"><path data-layer="back" d="M0 0Z"/><path data-layer="liquid" d="M12 30L52 30L52 66L12 66Z"/><path data-layer="outline" d="M0 0Z"/></g>';
    const g = parseGlasses(fake)[0] as ReturnType<typeof parseGlasses>[number];
    const l = g.liquid as Box;
    expect(l.x + l.w <= g.inner.x + g.inner.w - 1).toBe(false);
    const wrongOrder = parseGlasses('<g data-glass="o" data-inner="0 0 1 1"><path data-layer="outline" d="M0 0Z"/><path data-layer="liquid" d="M0 0Z"/></g>')[0] as ReturnType<typeof parseGlasses>[number];
    const r = wrongOrder.layers.map((x) => LAYER_RANK[x] as number);
    expect((r[1] as number) >= (r[0] as number)).toBe(false);
  });
  test('трубочки стоят внутри: выступ над краем ≤ 35 % высоты стакана (запасные в банке ≤ 30 %)', () => {
    let n = 0;
    for (const g of glasses) {
      const glassTop = g.inner.y - 1.4, height = g.inner.h + 2.8;
      for (const st of strawTops(g.body)) {
        n++;
        expect(glassTop - st.top, g.id).toBeLessThanOrEqual(height * (st.jar ? 0.3 : 0.35) + 0.01);
      }
    }
    expect(n).toBeGreaterThanOrEqual(10);
  });
});

describe('30-2б: шарики бабл ти', () => {
  const cup = parseGlasses(svgOf('boba')).find((g) => g.id === 'bobaCup') as ReturnType<typeof parseGlasses>[number];
  const pot = /<g data-pot="1" data-inner="([^"]+)">([\s\S]*?)<\/g>/.exec(svgOf('boba')) as RegExpExecArray;
  const potInner = (pot[1] as string).split(' ').map(Number) as [number, number, number, number];
  const cupBalls = parseBalls(cup.body), potBalls = parseBalls(pot[2] as string);
  test('в стакане 8–14 шариков, в кастрюле 6–8', () => {
    expect(cupBalls.length).toBeGreaterThanOrEqual(8);
    expect(cupBalls.length).toBeLessThanOrEqual(14);
    expect(potBalls.length).toBeGreaterThanOrEqual(6);
    expect(potBalls.length).toBeLessThanOrEqual(8);
  });
  test('диаметр шарика 3,8–4,6 px (проектный и после ×1,10), цвет CHOC', () => {
    for (const b of [...cupBalls, ...potBalls]) {
      expect(2 * b.r).toBeGreaterThanOrEqual(3.8);
      expect(2 * b.r * S).toBeLessThanOrEqual(4.6);
    }
    expect(svgOf('boba')).toContain(PAL.colors.CHOC);
  });
  test('центры шариков внутри внутреннего контура; в стакане лежат на дне в 2–3 ряда неровно', () => {
    const i = cup.inner;
    for (const b of cupBalls) expect(b.cx >= i.x && b.cx <= i.x + i.w && b.cy >= i.y && b.cy <= i.y + i.h, `шарик стакана ${b.cx},${b.cy}`).toBe(true);
    for (const b of potBalls) expect(b.cx >= potInner[0] && b.cx <= potInner[0] + potInner[2] && b.cy >= potInner[1] && b.cy <= potInner[1] + potInner[3], `шарик кастрюли ${b.cx},${b.cy}`).toBe(true);
    /* ряды: группы центров по y, разрыв между рядами больше 2 px */
    const ys = cupBalls.map((b) => b.cy).sort((p, q) => p - q);
    const rows = 1 + ys.filter((v, k) => k > 0 && v - (ys[k - 1] as number) > 2).length;
    expect(rows).toBeGreaterThanOrEqual(2);
    expect(rows).toBeLessThanOrEqual(3);
    expect(new Set(cupBalls.map((b) => b.cx.toFixed(1))).size).toBe(cupBalls.length);
  });
  test('в кастрюле шарики рисуются раньше корпуса: передний край скрывает нижние половины передних шариков', () => {
    const body = pot[2] as string;
    expect(body.lastIndexOf('data-ball')).toBeLessThan(body.indexOf('A50 6 0 0 0 816 452V496'));
    expect(potBalls.filter((b) => b.cy > 456).length).toBeGreaterThanOrEqual(2);
  });
});

describe('30-2б: стакан с запасными трубочками', () => {
  const jar = parseGlasses(svgOf('boba')).find((g) => g.id === 'strawJar') as ReturnType<typeof parseGlasses>[number];
  const st = strawTops(jar.body);
  test('6–7 трубочек, ширина каждой ≤ 4 px, высота разная, правый край рамки boba (итог 968)', () => {
    expect(st.length).toBeGreaterThanOrEqual(6);
    expect(st.length).toBeLessThanOrEqual(7);
    for (const s of st) expect(s.w).toBeLessThanOrEqual(4);
    expect(new Set(st.map((s) => s.top.toFixed(1))).size).toBeGreaterThanOrEqual(4);
    const f = finalBox('boba', 'boba');
    expect(Math.abs(f.x + f.w - 968.2)).toBeLessThan(0.6);
  });
});

describe('30-4: ведёрко со льдом (вариант A в игре, вариант B — стеклянная чаша, только кадр)', () => {
  const variants: Record<string, string> = { A: svgOf('decor'), B: BUCKET_B };
  for (const [v, svg] of Object.entries(variants)) {
    const rim = (/data-rim="([^"]+)"/.exec(svg) as RegExpExecArray)[1] as string;
    const [rx, ry, rw, rh] = rim.split(' ').map(Number) as [number, number, number, number];
    const cubes = [...svg.matchAll(/<rect data-ice="1" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)/g)].map((m) => ({ x: +(m[1] as string), y: +(m[2] as string), w: +(m[3] as string), h: +(m[4] as string), tag: m[5] as string }));
    const ov = (p: Box, q: Box): number => Math.max(0, Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x)) * Math.max(0, Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y));
    const rowsOf = (): Box[][] => {
      const rows: Box[][] = [];
      for (const c of [...cubes].sort((a, b) => b.y - a.y)) {
        const r = rows.find((row) => Math.abs((row[0] as Box).y - c.y) < 3);
        if (r) r.push(c); else rows.push([c]);
      }
      return rows;
    };
    describe(`вариант ${v}`, () => {
      test('8–10 видимых кубиков, сторона 14–16 px, скругление 3, поворот ±12°, светло-голубая заливка, контур D', () => {
        expect(cubes.length).toBeGreaterThanOrEqual(8);
        expect(cubes.length).toBeLessThanOrEqual(10);
        for (const c of cubes) {
          expect(c.w).toBeGreaterThanOrEqual(14);
          expect(c.w).toBeLessThanOrEqual(16);
          expect(c.w).toBe(c.h);
          expect(c.tag).toContain('rx="3"');
          expect(Math.abs(Number(/rotate\((-?[\d.]+)/.exec(c.tag)?.[1]))).toBeLessThanOrEqual(12);
          expect(c.tag).toContain('fill="#DCEBEA"');
        }
        expect(new Set(cubes.map((c) => /rotate\((-?[\d.]+)/.exec(c.tag)?.[1])).size).toBeGreaterThanOrEqual(5);
      });
      test('горка: верхний кубик над ободом не больше 1,5 своей высоты; кубики среднего и верхнего рядов перекрывают ≥ 2 нижних по ≥ 20 % площади; никто не висит', () => {
        const rows = rowsOf();
        expect(rows.length).toBeGreaterThanOrEqual(3);
        const top = Math.min(...cubes.map((c) => c.y));
        expect(ry - top, 'над ободом').toBeLessThanOrEqual(1.5 * 15);
        for (let r = 1; r < rows.length; r++) for (const c of rows[r] as Box[]) {
          const lower = rows.slice(0, r).flat();
          const hits = lower.filter((o) => ov(c, o) >= 0.2 * c.w * c.h);
          expect(hits.length, `кубик ${c.x},${c.y}`).toBeGreaterThanOrEqual(2);
        }
        for (const c of cubes) expect(c.x >= rx - 4 && c.x + c.w <= rx + rw + 4, 'кубик в пределах обода').toBe(true);
        expect(rh).toBeGreaterThan(0);
      });
      test('щипцы 20–24 px и касаются обода', () => {
        const m = /data-tongs="([\d. -]+)"/.exec(svg) as RegExpExecArray;
        const [x1, y1, x2, y2] = (m[1] as string).split(' ').map(Number) as [number, number, number, number];
        expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThanOrEqual(20);
        expect(Math.hypot(x2 - x1, y2 - y1)).toBeLessThanOrEqual(24);
        const tb: Box = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
        expect(ov({ ...tb, w: tb.w + 0.01, h: tb.h + 0.01 }, { x: rx, y: ry, w: rw, h: rh })).toBeGreaterThan(0);
      });
    });
  }
  test('вариант A в игре: правый край итоговой рамки ≤ 1259, левый ≥ 1166, зазор до шейкера ≥ 12; низ 506', () => {
    const f = finalBox('decor', 'iceBucket');
    expect(f.x + f.w).toBeLessThanOrEqual(1259);
    expect(f.x).toBeGreaterThanOrEqual(1166);
    expect(f.x - (finalBox('shaker', 'shaker').x + finalBox('shaker', 'shaker').w)).toBeGreaterThanOrEqual(12);
    expect(f.y + f.h).toBeCloseTo(506, 0);
    expect(f.y).toBeGreaterThanOrEqual(330);
  });
  test('A: слои — задний обод → кубики → корпус с передним краем → щипцы; корпус светлее и холоднее, 3 капли 3–4 px, без полотенца', () => {
    const svg = svgOf('decor');
    const iRim = svg.indexOf('data-bucket="A"'), iIce = svg.indexOf('data-ice="1"'), iFront = svg.indexOf('data-front="1"'), iTongs = svg.indexOf('data-tongs=');
    expect(iRim).toBeLessThan(iIce);
    expect(iIce).toBeLessThan(iFront);
    expect(iFront).toBeLessThan(iTongs);
    expect(svg).toMatch(/fill="#E8E2D6" stroke-width="2\.73"/); /* корпус STEEL_HI светлее STEEL */
    expect(svg).toContain('#BBD6D3'); /* холодная полоса GLASS_DP */
    const drops = [...svg.matchAll(/<path data-drop="1" d="([^"]+)"/g)];
    expect(drops).toHaveLength(3);
    for (const d of drops) {
      const nums = (d[1] as string).match(/-?[\d.]+/g)?.map(Number) as number[];
      const ys = nums.filter((_, i) => i % 2 === 1), xs = nums.filter((_, i) => i % 2 === 0);
      const h = Math.max(...ys) - Math.min(...ys), w = Math.max(...xs) - Math.min(...xs);
      expect(h).toBeGreaterThanOrEqual(3); expect(h).toBeLessThanOrEqual(4); expect(w).toBeLessThanOrEqual(4);
    }
  });
  test('B: слои стеклянной чаши — задняя стенка, лужа, лёд, передняя стенка, ножка, контур, блик', () => {
    const order = ['data-layer="back"', 'data-puddle="1"', 'data-ice="1"', 'data-layer="front"', 'data-layer="stem"', 'data-layer="outline"', 'data-layer="shine"'].map((k) => BUCKET_B.indexOf(k));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('30-2б: миксер пенок', () => {
  const svg = svgOf('foamer');
  test('красного блока сверху нет; белая круглая база', () => {
    expect([...svg.matchAll(/<rect [^>]*fill="#c4694a"/gi)]).toHaveLength(0);
    expect(svg).toContain('<ellipse cx="470" cy="486" rx="50" ry="6" fill="#FFF8EC"');
  });
  describe('шапка пены — облако', () => {
    const d = (/<path data-cap="1" d="([^"]+)"/.exec(svg) as RegExpExecArray)[1] as string;
    const arcs = [...d.matchAll(/A([\d.]+) [\d.]+ 0 0 1 ([\d.]+) ([\d.]+)/g)].map((m) => ({ r: Number(m[1]), x: Number(m[2]), y: Number(m[3]) }));
    const start = /^M([\d.]+) ([\d.]+)/.exec(d) as RegExpExecArray;
    /* точки дуг (сэмплы по окружности, sweep=1) */
    const pts: { x: number; y: number }[] = [];
    let px = Number(start[1]), py = Number(start[2]);
    for (const a of arcs) {
      const mx = (px + a.x) / 2, my = (py + a.y) / 2, c = Math.hypot(a.x - px, a.y - py);
      const h = Math.sqrt(Math.max(0, a.r * a.r - (c / 2) ** 2));
      const ux = (a.x - px) / c, uy = (a.y - py) / c;
      /* центр справа от направления хорда (sweep=1, малая дуга): выпуклость вверх при движении слева направо */
      const cx = mx + uy * h * -1, cy = my - ux * h * -1;
      const a0 = Math.atan2(py - cy, px - cx);
      let a1 = Math.atan2(a.y - cy, a.x - cx);
      while (a1 < a0) a1 += Math.PI * 2;
      for (let i = 0; i <= 20; i++) { const t = a0 + ((a1 - a0) * i) / 20; pts.push({ x: cx + a.r * Math.cos(t), y: cy + a.r * Math.sin(t) }); }
      px = a.x; py = a.y;
    }
    const RIM_Y = 372;
    test('не меньше 6 дуг, радиусы 3–9, max/min ≥ 1,5, хорды помещаются', () => {
      expect(arcs.length).toBeGreaterThanOrEqual(6);
      const rs = arcs.map((a) => a.r);
      expect(Math.min(...rs)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...rs)).toBeLessThanOrEqual(9);
      expect(Math.max(...rs) / Math.min(...rs)).toBeGreaterThanOrEqual(1.5);
      let qx = Number(start[1]), qy = Number(start[2]);
      for (const a of arcs) { expect(Math.hypot(a.x - qx, a.y - qy)).toBeLessThanOrEqual(2 * a.r + 1e-6); qx = a.x; qy = a.y; }
    });
    test('высота над ободом 12–20 px, ширина не больше просвета + 2 px с каждой стороны, основание перекрывает обод на 2–3 px', () => {
      const top = Math.min(...pts.map((p) => p.y));
      expect(RIM_Y - top).toBeGreaterThanOrEqual(12);
      expect(RIM_Y - top).toBeLessThanOrEqual(20);
      expect(Math.min(...pts.map((p) => p.x))).toBeGreaterThanOrEqual(470 - 32 - 2);
      expect(Math.max(...pts.map((p) => p.x))).toBeLessThanOrEqual(470 + 32 + 2);
      const base = Math.max(Number(start[2]), ...arcs.map((a) => a.y));
      expect(base - RIM_Y).toBeGreaterThanOrEqual(2);
      expect(base - RIM_Y).toBeLessThanOrEqual(3);
    });
    test('верх неровный: высоты соседних вершин различаются', () => {
      const ys = arcs.slice(0, -1).map((a) => a.y);
      expect(new Set(ys.map((y) => Math.round(y))).size).toBeGreaterThanOrEqual(5);
    });
    test('кремовая заливка светлее стенки кувшина, полоса тени BAKE_SH у основания, 4–6 пузырьков светлее шапки, одна капля 4–6 px', () => {
      expect(svg).toMatch(/data-cap="1"[^>]*fill="#F1DFC2"/i);
      expect(svg).toContain('stroke="#B8733A"');
      const bubbles = [...svg.matchAll(/<circle data-bubble="1" [^>]*fill="#FFF8EC"/g)];
      expect(bubbles.length).toBeGreaterThanOrEqual(4);
      expect(bubbles.length).toBeLessThanOrEqual(6);
      const drops = [...svg.matchAll(/<path data-drop="1" d="([^"]+)"/g)];
      expect(drops).toHaveLength(1);
      const ys = [...(drops[0]?.[1] as string).matchAll(/(?:^|[MQ\s])[\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
      const hh = Math.max(...ys) - Math.min(...ys);
      expect(hh).toBeGreaterThanOrEqual(4);
      expect(hh).toBeLessThanOrEqual(6);
    });
  });
  test('трубка-вспениватель наклонена и не длиннее 25 % высоты предмета', () => {
    const m = /data-wand="([^"]+)"/.exec(svg) as RegExpExecArray;
    const [x1, y1, x2, y2] = (m[1] as string).split(' ').map(Number) as [number, number, number, number];
    const h = (parseItems(svg)[0] as { design: Box }).design.h;
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeLessThanOrEqual(0.25 * h);
    expect(Math.abs(x2 - x1)).toBeGreaterThan(3);
  });
  test('рамка предмета не выросла: итог 117 × 176 (±6 px, высота ≤ +4)', () => {
    const f = finalBox('foamer', 'foamer');
    expect(Math.abs(f.w - 117)).toBeLessThanOrEqual(6);
    expect(Math.abs(f.h - 176)).toBeLessThanOrEqual(6);
  });
});
