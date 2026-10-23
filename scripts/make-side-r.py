# Генератор исходников art-src/side-r/*.svg (30-2): проектные координаты = план (px, масштаб 1,0), раскладка ×1,10 через transform обёрток data-wrap.
# Запуск: python scripts/make-side-r.py, затем npm run art. Результат (art-src/side-r) коммитится; руками правится только здесь или в самих svg после генерации (тогда этот файл не запускать).
import os
S = 1.1
OUT = 'art-src/side-r'


def sw(k):
    return '{{%s}}' % k


def col(c):
    return '{{%s}}' % c


def rect(x, y, w, h, fill, k='M', rx=0):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"' + (f' rx="{rx:g}"' if rx else '') + f' fill="{col(fill)}" stroke-width="{sw(k)}"/>'


def path(d, fill='none', k='M', stroke=None):
    f = 'none' if fill == 'none' else col(fill)
    st = f' stroke="{col(stroke)}"' if stroke else ''
    return f'<path d="{d}" fill="{f}"{st} stroke-width="{sw(k)}"/>'


def flat(d, fill, op=None):
    return f'<path d="{d}" fill="{col(fill)}" stroke="none"' + (f' fill-opacity="{op}"' if op else '') + '/>'


def ell(cx, cy, rx, ry, fill, k='M'):
    return f'<ellipse cx="{cx:g}" cy="{cy:g}" rx="{rx:g}" ry="{ry:g}" fill="{col(fill)}" stroke-width="{sw(k)}"/>'


def circ(cx, cy, r, fill, k='D'):
    return f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{col(fill)}" stroke-width="{sw(k)}"/>'


def shadow(cx, rx, cy=508, ry=4):
    return f'<ellipse cx="{cx:g}" cy="{cy:g}" rx="{rx:g}" ry="{ry:g}" fill="{col("SHADOW")}" fill-opacity=".22" stroke="none"/>'


def hl(d, op=.7, k='M'):
    return f'<path d="{d}" fill="none" stroke="{col("HILITE")}" stroke-opacity="{op}" stroke-width="{sw(k)}"/>'


def item(id_, box, body):
    return f'<g data-item="{id_}" data-box="{" ".join(f"{v:g}" for v in box)}">\n' + '\n'.join(body) + '\n</g>'


def T(x0, x1, ay=506):
    return f'translate({x1:g} {ay:g}) scale({S}) translate({-x0:g} {-ay:g})'


def final(box, x0, x1, ay=506):
    x, y, w, h = box
    return (x1 + S * (x - x0), ay + S * (y - ay), S * w, S * h)


def write(name, comment, x0, x1, box, body, out=None):
    fb = final(box, x0, x1)
    vx, vy = fb[0] - 8, fb[1] - 8
    vw, vh = fb[2] + 16, max(520, fb[1] + fb[3] + 8) - vy
    vb = f'{vx:.0f} {vy:.0f} {vw:.0f} {vh:.0f}'
    sh, body = body[0], body[1:]  # контактная тень лежит вне рамки предмета (в рамку не входит)
    wrap = f'<g data-wrap="{name}" transform="{T(x0, x1)}">\n{sh}\n{item(name, box, body)}\n</g>\n'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" data-part="{name}" data-scale="{S}">\n<!--\n  {comment}\n-->\n'
           f'<g stroke="{col("INK")}" stroke-linejoin="round" stroke-linecap="round">\n{wrap}</g>\n</svg>\n')
    open(f'{out or OUT}/{name}.svg', 'w', encoding='utf-8', newline='').write(svg)


def bottle(x, y, w, h, liq, cap):
    nw = w * 0.36
    nx = x + (w - nw) / 2
    return [rect(x, y + 10, w, h - 10, 'GLASS', 'D', 3),
            flat(f'M{x + 1:g} {y + h * 0.42:g}H{x + w - 1:g}V{y + h - 3:g}Q{x + w - 1:g} {y + h - 1:g} {x + w - 4:g} {y + h - 1:g}H{x + 4:g}Q{x + 1:g} {y + h - 1:g} {x + 1:g} {y + h - 3:g}Z', liq),
            rect(nx, y + 3, nw, 9, 'GLASS', 'D', 1.5), rect(nx - 1, y, nw + 2, 5, cap, 'D', 1.5)]


