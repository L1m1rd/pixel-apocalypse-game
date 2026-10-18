# Животные B — анимации v1

Выбран второй вариант B у всех 20 видов. Экспортировано 20 видов, 71 наборов действий, 284 анимаций в четырёх направлениях и 1704 прозрачных PNG-кадров. В каждой анимации шесть кадров. План: 71 набор действий / 284 анимации / 1704 кадра.

![Обзор](overview.png)

[Локальный просмотрщик](preview.html) работает без сервера после скачивания проекта. GIF из comparisons показывают четыре направления рядом: south, west, east, north. На GitHub HTML отображается как исходный код.

## Состав

- Заяц (B): [Ожидание](comparisons/hare-idle.gif), [Ходьба](comparisons/hare-walk.gif), [Бег](comparisons/hare-run.gif).
- Белка (B): [Ожидание](comparisons/squirrel-idle.gif), [Ходьба](comparisons/squirrel-walk.gif), [Бег](comparisons/squirrel-run.gif).
- Лиса (B): [Ожидание](comparisons/fox-idle.gif), [Ходьба](comparisons/fox-walk.gif), [Бег](comparisons/fox-run.gif).
- Косуля (B): [Ожидание](comparisons/roe_deer-idle.gif), [Ходьба](comparisons/roe_deer-walk.gif), [Бег](comparisons/roe_deer-run.gif), [Атака](comparisons/roe_deer-attack.gif) — атакующий моб.
- Олень (B): [Ожидание](comparisons/red_deer-idle.gif), [Ходьба](comparisons/red_deer-walk.gif), [Бег](comparisons/red_deer-run.gif), [Атака](comparisons/red_deer-attack.gif) — атакующий моб.
- Кабан (B): [Ожидание](comparisons/wild_boar-idle.gif), [Ходьба](comparisons/wild_boar-walk.gif), [Бег](comparisons/wild_boar-run.gif), [Атака](comparisons/wild_boar-attack.gif) — атакующий моб.
- Волк (B): [Ожидание](comparisons/wolf-idle.gif), [Ходьба](comparisons/wolf-walk.gif), [Бег](comparisons/wolf-run.gif), [Атака](comparisons/wolf-attack.gif) — атакующий моб.
- Медведь (B): [Ожидание](comparisons/brown_bear-idle.gif), [Ходьба](comparisons/brown_bear-walk.gif), [Бег](comparisons/brown_bear-run.gif), [Атака](comparisons/brown_bear-attack.gif) — атакующий моб.
- Бродячая собака (B): [Ожидание](comparisons/stray_dog-idle.gif), [Ходьба](comparisons/stray_dog-walk.gif), [Бег](comparisons/stray_dog-run.gif), [Атака](comparisons/stray_dog-attack.gif) — атакующий моб.
- Кошка (B): [Ожидание](comparisons/cat-idle.gif), [Ходьба](comparisons/cat-walk.gif), [Бег](comparisons/cat-run.gif).
- Крыса (B): [Ожидание](comparisons/rat-idle.gif), [Ходьба](comparisons/rat-walk.gif), [Бег](comparisons/rat-run.gif).
- Ворона (B): [Ожидание](comparisons/crow-idle.gif), [Ходьба](comparisons/crow-walk.gif), [Бег](comparisons/crow-run.gif), [Полёт](comparisons/crow-fly.gif).
- Голубь (B): [Ожидание](comparisons/pigeon-idle.gif), [Ходьба](comparisons/pigeon-walk.gif), [Бег](comparisons/pigeon-run.gif), [Полёт](comparisons/pigeon-fly.gif).
- Воробей (B): [Ожидание](comparisons/sparrow-idle.gif), [Прыжки по земле](comparisons/sparrow-walk.gif), [Бег](comparisons/sparrow-run.gif), [Полёт](comparisons/sparrow-fly.gif).
- Утка (B): [Ожидание](comparisons/duck-idle.gif), [Ходьба](comparisons/duck-walk.gif), [Бег](comparisons/duck-run.gif), [Полёт](comparisons/duck-fly.gif), [Плавание](comparisons/duck-swim.gif).
- Лягушка (B): [Ожидание](comparisons/frog-idle.gif), [Прыжок](comparisons/frog-jump.gif), [Плавание](comparisons/frog-swim.gif).
- Рыба (B): [Ожидание](comparisons/fish-idle.gif), [Плавание](comparisons/fish-swim.gif).
- Курица (B): [Ожидание](comparisons/chicken-idle.gif), [Ходьба](comparisons/chicken-walk.gif), [Бег](comparisons/chicken-run.gif), [Короткий перелёт](comparisons/chicken-fly.gif).
- Коза (B): [Ожидание](comparisons/goat-idle.gif), [Ходьба](comparisons/goat-walk.gif), [Бег](comparisons/goat-run.gif).
- Корова (B): [Ожидание](comparisons/cow-idle.gif), [Ходьба](comparisons/cow-walk.gif), [Бег](comparisons/cow-run.gif).

## Файлы

В animals/<вид>/<направление> находятся отдельные frames/*.png, полный spritesheet.png, atlas.json, animations.json, GIF previews и source-crops.json с исходными областями, точками привязки, масштабом и SHA-256. Манифест: [manifest.json](manifest.json).

Графика создана встроенным image_gen с выбранными B-образами в references. [Точные запросы и план](build-plan.json), [выбор обликов и ролей](selection.json), неизменённые исходники в sources, происхождение в records. Образы A/C не используются в анимациях и остаются в прежнем статичном наборе для истории.

Один игровой масштаб применяется ко всем действиям вида. Исправленные исходники предварительно калибруются по высоте исходного силуэта; коэффициент записан в sourceNormalization и неизменен для всего действия. Положение сохраняется для всей последовательности; отдельные кадры не центрируются заново. Сканер выделяет существующие силуэты целиком, сохраняя уши, хвосты и крылья за условной границей ячейки. Межкадровые позы не дорисовываются скриптом.

## Проигрывание и готовность

Ожидание и перемещение циклические. Прыжок лягушки, короткий перелёт курицы и атаки однократные. GIF повторяют их с паузой для просмотра; конфигурации движка задают repeat: 0. У атак отмечены предполагаемые активные кадры 2/3 (нумерация с нуля), момент удара — кадр 2. Это визуальные события, не реализация урона.

Атакующие виды по решению пользователя: бродячая собака, медведь, волк, кабан, олень и косуля. ИИ, поиск цели, физическое перемещение, агрессия, коллизии и нанесение урона ещё не реализованы. Все анимации выполнены на месте (rootMotion: false). Проверка в игровом движке остаётся отдельным этапом.

Экспорт: node tools/build-wildlife-animations.cjs

Проверка: node tools/check-wildlife-animations.cjs

Архив: node tools/build-wildlife-animations.cjs --zip — output/wildlife-animations-v1.zip. Скрипты экспортируют уже сгенерированные изображения.
