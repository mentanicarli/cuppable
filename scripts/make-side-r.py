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


def write(name, comment, x0, x1, box, body):
    fb = final(box, x0, x1)
    vx, vy = fb[0] - 8, fb[1] - 8
    vw, vh = fb[2] + 16, max(520, fb[1] + fb[3] + 8) - vy
    vb = f'{vx:.0f} {vy:.0f} {vw:.0f} {vh:.0f}'
    sh, body = body[0], body[1:]  # контактная тень лежит вне рамки предмета (в рамку не входит)
    wrap = f'<g data-wrap="{name}" transform="{T(x0, x1)}">\n{sh}\n{item(name, box, body)}\n</g>\n'
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" data-part="{name}" data-scale="{S}">\n<!--\n  {comment}\n-->\n'
           f'<g stroke="{col("INK")}" stroke-linejoin="round" stroke-linecap="round">\n{wrap}</g>\n</svg>\n')
    open(f'{OUT}/{name}.svg', 'w', encoding='utf-8', newline='').write(svg)


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
write('whipper', 'Сифон для пены (30-2), секция R. Проектная рамка 262, 328, 134 × 182: стальной сифон-кремер с зарядником, головкой, рычагом и носиком в ведёрке со льдом, второй сифон, три баллончика. ×1,10 через transform обёртки.', 262, 199.2, (262.5, 328, 135, 178), w)

# ---------------- foamer: 418, 350, 104 x 156
f = [shadow(470, 52),
     path('M424 478H516Q520 478 520 484V500Q520 506 514 506H426Q420 506 420 500V484Q420 478 424 478Z', 'PAPER', 'M'),
     rect(428, 498, 84, 6, 'STEEL_SH', 'D', 2),
     circ(470, 491, 8, 'MUSTARD', 'M'), hl('M426 484H510', .6, 'D'),
     '<g data-icon="foam">' + circ(449, 490, 2.6, 'TERRA', 'D') + circ(456, 486, 2, 'TERRA', 'D') + circ(452, 495, 1.8, 'TERRA', 'D') + '</g>',
     path('M434 384L430 474H508L504 384Z', 'STEEL', 'M'), hl('M440 392L437 468', .7),
     path('M498 392L502 466', 'none', 'D', 'STEEL_SH'),
     path('M504 396Q526 398 526 424Q526 448 506 452', 'none', 'L'),
     path('M504 396Q522 398 522 424Q522 444 506 448', 'none', 'D', 'STEEL_HI'),
     path('M434 384Q420 380 424 388L434 392Z', 'STEEL', 'D'),
     path('M432 384Q432 372 468 372Q504 372 504 384Z', 'STEEL_SH', 'M'),
     rect(448, 342, 40, 31, 'TERRA', 'M', 6), circ(468, 358, 5, 'MUSTARD', 'D'), hl('M454 349H472', .6, 'D')]
write('foamer', 'Миксер для пенок (30-2), секция R. Проектная рамка 418, 350, 104 × 156 (кувшин, ручка справа): стальной кувшин с крышкой и ручкой на светлой моторной базе с кнопкой и иконкой пузырьков. ×1,10 через transform обёртки.', 418, 364.6, (420, 342, 106, 164), f)

# ---------------- blender: 552, 288, 130 x 220
b = [shadow(612, 64),
     path('M556 506V478Q556 470 564 470H660Q668 470 668 478V506Z', 'PAPER', 'M'),
     path('M572 470L578 432H646L652 470Z', 'PAPER', 'M'),
     rect(552, 498, 120, 8, 'STEEL_SH', 'M', 3),
     circ(612, 486, 9, 'TERRA', 'M'), path('M612 480V486', 'none', 'D', 'PAPER'),
     hl('M570 476V498', .7),
     path('M584 428L568 312H650L636 428Z', 'GLASS', 'M'),
     flat('M572 340L580 428H642L646 340Z', 'GLASS_DP', .35),
     hl('M576 322L588 420', .8),
     path('M590 340H600M590 360H600M590 380H600M590 400H600', 'none', 'D'),
     rect(603, 318, 10, 92, 'PAPER', 'D', 3),
     path('M590 428H632L628 436H594Z', 'STEEL_SH', 'M'),
     path('M648 322Q690 322 684 350Q680 392 640 410L636 400Q668 386 670 352Q671 336 646 336Z', 'GLASS', 'M'),
     path('M560 318Q560 298 609 298Q658 298 658 318Z', 'STEEL', 'M'), rect(588, 288, 42, 12, 'STEEL_SH', 'M', 4), hl('M568 312Q572 304 590 303', .7)]