# ---------------- juice: холодильник 66, 292, 152 x 214
j = [shadow(142, 80),
     rect(72, 496, 22, 10, 'STEEL_SH', 'M', 3), rect(190, 496, 22, 10, 'STEEL_SH', 'M', 3),
     rect(66, 292, 152, 206, 'DARK', 'M', 9),
     rect(76, 326, 132, 160, 'GLASS', 'M', 4),
     flat('M78 328H206V334H78Z', 'GLASS_DP'),
     path('M80 410H204', 'none', 'D', 'STEEL_SH'), path('M80 458H204', 'none', 'D', 'STEEL_SH'),
     '<g data-icon="snow">' + path('M142 298V320M133 301L151 317M151 301L133 317', 'none', 'D', 'PAPER') + '</g>']
for (y, items_) in [(408, [(82, 22, 70, 'MUSTARD', 'TERRA'), (108, 22, 70, 'SAGE_LT', 'SAGE'), (134, 22, 70, 'PINK', 'TERRA'), (160, 22, 70, 'MUSTARD', 'SAGE'), (186, 18, 70, 'GLASS_DP', 'DUSTY')]),
                    (458, [(82, 20, 46, 'TERRA', 'DARK'), (106, 20, 46, 'BAKE', 'DARK'), (130, 20, 46, 'SAGE_LT', 'DARK'), (156, 20, 46, 'PINK', 'DARK'), (180, 24, 46, 'GLASS_DP', 'DUSTY')]),
                    (486, [(84, 34, 28, 'GLASS_DP', 'DUSTY'), (122, 34, 28, 'GLASS_DP', 'DUSTY'), (160, 34, 28, 'GLASS_DP', 'DUSTY')])]:
    for (x, w, h, liq, cap) in items_:
        j += bottle(x, y - h, w, h, liq, cap)
j += [hl('M82 334L82 480', .5),
      path('M70 340V420', 'none', 'M', 'STEEL_HI'),
      flat('M180 328L206 328L206 348Z', 'HILITE', .35)]
write('juice', 'Холодильник соков и тоника (30-2), секция R. Проектная рамка 66, 292, 152 × 214: тёмный настольный бутылочный холодильник со стеклянной дверцей, три полки с бутылками сока и тоника, снежинка-иконка на панели, ножки. Проектные размеры ×1,10 через transform обёртки (data-wrap).', 66, 14, (66, 292, 152, 214), j)


# ---------------- whipper: 262, 328, 134 x 182
def siphon(cx, top, bot, w):
    hw = w / 2
    b = [path(f'M{cx - hw * 0.62:g} {top + 36:g}Q{cx - hw * 0.7:g} {top + 44:g} {cx - hw:g} {top + 58:g}V{bot - 3:g}Q{cx - hw:g} {bot:g} {cx - hw + 4:g} {bot:g}H{cx + hw - 4:g}Q{cx + hw:g} {bot:g} {cx + hw:g} {bot - 3:g}V{top + 58:g}Q{cx + hw * 0.7:g} {top + 44:g} {cx + hw * 0.62:g} {top + 36:g}Z', 'STEEL', 'M'),
         hl(f'M{cx - hw + 5:g} {top + 62:g}V{bot - 8:g}', .7),
         path(f'M{cx + hw - 5:g} {top + 62:g}V{bot - 8:g}', 'none', 'D', 'STEEL_SH'),
         ell(cx, top + 30, hw * 0.62 + 1, 13, 'STEEL_HI', 'M'),
         rect(cx - hw * 0.4, top + 24, hw * 0.8, 6, 'STEEL_SH', 'D', 2)]
    b.append(f'<g transform="rotate(-35 {cx - hw * 0.5:g} {top + 24:g})">' + rect(cx - hw * 0.5 - 4, top - 8, 8, 30, 'STEEL_HI', 'M', 3) + '</g>')
    nx = cx + hw * 0.35
    b += [rect(nx, top - 2, 6, 24, 'STEEL', 'D', 2),
          path(f'M{nx - 3:g} {top - 2:g}L{nx + 9:g} {top - 2:g}L{nx + 7:g} {top - 12:g}L{nx - 1:g} {top - 12:g}Z', 'STEEL_HI', 'D'),
          path(f'M{cx + hw * 0.2:g} {top + 22:g}Q{cx + hw * 1.2:g} {top + 26:g} {cx + hw * 1.25:g} {top + 48:g}', 'none', 'M')]
    return b


