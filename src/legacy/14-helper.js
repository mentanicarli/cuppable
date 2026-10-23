/* ---------- помощник: с ранга «Старший смены» сам готовит простые напитки ---------- */
function helperTick(dt) {
  const chip = $('#helperChip');
  if (!G.helper || G.rank < MENUAPI.HELPER_MIN_RANK) { chip.hidden = true; return; }
  const H = D.helper || (D.helper = { c: null, t: 0, need: 0 });
  if (H.c && (H.c.leaving || !D.customers.includes(H.c) || (BR && BR.c === H.c))) { refund(H.paid); H.paid = 0; if (H.res) MENUAPI.unpour(D.carafe, H.res); H.res = 0; H.c = null; updateHud(true); } /* кофе из колбы, зарезервированный помощником, возвращается */ /* помощник не выдал напиток: его расходы возвращаем */
  if (!H.c && !D.closing) {
    const carafe = { ml: D.carafe.ml, brewing: !!D.carafe.brew };
    const g = MENUAPI.helperPick(D.customers.map(c => ({ id: c.id, drink: c.drink, arrived: c.arrived, leaving: c.leaving, pat: c.pat, syrup: c.syrup, food: !!(c.order && c.order.food), ml: c.order ? MENUAPI.SIZE_ML[c.order.size] : 0 })), BR ? BR.c.id : null, carafe);
    if (!g && !carafe.brewing) D.customers.forEach(c => { if (c.drink === 'filter_coffee' && c.arrived && !c.leaving && !(c.order && c.order.food) && !c.helperSkip && !(BR && BR.c === c) && carafe.ml < MENUAPI.SIZE_ML[c.order.size]) { c.helperSkip = true; toast('Фильтр-кофе закончился'); } }); /* колбы не хватает: заказ остаётся игроку, тост один раз на гостя */
    if (g) { H.c = D.customers.find(c => c.id === g.id); H.t = 0; H.res = H.c.drink === 'filter_coffee' ? MENUAPI.SIZE_ML[H.c.order.size] : 0; if (H.res) MENUAPI.pour(D.carafe, H.res); H.need = MENUAPI.helperPrepTime(H.c.drink, H.c.order ? H.c.order.shots : 1); const cost = drinkCost(H.c.drink, H.c.order); spend(cost); H.paid = cost; }
  } else if (H.c) {
    H.t += dt;
    if (H.t >= H.need) { const c = H.c; H.c = null; H.paid = 0; H.res = 0; deliver(c, c.drink, MENUAPI.helperQuality(G.rank), false, false); updateHud(true); }
  }
  chip.hidden = !H.c;
  if (H.c) { chip.textContent = 'Помощник: ' + NAME[H.c.drink].toLowerCase() + ' ' + Math.min(100, Math.round(H.t / H.need * 100)) + '%'; }
}
