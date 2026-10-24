/* Кадр блока 31-7 (инструмент для глаз): все карточки магазина с иконками одной сеткой. Отладочная сборка.
   node e2e/shop_icons_shot.js dist/artifact.html docs/art/fixes/31-7  → s6_shop_icons.png; печатает число различных иконок. */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const PW = require('./pw');
const out = path.resolve(process.argv[3] || 'out/shopicons'); fs.mkdirSync(out, { recursive: true });
const HOOK = 'newGame(); updateHud(); showTitle(); window.__dbg = { get G() { return G; }, shopCards: () => SHOP.map(it => ({ id: it.id, name: it.name, svg: SHOP_ICON[it.id] || shopBarIcon(it.id) || SHOP_ICON.machine })) };';
(async () => {
  const src = fs.readFileSync(path.resolve(process.argv[2]), 'utf8').replace('newGame(); updateHud(); showTitle();', HOOK);
  const tmp = path.resolve(process.argv[2]).replace('.html', '.si.html'); fs.writeFileSync(tmp, src);
  const b = await chromium.launch({ ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}), args: ['--mute-audio'] });
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1312, height: 752 }, deviceScaleFactor: 2 })).newPage();
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: PW.css })); PW.watch(p, errs);
  await p.goto(PW.url(tmp)); await p.waitForSelector('[data-menu=title]', { timeout: 30000 }); await p.waitForTimeout(800);
  const cards = await p.evaluate(() => __dbg.shopCards());
  console.log('позиций:', cards.length, 'различных иконок:', new Set(cards.map(c => c.svg)).size);
  await p.evaluate(cards => {
    const scr = document.querySelector('#screen'); scr.hidden = false;
    scr.innerHTML = '<div class="paper"><div class="shop"><div class="grid" style="grid-template-columns:repeat(6,1fr)">' + cards.map(c => `<div class="item">${c.svg}<div class="tx"><b style="font-size:13px">${c.name}</b></div></div>`).join('') + '</div></div></div>';
  }, cards);
  await p.waitForTimeout(500); await p.locator('#stage').screenshot({ path: `${out}/s6_shop_icons.png` });
  /* растр: снимок значка каждой карточки, все хэши разные */
  const hashes = new Map();
  const svgs = p.locator('.shop .item svg');
  for (let i = 0; i < cards.length; i++) { const h = require('crypto').createHash('md5').update(await svgs.nth(i).screenshot()).digest('hex'); if (hashes.has(h)) errs.push('FAIL одинаковый растр: ' + cards[i].id + ' и ' + hashes.get(h)); hashes.set(h, cards[i].id); }
  console.log('различных растров:', hashes.size, 'из', cards.length);

  /* 31-9: правило кадра: у иконок бара без окна рамка предмета по центру кадра, поля слева/справа и сверху/снизу равны (допуск 1,5 % кадра) */
  const CROP = ['eq_boba', 'eq_ice', 'eq_case_snacks', 'eq_case_pastry', 'eq_case_dessert'];
  const marg = await p.evaluate(() => [...document.querySelectorAll('svg[data-shopicon]')].map(s => { const vb = s.viewBox.baseVal, r = s.querySelector('g').getBBox(); return { id: s.dataset.shopicon, ml: (r.x - vb.x) / vb.width, mr: (vb.x + vb.width - r.x - r.width) / vb.width, mt: (r.y - vb.y) / vb.height, mb: (vb.y + vb.height - r.y - r.height) / vb.height }; }));
  for (const m of marg) if (!CROP.includes(m.id) && (Math.abs(m.ml - m.mr) > 0.015 || Math.abs(m.mt - m.mb) > 0.015 || Math.max(1 - m.ml - m.mr, 1 - m.mt - m.mb) < 0.76 || Math.max(1 - m.ml - m.mr, 1 - m.mt - m.mb) > 0.84)) errs.push('FAIL поля иконки ' + m.id + ': ' + JSON.stringify(m));
  console.log('иконок бара с замером полей:', marg.length);
  await b.close(); console.log(errs.length ? 'ОШИБКИ:\n' + errs.join('\n') : 'NO_ERRORS');
})();