w = [shadow(328, 66)]
w += siphon(296, 340, 452, 34)
w += [path('M266 452H342L336 506H272Z', 'STEEL', 'M'), ell(304, 452, 38, 6, 'STEEL_HI', 'M'),
      path('M270 470H338', 'none', 'D', 'STEEL_SH'), path('M273 494H335', 'none', 'D', 'STEEL_SH'), hl('M274 458L279 500', .6),
      circ(267, 466, 4.5, 'STEEL_HI', 'D'), circ(341, 466, 4.5, 'STEEL_HI', 'D')]
for (x, y, s_) in [(274, 442, 12), (290, 438, 13), (306, 441, 12), (320, 443, 11), (283, 448, 10), (312, 447, 10)]:
    w.append(rect(x, y, s_, s_, 'PAPER', 'D', 2))
for x in [344, 352, 360]:
    w += [rect(x, 484, 7, 22, 'STEEL', 'D', 2), rect(x, 492, 7, 5, 'TERRA', 'D', 1)]
w += siphon(380, 360, 506, 28)
write('whipper', 'Сифон для пены (30-2), секция R. Проектная рамка 262, 328, 134 × 182: стальной сифон-кремер с зарядником, головкой, рычагом и носиком в ведёрке со льдом, второй сифон, три баллончика. ×1,10 через transform обёртки.', 262, 248.4, (262.5, 328, 135, 178), w)

# ---------------- 30-2б: общий порядок слоёв сосуда ----------------
# Правило (владелец): 1 задняя стенка/заливка стекла; 2 жидкость; (шарики лежат в жидкости); 3 трубочка; 4 контур стекла; 5 блик.
# Жидкость — многоугольник, вписанный внутрь внутреннего контура (отступ от линии стекла 2,6 px, от дна 2,6 px), плоский низ у дна.
import math

HALF = 1.4  # половина толщины контура M в проектных координатах (3 / 1,1 / 2)


def vessel(id_, top, bot, tl, tr, bl, br, fill='GLASS', liquid=None, balls=(), straws=(), shine=None, rim=None, extra_outline=()):
    def xl(y):
        return tl + (bl - tl) * (y - top) / (bot - top)

    def xr(y):
        return tr + (br - tr) * (y - top) / (bot - top)

    ix0, ix1 = min(tl, bl) + HALF, max(tr, br) - HALF
    iy0, iy1 = top + HALF, bot - HALF
    poly = f'M{tl:g} {top:g}L{tr:g} {top:g}L{br:g} {bot:g}L{bl:g} {bot:g}Z'
    g = [f'<g data-glass="{id_}" data-inner="{ix0:.2f} {iy0:.2f} {ix1 - ix0:.2f} {iy1 - iy0:.2f}">',
         f'<path data-layer="back" d="{poly}" fill="{col(fill)}" stroke="none"/>']
    if liquid:
        yl, c = liquid
        yb = bot - HALF - 1.2
        o = HALF + 1.2
        g.append(f'<path data-layer="liquid" d="M{xl(yl) + o:.2f} {yl:g}L{xr(yl) - o:.2f} {yl:g}L{xr(yb) - o:.2f} {yb:g}L{xl(yb) + o:.2f} {yb:g}Z" fill="{col(c)}" stroke="none"/>')
    g += list(balls)
    g += list(straws)
    g.append(f'<path data-layer="outline" d="{poly}" fill="none" stroke-width="{sw("M")}"/>')
    if rim:
        g.append(rim)
    g += list(extra_outline)
    if shine:
        g.append(f'<path data-layer="shine" d="{shine}" fill="none" stroke="{col("HILITE")}" stroke-opacity=".75" stroke-width="{sw("M")}"/>')
    g.append('</g>')
    return '\n'.join(g)


