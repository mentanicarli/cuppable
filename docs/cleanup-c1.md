# Чистка репозитория C-1 (инвентарь и итог)

Дата: 2026-10-19. Игра, `src/`, `data/`, `art-src/`, `public/music`, `public/sfx`, `assets/sfx`, формат сохранений не менялись. Контрольная сумма `dist/artifact.html` до и после чистки одна и та же (см. конец документа).

Как искали ссылки: `grep` имени файла или папки по `CLAUDE.md`, `README.md`, `docs/`, `package.json`, `.github/workflows`, `src/`, `test/`, `e2e/`, `scripts/`. Размеры — байты файлов рабочей копии (в `.git` они остаются, история не переписывалась).

## (а) Кадры PNG

Ничто из сборки, тестов и workflow PNG не читает. Ссылаются только документы и комментарии «куда писать кадры» в e2e-скриптах (аргумент командной строки, не зависимость).

| Файл или папка | Размер | Что это | Кто ссылается | Решение | Почему |
|---|---|---|---|---|---|
| `docs/art/drinks/h1-2/` (95) | 12,7 МБ | кадры пилота Н1-2 | `spec.md`, `plan.md`, `CLAUDE.md` (как папка) | удалить | блок закрыт, этап Н завершён; ссылки в тексте переписаны |
| `docs/art/drinks/h1-3/` (62) | 15,1 МБ | кадры Н1-3 | `plan.md`, `CLAUDE.md`, комментарий в `drink_model_shot.js` | удалить | блок закрыт |
| `docs/art/drinks/h1-3b/` (71 из 72) | 17,1 МБ | посадка на блюдце | `decisions.md` п. 9 (`seat_sheet.png`) | удалить всё, кроме `seat_sheet.png` | лист на него ссылается живой документ; остальные кадры промежуточные |
| `docs/art/drinks/h2-1/` (90) | 23,8 МБ | кадры Н2-1 | `plan.md`, `decisions.md` | удалить | блок закрыт |
| `docs/art/drinks/h2-1b/` (12) | 8,2 МБ | кадры Н2-1б | `plan.md`, `decisions.md` | удалить | блок закрыт |
| `docs/art/drinks/h2-2/` (38) | 10,1 МБ | кадры Н2-2 | `plan.md`, `decisions.md` | удалить | блок закрыт |
| `docs/art/drinks/h2-3/` (36) | 10,3 МБ | кадры Н2-3 | `plan.md`, `decisions.md` | удалить | блок закрыт |
| `docs/art/drinks/h2-4/` (44 из 46) | 21,5 МБ | кадры Н2-4 | `table.md` (`all56_sheet.png`, `places_sheet.png`), `protein_shot.js` | удалить всё, кроме двух листов | итоговые листы 56 видов и мест рисования — эталон, `table.md` на них ссылается |
| `docs/art/drinks/*.png` (корень, 42 из 46) | 6,4 МБ | макеты масштаба, пузыря, билета, пилотов | `spec.md`, `decisions.md` (`scale_decided_x2.5_*`, `espresso_demitas_*`) | удалить всё, кроме `scale_decided_x2.5_{1x,2x}` и `espresso_demitas_{1x,2x}` | решение по масштабу и демитасу записано в `spec.md`, эти кадры его подтверждают |
| `docs/art/sections/b1-1 … b1-5/` (33) | 12,8 МБ | кадры приёмки Б1 | `CLAUDE.md`, `sections.md` разд. 14, комментарии `sections_*.js`, `coach_shot.js` | удалить | Б1 принят владельцем и запушен |
| `docs/art/sections/s_*.png` (6) | 1,6 МБ | проверка трёх разрешений макета | никто | удалить | нет ссылок |
| `docs/art/sections/*.png` (остальные 25) | около 5 МБ | макеты секций для блока 30 | `sections.md` разд. 3 (таблица) | оставить | живой дизайн-документ блока 30 описывает каждый кадр |
| `docs/art/remarks/*.jpg` (3) | 89 КБ | кадры замечаний владельца | `remarks/README.md`, `remarks-register.md` | оставить | дословные замечания владельца |
| `public/*.png` (2) | 33 КБ | `og.png`, `apple-touch-icon.png` | `index.html` | оставить | читает страница |

Итого PNG к удалению: 529 файлов, 139,7 МБ.

## (б) Скрипты `scripts/spike/` и `docs/art/tools/`

В `package.json` и workflow они не вызываются. Ссылки есть только в текстах.