write('blender', 'Блендер (30-2), секция R. Проектная рамка 552, 288, 130 × 220: высокий прозрачный кувшин с делениями, пестиком и крышкой, ручка справа, светлая моторная база с поворотником и лезвиями. ×1,10 через transform обёртки.', 552, 497, (552, 288, 133, 218), b)

# ---------------- boba: 716, 388, 284 x 122
bo = [shadow(858, 142),
      path('M720 452H812Q816 452 816 458V496Q816 506 806 506H726Q716 506 716 496V458Q716 452 720 452Z', 'STEEL', 'M'),
      ell(766, 452, 50, 8, 'DARK', 'M'), hl('M724 462V498', .6),
      rect(796, 456, 24, 6, 'STEEL_SH', 'D', 3),
      path('M812 440L824 416', 'none', 'L'), ell(809, 446, 7, 4, 'STEEL_HI', 'D')]
for (x, y) in [(742, 450), (756, 453), (770, 449), (784, 453), (750, 455), (776, 455), (764, 456), (790, 450)]:
    bo.append(circ(x, y, 4.2, 'CHOC', 'D'))
bo += [path('M826 414L832 506H872L878 414Z', 'GLASS', 'M'),
       flat('M829.5 470H874.5L872.5 504H833.5Z', 'KRAFT'),
       hl('M833 420L838 500', .8)]
for (x, y) in [(842, 497), (852, 498), (862, 497), (847, 489), (857, 489), (867, 490), (852, 481)]:
    bo.append(circ(x, y, 4.4, 'CHOC', 'D'))
bo += [ell(852, 414, 26, 4, 'GLASS_DP', 'D'), rect(838, 396, 8, 26, 'PINK', 'M', 3), rect(850, 392, 8, 30, 'MUSTARD', 'M', 3), rect(862, 396, 8, 26, 'SAGE', 'M', 3),
       path('M884 506V458Q884 452 890 452H936Q942 452 942 458V506Z', 'TERRA', 'M'), rect(890, 462, 46, 8, 'PAPER', 'D', 3),
       path('M896 452V440Q896 434 902 434H934Q940 434 940 440V452Z', 'STEEL', 'M'), rect(918, 476, 12, 12, 'MUSTARD', 'D', 3), hl('M890 478V500', .5),
       path('M956 436H998V500Q998 506 992 506H962Q956 506 956 500Z', 'GLASS', 'M'), hl('M961 442V498', .7)]
for (x, c, top) in [(962, 'PINK', 392), (970, 'MUSTARD', 384), (978, 'SAGE', 390), (986, 'DUSTY', 386)]:
    bo.append(rect(x, top, 8, 106, c, 'D', 3))
bo.append(ell(977, 436, 21, 3.5, 'GLASS_DP', 'D'))
write('boba', 'Станция бабл ти (30-2), секция R. Проектная рамка 716, 388, 284 × 122: кастрюля с тёмными шариками и ложкой, высокий стакан с шариками и пучком толстых трубочек, запайщик стаканов, банка с трубочками (пучок x 956–998 входит в зону). ×1,10 через transform обёртки.', 716, 658, (716, 384, 282, 122), bo)

# ---------------- shaker: 1012, 408, 150 x 100
sh = [shadow(1087, 76),
      path('M1014 408H1056L1050 506H1020Z', 'STEEL', 'M'), ell(1035, 408, 21, 4.5, 'STEEL_HI', 'M'), hl('M1021 416L1026 498', .7), path('M1048 416L1045 498', 'none', 'D', 'STEEL_SH'),
      path('M1068 430H1100L1106 506H1062Z', 'STEEL', 'M'), ell(1084, 430, 16, 3.6, 'STEEL_HI', 'M'), hl('M1072 436L1068 498', .7), path('M1098 438L1101 498', 'none', 'D', 'STEEL_SH'), path('M1064 498H1104', 'none', 'D', 'STEEL_SH'),
      path('M1112 456H1132L1126 480L1130 506H1114L1118 480Z', 'STEEL', 'M'), ell(1122, 456, 10, 2.6, 'STEEL_HI', 'D'), path('M1116 480H1128', 'none', 'D', 'STEEL_SH'),
      ell(1139, 497, 10, 5, 'STEEL_HI', 'M'), path('M1131 497H1147', 'none', 'D', 'STEEL_SH'), rect(1148, 495, 14, 5, 'STEEL', 'D', 2.5)]