def straw(x, y, w, h, color, angle=0, jar=False, k='D'):
    cx, cy = x + w / 2, y + h
    tr_ = f' transform="rotate({angle:g} {cx:g} {cy:g})"' if angle else ''
    return f'<rect data-layer="straw"' + (' data-straw="jar"' if jar else '') + f' x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{min(1.2, w / 2):g}" fill="{col(color)}" stroke-width="{sw(k)}"{tr_}/>'


def ball(cx, cy, r):
    return (f'<circle data-layer="balls" data-ball="1" cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{col("CHOC")}" stroke-width="{sw("D")}"/>'
            f'<circle data-layer="balls" cx="{cx - r * 0.35:.2f}" cy="{cy - r * 0.35:.2f}" r="0.6" fill="{col("HILITE")}" fill-opacity=".85" stroke="none"/>')



# ---------------- blender: 552, 288, 133 x 218
bl_ = [shadow(612, 64),
       path('M556 506V478Q556 470 564 470H660Q668 470 668 478V506Z', 'PAPER', 'M'),
       path('M572 470L578 432H646L652 470Z', 'PAPER', 'M'),
       rect(552, 498, 120, 8, 'STEEL_SH', 'M', 3),
       circ(612, 486, 9, 'TERRA', 'M'), path('M612 480V486', 'none', 'D', 'PAPER'),
       hl('M570 476V498', .7),
       path('M590 428H632L628 436H594Z', 'STEEL_SH', 'M'),
       path('M648 322Q690 322 684 350Q680 392 640 410L636 400Q668 386 670 352Q671 336 646 336Z', 'GLASS', 'M'),
       vessel('blenderJug', 312, 428, 568, 650, 584, 636, 'GLASS', None, (), (straw(603, 318, 10, 92, 'PAPER', 0, False, 'D'),), 'M576 322L588 420'),
       path('M590 340H600M590 360H600M590 380H600M590 400H600', 'none', 'D'),
       path('M560 318Q560 298 609 298Q658 298 658 318Z', 'STEEL', 'M'), rect(588, 288, 42, 12, 'STEEL_SH', 'M', 4), hl('M568 312Q572 304 590 303', .7)]
write('blender', 'Блендер (30-2б), секция R. Проектная рамка 552, 288, 133 × 218: прозрачный кувшин (слои: стенка, пестик, контур, блик) с делениями и крышкой, ручка справа, светлая моторная база с поворотником. ×1,10 через transform обёртки.', 552, 466, (552, 288, 133, 218), bl_)

# ---------------- boba: 716, 384, 282 x 122
bo = [shadow(858, 142)]
# кастрюля: задний обод, сироп, шарики кучкой, передний край корпуса (скрывает нижние половины передних шариков), ручка-ушко, черпак опирается на обод
pot_balls = [(741.0, 450.2, 1.95), (749.5, 448.4, 2.05), (758.2, 450.6, 2.0), (767.0, 448.6, 1.93), (775.5, 450.4, 2.07), (753.8, 457.9, 2.0), (768.5, 457.9, 1.97)]
bo += ['<g data-pot="1" data-inner="718 446 96 13">',
       ell(766, 452, 50, 6, 'STEEL_HI', 'M'), ell(766, 452.3, 46, 4.2, 'DARK', 'D')]
bo += [ball(*b) for b in pot_balls]
bo += [path('M716 452A50 6 0 0 0 816 452V496Q816 506 806 506H726Q716 506 716 496Z', 'STEEL', 'M'),
       path('M720 453.5A46 4.6 0 0 0 812 453.5', 'none', 'D', 'STEEL_HI'),
       hl('M724 464V498', .6),
       rect(812, 459, 12, 7, 'STEEL_SH', 'D', 3),
       ell(795.5, 452.5, 5.2, 2.8, 'STEEL_HI', 'D'),
       path('M796 450.6L817.4 445L818.2 449L797 454.4Z', 'STEEL_SH', 'D'),
       '</g>']
# стакан бабл ти: молочный чай, шарики 2-3 рядами неровным слоем, одна толстая трубочка
cup_balls = [(838.5, 502.0, 2.0), (843.6, 502.4, 1.95), (848.1, 501.8, 2.05), (853.4, 502.2, 2.0), (858.0, 501.9, 1.97), (863.2, 502.3, 2.04),
             (841.0, 498.1, 2.0), (846.5, 498.6, 2.05), (851.9, 497.9, 1.95), (857.4, 498.4, 2.0),
             (844.2, 494.6, 2.0), (849.6, 494.1, 2.04), (855.1, 494.7, 1.96)]
