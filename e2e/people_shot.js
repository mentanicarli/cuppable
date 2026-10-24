/* Кадры людей из самой сцены (32-Г, 32-Д): сидящие за столиком, стоящие, ходьба и поворот. Отладочная сборка (CUPPABLE_DEBUG=1).
   node e2e/people_shot.js dist/artifact.html out/people-e <режим>   режимы: seat, seatcmp, stand, faces, neck, walk, turn, all
   OLD=1 — сборка до 32-Д (сидящий выбирается через Math.random, как раньше).
   Сидящий выбирается подбором сида: kind и lookFor берут числа из того же потока, что stepSitter (hallRng с 32-Д, Math.random раньше). */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[3] || 'out/people-e', mode = process.argv[4] || 'all';
const OLD = !!process.env.OLD;
fs.mkdirSync(out, { recursive: true });
const SEATS = {
  braid: 'l.hair === "braid"', wavy: 'l.hair === "wavy"', long: 'l.hair === "long"', pony: 'l.hair === "pony"', bob: 'l.hair === "bob"',
  bun_hp: 'l.hair === "bun" && l.acc === "headphones"', beard: 'l.facial === "beard" && l.acc !== "glasses"', beanie: 'l.hair === "beanie"', glasses: 'l.acc === "glasses" && l.facial === "none"', hoodie: 'l.outfit === "hoodie" && l.sex === "f"', coat: 'l.outfit === "coat" && l.facial === "none"', suit: 'l.outfit === "suit"'
};
const STANDS = {
  long: 'l.hair === "long"', wavy: 'l.hair === "wavy"', braid: 'l.hair === "braid"', pony: 'l.hair === "pony"', bun_hp: 'l.hair === "bun" && l.acc === "headphones"', beard: 'l.facial === "beard"'
};
/* 12 гостей: 6 м и 6 ж разных возрастов и причёсок */
const FACES = [
  ['m_young', 'l.sex === "m" && l.age === "young" && l.acc !== "headphones"'], ['m_young_hp', 'l.sex === "m" && l.age === "young" && l.acc === "headphones"'], ['m_adult', 'l.sex === "m" && l.age === "adult" && l.facial === "none"'],
  ['m_adult_beard', 'l.sex === "m" && l.age === "adult" && l.facial === "beard"'], ['m_senior', 'l.sex === "m" && l.age === "senior" && l.facial === "none"'], ['m_senior_glasses', 'l.sex === "m" && l.age === "senior" && l.acc === "glasses"'],
  ['f_young', 'l.sex === "f" && l.age === "young" && l.hair === "pony"'], ['f_young_braid', 'l.sex === "f" && l.age === "young" && l.hair === "braid"'], ['f_adult', 'l.sex === "f" && l.age === "adult" && l.hair === "long"'],
  ['f_adult_bun', 'l.sex === "f" && l.age === "adult" && l.hair === "bun"'], ['f_senior', 'l.sex === "f" && l.age === "senior"'], ['f_young_wavy', 'l.sex === "f" && l.age === "young" && l.hair === "wavy"']
];
const NECKS = [
  ['hoodie', 'l.outfit === "hoodie" && l.facial === "none"'], ['coat', 'l.outfit === "coat" && l.facial === "none" && l.acc !== "scarf"'], ['sweater', 'l.outfit === "sweater" && l.facial === "none" && l.acc === "none"'], ['jacket', 'l.outfit === "jacket" && l.facial === "none"'], ['suit', 'l.outfit === "suit" && l.facial === "none"'],
  ['coat_beard', 'l.outfit === "coat" && l.facial === "beard"'], ['sweater_beard', 'l.outfit === "sweater" && l.facial === "beard"'], ['jacket_beard', 'l.outfit === "jacket" && l.facial === "beard"'], ['scarf', 'l.acc === "scarf"']
];
/* 32-Е: наряды по полу (6 м + 6 ж), ступени бороды, сидящие 3 м + 3 ж */
const OUTFITS = [
  ['m_coat', 'l.sex === "m" && l.outfit === "coat"'], ['m_jacket', 'l.sex === "m" && l.outfit === "jacket"'], ['m_vest', 'l.sex === "m" && l.outfit === "vest"'], ['m_suit', 'l.sex === "m" && l.outfit === "suit"'], ['m_hoodie', 'l.sex === "m" && l.outfit === "hoodie"'], ['m_scarf', 'l.sex === "m" && l.acc === "scarf"'],
  ['f_dress', 'l.sex === "f" && l.outfit === "dress"'], ['f_cardigan', 'l.sex === "f" && l.outfit === "cardigan"'], ['f_blouse', 'l.sex === "f" && l.outfit === "blouse"'], ['f_beltcoat', 'l.sex === "f" && l.outfit === "beltcoat"'], ['f_sweaterdress', 'l.sex === "f" && l.outfit === "sweaterdress"'], ['f_hoodie', 'l.sex === "f" && l.outfit === "hoodie"']
];
const BEARDS = ['none', 'stubble', 'short', 'mustache', 'beard'].map((f) => ['b_' + f, 'l.sex === "m" && l.age === "adult" && l.acc === "none" && l.facial === "' + f + '" && l.hair !== "beanie"']);
const SHAPES = [['sq_m', 'l.sex === "m" && l.face.shape === "square" && l.facial === "none" && l.acc === "none"'], ['sq_m2', 'l.sex === "m" && l.face.shape === "square" && l.facial === "beard"'], ['ov_m', 'l.sex === "m" && l.face.shape === "oval" && l.facial === "none" && l.acc === "none"'], ['sq_m3', 'l.sex === "m" && l.face.shape === "square" && l.age === "senior" && l.acc === "none"'], ['rd_f', 'l.sex === "f" && l.face.shape === "round" && l.acc === "none"'], ['ov_f', 'l.sex === "f" && l.face.shape === "oval" && l.acc === "none"']];
const WRINKLES = [['w_adult_m', 'l.sex === "m" && l.age === "adult" && l.face.wrinkles >= 1 && l.facial === "none" && l.acc === "none"'], ['w_adult_f', 'l.sex === "f" && l.age === "adult" && l.face.wrinkles >= 1 && l.acc === "none"'], ['w_senior_m1', 'l.sex === "m" && l.age === "senior" && l.face.wrinkles === 1 && l.facial === "none" && l.acc === "none"'], ['w_senior_m2', 'l.sex === "m" && l.age === "senior" && l.face.wrinkles === 2 && l.facial === "none" && l.acc === "none"'], ['w_senior_f', 'l.sex === "f" && l.age === "senior" && l.acc === "none"'], ['w_senior_beard', 'l.sex === "m" && l.age === "senior" && l.facial === "beard"']];
const SEAT32 = { sm_coat: 'l.sex === "m" && l.outfit === "coat"', sm_vest: 'l.sex === "m" && l.outfit === "vest" && l.facial === "beard"', sm_hoodie: 'l.sex === "m" && l.outfit === "hoodie"', sf_dress: 'l.sex === "f" && l.outfit === "dress"', sf_cardigan: 'l.sex === "f" && l.outfit === "cardigan"', sf_beltcoat: 'l.sex === "f" && l.outfit === "beltcoat"' };
(async () => {
  const PW = require('./pw');
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', 'newGame(); updateHud(); showTitle(); window.__dbg = { WORLD, lookFor, get G() { return G; }, get D() { return D; } };');
  const tmp = path.resolve(process.argv[2]).replace('.html', '.people.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
  const open = async () => {
    const p = await PW.page(b); const errs = []; PW.watch(p, errs);
    await p.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__hold = false; window.requestAnimationFrame = cb => window.__hold ? 0 : raf(cb); });
    await p.goto(PW.url(tmp) + '#nopixi'); await p.waitForTimeout(2500); await PW.startNew(p); await p.waitForTimeout(800);
    await p.addStyleTag({ content: '#screen,#hud,#hudR,#tint,#boot,#bar,#frontHint,#banner{display:none!important}' });
    await p.evaluate(() => { window.__hold = true; });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      const { WORLD, lookFor } = window.__dbg;
      window.__mul = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.__seed = (pred, sitter, from) => { const f = new Function('l', 'return ' + pred); for (let s = from || 1; s < 80000; s++) { const r = window.__mul(s); let kind; if (sitter) kind = ['student', 'student', 'regular', 'hurry'][Math.floor(r() * 4)]; else kind = ['regular', 'student', 'hurry'][s % 3]; const l = lookFor(kind, r); if (f(l)) return { s, kind }; } return null; };
      window.__step = n => { for (let i = 0; i < n; i++) WORLD.update(1 / 30, 0.3, 480); };
      window.__crop = (x, y, w, h, ow, oh) => { WORLD.app.render(); const c = WORLD.app.renderer.extract.canvas({ target: WORLD.app.stage, frame: WORLD.app.screen, resolution: WORLD.app.renderer.resolution }); const k = c.width / 1280; const o = document.createElement('canvas'); o.width = ow; o.height = oh; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, x * k, y * k, w * k, h * k, 0, 0, ow, oh); return o.toDataURL('image/png'); };
      window.__spawn = (sd, x) => { const l = lookFor(sd.kind, window.__mul(sd.s)); return WORLD.addActor({ look: l, title: '', tags: [], x, onTap: () => undefined }); };
    });
    return { p, errs };
  };
  const save = (fn, url) => fs.writeFileSync(path.join(out, fn), Buffer.from(url.split(',')[1], 'base64'));
  const seatOne = async (name, pred) => {
    const { p, errs } = await open();
    const sd = await p.evaluate((pred) => window.__seed(pred, true), pred);
    const info = await p.evaluate(([sd, old]) => {
      const { WORLD } = window.__dbg; const real = Math.random;
      if (WORLD.sitter) { WORLD.sitter.destroy(); WORLD.sitter = null; } WORLD.sitSt = 'empty'; WORLD.deskShow(null);
      if (old) Math.random = window.__mul(sd.s); else WORLD.hallRng = window.__mul(sd.s);
      WORLD.sitT = 0; WORLD.stepSitter(1 / 30); Math.random = real;
      return JSON.stringify(WORLD.sitter && WORLD.sitter.o.look);
    }, [sd, OLD]);
    for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(30)); if (await p.evaluate(() => window.__dbg.WORLD.sitSt === 'seated')) break; await p.waitForTimeout(120); }
    await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; a.busy = true; a.act = 'type'; a.seq = null; window.__step(60); });
    await p.waitForTimeout(900); await p.evaluate(() => window.__step(4));
    const geo = await p.evaluate(() => { const a = window.__dbg.WORLD.sitter; const hb = a.hairC ? a.hairC.getBounds() : null; return hb ? { bottom: +(hb.y + hb.height).toFixed(1), maskTop: 652 + (490 - 652) * 1.6 } : null; });
    save(`seat_${name}.png`, await p.evaluate(() => window.__crop(80, 235, 300, 330, 600, 660)));
    console.log('seat', name, 'seed', sd.s, JSON.stringify(JSON.parse(info), ['hair', 'hairCol', 'facial', 'acc', 'sex', 'age', 'outfit']), geo ? `hairBottom ${geo.bottom} maskTop ${geo.maskTop}` : '', 'ERRS', errs.slice(0, 3).join('|') || 'нет');
    await p.context().close();
  };
  if (mode === 'seat' || mode === 'all') for (const [name, pred] of Object.entries(SEATS)) if (!process.env.ONLY || process.env.ONLY.split(',').includes(name)) await seatOne(name, pred);
  if (mode === 'seat32') for (const [name, pred] of Object.entries(SEAT32)) await seatOne(name, pred);
  if (mode === 'seatcmp') for (const name of ['pony', 'bob', 'long', 'braid', 'wavy']) await seatOne(name, SEATS[name]);
  if (mode === 'stand' || mode === 'all') {
    for (const [name, pred] of Object.entries(STANDS)) {
      const { p, errs } = await open();
      const sd = await p.evaluate(pred => window.__seed(pred, false), pred);
      await p.evaluate(sd => { window.__a = window.__spawn(sd, 640); }, sd);
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const a = window.__a; for (let i = 0; i < 20; i++) a.update(1 / 30, 640, 0); window.__dbg.WORLD.update(1 / 30, 0.3, 480); });
      save(`stand_${name}.png`, await p.evaluate(() => window.__crop(540, 250, 200, 360, 400, 720)));
      console.log('stand', name, 'seed', sd.s, 'ERRS', errs.slice(0, 3).join('|') || 'нет');
      await p.context().close();
    }
  }
  const lineup = async (list, prefix, crop) => {
    /* по 6 гостей в ряд, чтобы не пересекались; кадр на каждого */
    for (let g0 = 0; g0 < list.length; g0 += 6) {
      const { p, errs } = await open();
      const part = list.slice(g0, g0 + 6);
      const seeds = [];
      for (const [name, pred] of part) seeds.push(await p.evaluate(pred => window.__seed(pred, false), pred));
      await p.evaluate(seeds => { window.__as = seeds.map((sd, i) => window.__spawn(sd, 130 + i * 200)); }, seeds);
      await p.waitForTimeout(2500);
      await p.evaluate(() => { window.__as.forEach((a, i) => { for (let k = 0; k < 20; k++) a.update(1 / 30, 130 + i * 200, 0); }); window.__dbg.WORLD.update(1 / 30, 0.3, 480); });
      for (let i = 0; i < part.length; i++) save(`${prefix}_${part[i][0]}.png`, await p.evaluate(([x, c]) => c ? window.__crop(x - 60, 268, 120, 120, 480, 480) : window.__crop(x - 95, 250, 190, 360, 380, 720), [130 + i * 200, !!crop]));
      console.log(prefix, part.map((q, i) => q[0] + ':' + (seeds[i] ? seeds[i].s : '?')).join(' '), 'ERRS', errs.slice(0, 3).join('|') || 'нет');
      await p.context().close();
    }
  };
  if (mode === 'faces' || mode === 'all') await lineup(FACES, 'face');
  if (mode === 'shapes') await lineup(SHAPES, 'shape', true);
  if (mode === 'wrinkles') await lineup(WRINKLES, 'wr', true);
  if (mode === 'outfits') await lineup(OUTFITS, 'outfit');
  if (mode === 'beards') {
    await lineup(BEARDS, 'beard');
    for (const [name, pred] of BEARDS) for (const [dn, dir] of [['right', 1], ['left', -1]]) {
      /* новая страница на каждый кадр: атлас головы нового гостя при остановленном цикле не дорисовывается */
      const { p, errs } = await open();
      const sd = await p.evaluate(pred => window.__seed(pred, false), pred);
      await p.evaluate(([sd, dir]) => { window.__a = window.__spawn(sd, dir > 0 ? 300 : 900); window.__x = dir > 0 ? 300 : 900; window.__dir = dir; }, [sd, dir]);
      await p.waitForTimeout(3000);
      await p.evaluate(() => { const a = window.__a; for (let i = 0; i < 20; i++) { a.update(1 / 30, window.__x, 0); window.__dbg.WORLD.update(1 / 30, 0.3, 480); } });
      await p.waitForTimeout(1500);
      await p.evaluate(() => { const a = window.__a; for (let i = 0; i < 40; i++) { window.__x += window.__dir * 105 / 30; a.update(1 / 30, window.__x, 0); } window.__dbg.WORLD.update(1 / 30, 0.3, 480); });
      save(`beardturn_${name}_${dn}.png`, await p.evaluate(() => window.__crop(window.__x - 90, 250, 180, 360, 270, 540)));
      console.log('beardturn', name, dn, 'ERRS', errs.slice(0, 3).join('|') || 'нет');
      await p.context().close();
    }
  }
  if (mode === 'neck' || mode === 'all') await lineup(NECKS, 'neck');
  if (mode === 'walk' || mode === 'all') {
    const { p, errs } = await open();
    for (const name of ['long', 'braid', 'wavy', 'pony']) {
      const sd = await p.evaluate(pred => window.__seed(pred, false), 'l.hair === "' + name + '"');
      await p.evaluate(sd => { window.__dbg.WORLD.clearActors(); window.__a = window.__spawn(sd, 380); window.__x = 380; }, sd);
      await p.waitForTimeout(1500);
      const step = n => p.evaluate(n => { const a = window.__a; for (let i = 0; i < n; i++) { window.__x += 100 / 30; a.update(1 / 30, window.__x, 0); } }, n);
      await step(45);
      for (let f = 0; f < 6; f++) { await step(4); save(`walk_${name}_${f}.png`, await p.evaluate(() => window.__crop(window.__x - 90, 250, 180, 360, 270, 540))); }
      console.log('walk', name, 'seed', sd.s);
    }
    console.log('ERRS', errs.slice(0, 3).join('|') || 'нет');
    await p.context().close();
  }
  if (mode === 'turn' || mode === 'all') {
    /* три гостя: идёт вправо (к стойке), идёт влево (уходит), стоит и трогается (переход) */
    const preds = [['woman', 'l.sex === "f" && l.hair === "bob"'], ['man', 'l.sex === "m" && l.facial === "beard"'], ['student', 'l.sex === "f" && l.hair === "pony"']];
    const { p, errs } = await open();
    for (const [name, pred] of preds) {
      const sd = await p.evaluate(pred => window.__seed(pred, false), pred);
      for (const [dirName, dir] of [['right', 1], ['left', -1]]) {
        await p.evaluate(([sd, dir]) => { window.__dbg.WORLD.clearActors(); window.__a = window.__spawn(sd, dir > 0 ? 300 : 900); window.__x = dir > 0 ? 300 : 900; window.__dir = dir; }, [sd, dir]);
        await p.waitForTimeout(1800);
        const step = n => p.evaluate(n => { const a = window.__a; for (let i = 0; i < n; i++) { window.__x += window.__dir * 105 / 30; a.update(1 / 30, window.__x, 0); } }, n);
        if (dirName === 'right' && name === 'student') {
          /* переход: стоит, затем идёт; кадры каждые 0,08 с */
          await p.evaluate(() => { const a = window.__a; for (let i = 0; i < 15; i++) a.update(1 / 30, window.__x, 0); });
          for (let f = 0; f < 6; f++) { await step(2); await p.waitForTimeout(150); save(`turn_${name}_start_${f}.png`, await p.evaluate(() => window.__crop(window.__x - 90, 250, 180, 360, 270, 540))); }
          continue;
        }
        await step(40);
        for (let f = 0; f < 6; f++) { await step(3); save(`turn_${name}_${dirName}_${f}.png`, await p.evaluate(() => window.__crop(window.__x - 90, 250, 180, 360, 270, 540))); }
      }
      console.log('turn', name, 'seed', sd.s);
    }
    console.log('ERRS', errs.slice(0, 3).join('|') || 'нет');
    await p.context().close();
  }
  fs.unlinkSync(tmp); await b.close();
})();