| Файл | Кто ссылается | Решение | Почему |
|---|---|---|---|
| `b11-diff.cjs` | `CLAUDE.md`, `sections.md` | оставить | проверка «центр бара не изменился побитово» |
| `mockups.cjs`, `shoot-bar.cjs`, `texture-budget.cjs`, `ticket-width.cjs`, `zoom-tails.cjs` | `sections.md` | оставить | собирают оставленные макеты секций, нужны блоку 30 |
| `drinks-table.cjs`, `drinks-dump.cjs` | `table.md`; dump нужен table | оставить | генератор `table.md` |
| `h12-entry.ts`, `h13b-sheet.cjs`, `h24-sheet.cjs` | `CLAUDE.md`; entry нужен листам | оставить | пересобирают оставленные `seat_sheet.png` и `all56_sheet.png` |
| `h12-sheet`, `h12-shots`, `h12-perf`, `h21-sheet`, `h21b-pairs`, `h22-sheet`, `h23-sheet` | только `CLAUDE.md` (как способ получить удалённые кадры) | удалить | листы закрытых блоков |
| `drinks-art`, `drinks-barscale`, `drinks-ice-compare`, `drinks-pilots`, `drinks-shoot`, `drinks-specs`, `drinks-ticket-bubble` | друг на друга | удалить | макеты масштаба и пилотов Н0/Н1; цепочка замкнута сама на себя |
| `crop.cjs` | никто | удалить | одноразовая обрезка |
| `docs/art/tools/inventory.mjs` | `audit.md` | оставить | на него ссылается аудит |
| `docs/art/tools/bar_steps.cjs`, `shoot_all.cjs`, `make_sketches.mjs` | никто (кроме самих себя) | удалить | одноразовые, эскизы SVG остались |

## (в) Документы `docs/`

| Файл | Кто ссылается | Решение | Почему |
|---|---|---|---|
| `MIGRATION_PROMPT.md` | никто, сам помечен «Устарело» | удалить | история миграции, правила в `CLAUDE.md` |
| `PROMPT_visual_polish.md` | никто | удалить | старый промпт под прежнее название Chofix |
| `recipes_audit.md` | `CLAUDE.md`, `README.md`, генерируется `npm run audit:recipes` | оставить | производный, но на него ссылаются; пересборка одной командой |
| `art/audit.md`, `audit-systematic.md`, `stage-12-2.md` | `styleguide.md`, `remarks-register.md` | оставить, вопрос владельцу | живые ссылки из стайлгайда; история, но с замерами |
| `art/sketches/`, `art/layouts/` | `styleguide.md` | оставить | на них ссылается стайлгайд |
| `art/refs/README.md` | `styleguide.md` | оставить | правила папки референсов |

## (г) `docs/content/sources/*.docx`

Два файла, 2,5 МБ. Ссылается `docs/content/sources.md` (раздел «Источники»). Оставить: это исходники контента, на которые указывает документ.

## (д) Остальное

| Файл | Кто ссылается | Решение | Почему |
|---|---|---|---|
| `e2e/protein_shot.js` | никто | удалить | снимал кадры закрытого блока Н2-4 в удалённую папку |
| `e2e/closed_shot.js` | никто | удалить | одноразовый кадр пометки «закрыто» |
| `e2e/scene_shot.js` | никто | оставить, вопрос владельцу | инструмент для глаз, возможно ещё нужен |
| `e2e/abandon_refund.js` | никто | оставить | это тест денег (возврат расходов), правило «e2e только для денег» |
| `e2e/brand_png.js` | `docs/brand/README.md` (по смыслу) | оставить | делает `apple-touch-icon.png` |
| `*.dbg.html`, `*.seq.html`, `.bak` в git | — | нет таких | в `.gitignore`, не отслеживаются |
| `public/`, `assets/` | сборка, `make-audio.py` | оставить | все файлы используются |

## Итог

Выполнено по таблицам выше. Что поправлено в тексте: `CLAUDE.md` (абзацы Н и Б1, раздел «Работа с git», правило про кадры), `docs/art/drinks/{plan,decisions,spec,table}.md`, `docs/design/sections.md`, `.gitignore`.

Вопросы владельцу:

1. `docs/art/audit.md`, `audit-systematic.md`, `stage-12-2.md` (около 70 КБ текста): оставить как историю или убрать вместе с правкой ссылок в `styleguide.md`?
2. `e2e/scene_shot.js`: нужен ли?
3. `docs/art/remarks/README.md` описывает кадры 04–13, которых в репозитории никогда не было (`*.png` в `.gitignore`); `styleguide.md` ссылается на `remarks/13-undercounter-before.png`. Не трогал, ссылки остались старые.
4. `docs/art/remarks/README.md` и `styleguide.md` упоминают `e2e/art_before_after.js` и кадры вне репозитория: файла нет и до C-1, не трогал.

## Цифры до и после

| | до | после |
|---|---|---|
| `du -sh docs` | 157 МБ | 17 МБ |
| отслеживаемых PNG | 563 | 34 |
| файлов в `docs/` | 600 | 67 (с этим документом) |
| `size-pack` в `.git` | 179,47 МиБ | 179,47 МиБ (не изменится: история не переписывалась, файлы остались в ней) |

`sha256 dist/artifact.html` (релизная сборка, `npm run build`):

- до: `64cb85e672c32e1a0948285d20162188f0e5286507555d236f142d09fa1cacb0`
- после: `64cb85e672c32e1a0948285d20162188f0e5286507555d236f142d09fa1cacb0`

Проверено: `npm run check`, `lint:legacy`, `content:check`, `art:check`, `build` зелёные; `e2e/zones_test.js` (ALL OK) и `e2e/bar_test2.js latte` (served 1, NO_ERRORS) на отладочной сборке.