bo.append(vessel('bobaCup', 414, 506, 826, 878, 832, 872, 'GLASS', (436, 'KRAFT'), [b for x in cup_balls for b in [ball(*x)]],
                 (straw(855, 384, 5.5, 118, 'PINK', 6),), 'M833 420L838 500', rim=ell(852, 414, 26, 4, 'GLASS_DP', 'D').replace('fill="{{GLASS_DP}}"', 'fill="none"')))
bo += [path('M884 506V458Q884 452 890 452H936Q942 452 942 458V506Z', 'TERRA', 'M'), rect(890, 462, 46, 8, 'PAPER', 'D', 3),
       path('M896 452V440Q896 434 902 434H934Q940 434 940 440V452Z', 'STEEL', 'M'), rect(918, 476, 12, 12, 'MUSTARD', 'D', 3), hl('M890 478V500', .5)]
# стакан с запасными трубочками: 7 тонких (2,6 px), лёгкий веер ±7°
jar_xs = [964.2 + i * 4.2 for i in range(7)]
jar_angles = [-4, -2.7, -1.3, 0, 1.3, 2.7, 4]
jar_len = [83, 80, 86, 84, 81, 85, 82]
jar_cols = ['PINK', 'MUSTARD', 'SAGE', 'DUSTY', 'TERRA', 'SAGE_LT', 'BAKE']
jar_straws = [straw(round(x - 1.3, 2), 502 - L, 2.6, L, c, a, True, 'D') for x, a, L, c in zip(jar_xs, jar_angles, jar_len, jar_cols)]
bo.append(vessel('strawJar', 436, 506, 956, 998, 956, 998, 'GLASS', None, (), jar_straws, 'M961 442V498',
                 rim=ell(977, 436, 21, 3.5, 'GLASS_DP', 'D').replace('fill="{{GLASS_DP}}"', 'fill="none"')))
write('boba', 'Станция бабл ти (30-2б), секция L (31-2: переехала из R). Проектная рамка 716, 384, 282 × 122: кастрюля (7 шариков кучкой, передний край скрывает нижние половины, черпак на ободе), стакан с молочным чаем (13 шариков неровным слоем, толстая трубочка), запайщик, стакан с 7 запасными тонкими трубочками (правый край 998). Порядок слоёв сосудов: стенка, жидкость, шарики, трубочки, контур, блик. ×1,10 через transform обёртки.', 716, 598, (716, 384, 282, 122), bo, 'art-src/side-l')

# ---------------- shaker: 1012, 408, 150 x 100
sh = [shadow(1087, 76),
      vessel('tinBig', 408, 506, 1014, 1056, 1020, 1050, 'STEEL', None, (), (), 'M1021 416L1026 498', rim=ell(1035, 408, 21, 4.5, 'STEEL_HI', 'M'), extra_outline=(path('M1048 416L1045 498', 'none', 'D', 'STEEL_SH'),)),
      vessel('tinSmall', 430, 506, 1068, 1100, 1062, 1106, 'STEEL', None, (), (), 'M1072 436L1068 498', rim=ell(1084, 430, 16, 3.6, 'STEEL_HI', 'M'), extra_outline=(path('M1098 438L1101 498', 'none', 'D', 'STEEL_SH'), path('M1064 498H1104', 'none', 'D', 'STEEL_SH'))),
      path('M1112 456H1132L1126 480L1130 506H1114L1118 480Z', 'STEEL', 'M'), ell(1122, 456, 10, 2.6, 'STEEL_HI', 'D'), path('M1116 480H1128', 'none', 'D', 'STEEL_SH'),
      ell(1139, 497, 10, 5, 'STEEL_HI', 'M'), path('M1131 497H1147', 'none', 'D', 'STEEL_SH'), rect(1148, 495, 14, 5, 'STEEL', 'D', 2.5)]