write('shaker', 'Шейкер (30-2), секция R. Проектная рамка 1012, 408, 150 × 100: большой и малый (перевёрнутый) стальные стаканы бостонского шейкера, джиггер-песочные часы, стрейнер с ручкой. ×1,10 через transform обёртки.', 1012, 988.4, (1014, 403.5, 148, 102.5), sh)

# ---------------- decor R: полка со стаканами 706, 176, 296 x 80 и ведёрко 1182, 424, 78 x 82
g = [rect(706, 246, 296, 10, 'WOOD', 'M', 3), path('M712 249H996', 'none', 'D', 'WOOD_HI')]


def glass(x, w, h, liq=None, straw=None, wide=None):
    wb = wide or w * 0.8
    d = f'M{x:g} {246 - h:g}L{x + (w - wb) / 2:g} 246H{x + (w + wb) / 2:g}L{x + w:g} {246 - h:g}Z'
    out = [path(d, 'GLASS', 'M')]
    if liq:
        out.append(flat(f'M{x + 1.5:g} {246 - h * 0.55:g}H{x + w - 1.5:g}L{x + (w + wb) / 2 - 1.5:g} 244.5H{x + (w - wb) / 2 + 1.5:g}Z', liq))
    out.append(hl(f'M{x + 4:g} {246 - h + 5:g}L{x + (w - wb) / 2 + 4:g} 240', .8, 'D'))
    if straw:
        out.append(rect(x + w * 0.55, 246 - h - 8, 4, h + 4, straw, 'D', 1.5))
    return out


g += glass(718, 36, 60, 'MUSTARD', 'TERRA', 28) + glass(764, 40, 44, None, None, 34) + glass(816, 34, 58, 'PINK', None, 26)
g += glass(860, 44, 40, None, None, 36) + glass(916, 36, 62, 'SAGE_LT', 'MUSTARD', 28) + glass(962, 30, 54, None, None, 22)
k = [shadow(1221, 40),
     path('M1186 452H1256L1248 506H1194Z', 'STEEL', 'M'), ell(1221, 452, 35, 6, 'STEEL_HI', 'M'), hl('M1194 460L1199 500', .7),
     path('M1196 486H1246', 'none', 'D', 'STEEL_SH'), path('M1197 494H1245', 'none', 'D', 'STEEL_SH'),
     circ(1185, 462, 4.5, 'STEEL_HI', 'D'), circ(1257, 462, 4.5, 'STEEL_HI', 'D')]
for (x, y, s_) in [(1196, 430, 13), (1210, 424, 14), (1226, 428, 13), (1240, 433, 12), (1204, 438, 11), (1230, 438, 11)]:
    k.append(rect(x, y, s_, s_, 'GLASS', 'D', 2.5))
k += [path('M1200 448Q1196 470 1203 490L1226 490Q1228 470 1222 448Z', 'PAPER', 'M'), path('M1200 466H1224M1201 476H1225', 'none', 'D', 'TERRA'),
      path('M1196 450H1228', 'none', 'M')]
body = (f'<g data-wrap="glassShelf" transform="{T(706, 706, 176)}">\n' + item('glassShelf', (706, 176, 296, 80), g) + '\n</g>\n'
        + f'<g data-wrap="iceBucket" transform="{T(1182, 1171.4, 506)}">\n' + k[0] + '\n' + item('iceBucket', (1180.5, 424, 81, 82), k[1:]) + '\n</g>\n')
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 520" data-part="decor" data-scale="{S}">\n<!--\n  Декор правой секции (30-2): полка со стаканами (проектная рамка 706, 176, 296 × 80; верх y 176) и ведёрко со льдом и полотенцем (проектная 1182, 424, 78 × 82). Окна нет (решение владельца). ×1,10 через transform обёрток data-wrap; рисуется в одной текстуре с фоном.\n-->\n'
       f'<g stroke="{col("INK")}" stroke-linejoin="round" stroke-linecap="round">\n{body}</g>\n</svg>\n')
open(f'{OUT}/decor.svg', 'w', encoding='utf-8', newline='').write(svg)
print('ok')