write('shaker', 'Шейкер (30-2б), секция R. Проектная рамка 1014, 403.5, 148 × 102.5: большой и малый (перевёрнутый) стальные стаканы (слои: стенка, контур, блик), джиггер-песочные часы, стрейнер с ручкой. ×1,10 через transform обёртки.', 1012, 677.8, (1014, 403.5, 148, 102.5), sh)

# ---------------- decor R: полка со стаканами 706, 176, 296 x 80 и ведёрко 1180.5, 424, 81 x 82
g = [rect(706, 246, 296, 10, 'WOOD', 'M', 3), path('M712 249H996', 'none', 'D', 'WOOD_HI')]


def shelf_glass(id_, x, w, h, liq=None, strw=None, wide=None):
    wb = wide or w * 0.8
    top = 246 - h
    bl = x + (w - wb) / 2
    br = x + (w + wb) / 2
    st = (straw(round(x + w * 0.55, 2), top - 8, 3.2, h + 3, strw, 0, False, 'D'),) if strw else ()
    return vessel(id_, top, 246, x, x + w, bl, br, 'GLASS', (round(246 - h * 0.62, 2), liq) if liq else None, (), st, f'M{x + 4:g} {top + 6:g}L{bl + 3:g} 240')


for i, args in enumerate([(718, 36, 60, 'MUSTARD', 'TERRA', 28), (764, 40, 44, None, None, 34), (816, 34, 58, 'PINK', None, 26),
                          (860, 44, 40, None, None, 36), (916, 36, 62, 'SAGE_LT', 'MUSTARD', 28), (962, 30, 54, None, None, 22)]):
    g.append(shelf_glass(f'shelfGlass{i + 1}', *args))

# ведёрко со льдом (30-4): стальное ведёрко с горкой льда и щипцами.
# ряды кубиков: (центр x, центр y, сторона, поворот); ряд выше опирается на два кубика ряда ниже (шаг по y 8,5 → перекрытие ≥ 20 % площади)
ICE_A = [(1200.5, 451, 15, -6), (1215.5, 451, 15, 4), (1230.5, 451, 15, -9), (1245.5, 451, 15, 7),
         (1208, 442.5, 15, 8), (1223, 442.5, 15, -5), (1238, 442.5, 15, 10),
         (1215.5, 434, 15, -10), (1230.5, 434, 15, 5)]


def cube(cx, cy, s_, rot):
    return (f'<rect data-ice="1" x="{cx - s_ / 2:g}" y="{cy - s_ / 2:g}" width="{s_:g}" height="{s_:g}" rx="3" fill="{col("GLASS")}" stroke-width="{sw("D")}" transform="rotate({rot} {cx:g} {cy:g})"/>'
            f'<path d="M{cx - s_ / 2 + 2.4:g} {cy - s_ / 2 + 3.4:g}L{cx - s_ / 2 + 2.4:g} {cy + 1:g}" fill="none" stroke="{col("PAPER")}" stroke-width="{sw("D")}" transform="rotate({rot} {cx:g} {cy:g})"/>')


def tongs(x1, y1, x2, y2):
    """Щипцы: две стальные дужки от головки к ободу, длина по оси 20–24 px (data-tongs = концы оси)."""
    return (f'<g data-tongs="{x1:g} {y1:g} {x2:g} {y2:g}">' + path(f'M{x1:g} {y1:g}L{x2:g} {y2:g}', 'none', 'M', 'STEEL_SH')
            + path(f'M{x1:g} {y1 + 2.6:g}L{x2:g} {y2 + 1.4:g}', 'none', 'D', 'STEEL') + ell(x1 - 1, y1 + 1, 2.4, 2, 'STEEL', 'D') + '</g>')


def bucket_a():
    k = ['<g data-bucket="A" data-rim="1193 447 60 10">',
         circ(1189, 468, 4.5, 'STEEL_HI', 'D'), circ(1257, 468, 4.5, 'STEEL_HI', 'D'),
         ell(1223, 452, 30, 5, 'STEEL_HI', 'M'), ell(1223, 452.4, 27, 3.2, 'STEEL_SH', 'D')]
    k += [cube(*c) for c in ICE_A]
    k += ['<g data-front="1">' + path('M1193 452A30 5 0 0 0 1253 452L1247 506H1199Z', 'STEEL_HI', 'M'),
          flat('M1197 484H1245L1246 498H1198Z', 'GLASS_DP'),
          path('M1196 486H1245', 'none', 'D', 'STEEL_SH'), path('M1197 496H1246', 'none', 'D', 'STEEL_SH'),
          hl('M1198 460L1202 500', .7)]
    for (dx, dy) in [(1206, 468), (1217, 476), (1237, 466)]:  # капли конденсата
        k.append(f'<path data-drop="1" d="M{dx} {dy - 1.8}Q{dx - 1.8} {dy + 0.6} {dx} {dy + 1.8}Q{dx + 1.8} {dy + 0.6} {dx} {dy - 1.8}Z" fill="{col("GLASS")}" stroke="{col("GLASS_DP")}" stroke-width="{sw("D")}"/>')
    k.append('</g>')
    k.append(tongs(1230, 438, 1249, 450))
    k.append('</g>')
    return k


def bucket_item():
    return item('iceBucket', (1183, 425, 79, 81), bucket_a())


# ---------------- 31-2: раковина с краном (декор, правый край): врезка в столешницу + кран на задней линии y 506. Проектная рамка 1000, 394, 173 x 162
def sink_item():
    k = [shadow(1086, 20, 508, 3),
         rect(1000, 510, 173, 46, 'STEEL_HI', 'M', 11),  # светлый обод, врезан в плоскость столешницы
         rect(1008, 516, 157, 33, 'DARK', 'D', 7),  # тёмная чаша
         flat('M1011 523Q1011 519 1015 519H1158Q1162 519 1162 523V527H1011Z', 'STEEL_SH'),  # дальняя стенка чаши
         ell(1086, 539, 9, 3, 'STEEL_SH', 'D'), ell(1086, 539, 3.5, 1.2, 'DARK', 'D'),  # слив
         hl('M1010 513H1150', .7), hl('M1004 520V544', .6, 'D'),  # блик на ободе
         path('M1006 552H1167', 'none', 'D', 'STEEL_SH'),  # передняя кромка
         ell(1086, 507, 15, 4, 'STEEL_HI', 'M'),  # основание крана
         path('M1079 500V422Q1079 394 1108 394H1126Q1149 394 1149 414V442H1135V416Q1135 405 1126 405H1108Q1093 405 1093 422V500Z', 'STEEL', 'M'),  # колонна и гусак
         hl('M1083 424V496', .6),
         rect(1133, 442, 18, 8, 'STEEL_SH', 'D', 2),  # носик
         path('M1079 474L1060 462L1064 456L1083 468Z', 'STEEL_SH', 'D'), circ(1061, 459, 4, 'STEEL_HI', 'D'),  # рычажок сбоку
         f'<path data-drop="1" d="M1142 453Q1139.4 458 1142 461.6Q1144.6 458 1142 453Z" fill="{col("GLASS")}" stroke="{col("GLASS_DP")}" stroke-width="{sw("D")}"/>']
    return item('sink', (1000, 394, 173, 162), k)


body = (f'<g data-wrap="glassShelf" transform="{T(706, 706, 176)}">\n' + item('glassShelf', (706, 176, 296, 80), g) + '\n</g>\n'
        + f'<g data-wrap="iceBucket" transform="{T(1182, 909.8, 506)}">\n' + shadow(1223, 36) + '\n' + bucket_item() + '\n</g>\n'
        + f'<g data-wrap="sink" transform="{T(1000, 1066, 506)}">\n' + sink_item() + '\n</g>\n')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 570" data-part="decor" data-scale="{S}">\n<!--\n  Декор правой секции (30-2б): полка со стаканами (проектная рамка 706, 176, 296 × 80; верх y 176; шесть стаканов по общему порядку слоёв) и стальное ведёрко со льдом (без полотенца) (30-4, проектная 1183, 425, 79 × 81). Окна нет. ×1,10 через transform обёрток data-wrap; рисуется в одной текстуре с фоном.\n-->\n'
       f'<g stroke="{col("INK")}" stroke-linejoin="round" stroke-linecap="round">\n{body}</g>\n</svg>\n')
open(f'{OUT}/decor.svg', 'w', encoding='utf-8', newline='').write(svg)
print('ok')
