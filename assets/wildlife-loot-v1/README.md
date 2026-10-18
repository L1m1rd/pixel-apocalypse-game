# Дроп животных — визуалы v1

40 отдельных ресурсов для всех 20 видов животных, выбранных в варианте B. Предметы общего типа используют один ID и один визуал у нескольких видов. Графика создана встроенным image_gen; точные запросы — [generation-plan.json](generation-plan.json), исходники — sources, записи происхождения — records.

![Все ресурсы](overview.png)

[Просмотрщик](preview.html) · [Манифест](manifest.json) · [Соответствие дропа видам](loot-table.json) · [Каталог, лист 1](sheets/catalog-1.png) · [Лист 2](sheets/catalog-2.png)

| Животное | Ресурсы |
|---|---|
| Заяц | [Мясо мелкой дичи](art/small-game-meat.png), [Шкурка зайца](art/hare-pelt.png), [Мелкие кости](art/small-bones.png) |
| Белка | [Мясо мелкой дичи](art/small-game-meat.png), [Шкурка белки](art/squirrel-pelt.png), [Мелкие кости](art/small-bones.png) |
| Лиса | [Лисья шкура](art/fox-pelt.png), [Сухожилия](art/tendons.png), [Мелкие кости](art/small-bones.png) |
| Косуля | [Оленина](art/venison.png), [Шкура косули](art/roe-deer-hide.png), [Рожки косули](art/roe-antlers.png) |
| Олень | [Оленина](art/venison.png), [Оленья шкура](art/red-deer-hide.png), [Олений рог](art/deer-antler.png) |
| Кабан | [Мясо кабана](art/boar-meat.png), [Кабанья шкура](art/boar-hide.png), [Кабаньи клыки](art/boar-tusks.png), [Животный жир](art/animal-fat.png) |
| Волк | [Волчья шкура](art/wolf-pelt.png), [Волчьи клыки](art/wolf-fangs.png), [Сухожилия](art/tendons.png), [Крупная кость](art/large-bone.png) |
| Медведь | [Мясо медведя](art/bear-meat.png), [Медвежья шкура](art/bear-pelt.png), [Медвежьи когти](art/bear-claws.png), [Животный жир](art/animal-fat.png) |
| Бродячая собака | [Шкура собаки](art/dog-hide.png), [Крупная кость](art/large-bone.png), [Сухожилия](art/tendons.png) |
| Кошка | [Кошачья шкурка](art/cat-pelt.png), [Мелкие кости](art/small-bones.png), [Сухожилия](art/tendons.png) |
| Крыса | [Мелкая порция мяса](art/tiny-game-meat.png), [Крысиная шкурка](art/rat-pelt.png), [Мелкие кости](art/small-bones.png) |
| Ворона | [Мясо птицы](art/poultry-meat.png), [Перья вороны](art/crow-feathers.png), [Мелкие кости](art/small-bones.png) |
| Голубь | [Мясо птицы](art/poultry-meat.png), [Перья голубя](art/pigeon-feathers.png), [Мелкие кости](art/small-bones.png) |
| Воробей | [Мясо птицы](art/poultry-meat.png), [Перья воробья](art/sparrow-feathers.png), [Мелкие кости](art/small-bones.png) |
| Утка | [Мясо птицы](art/poultry-meat.png), [Утиные перья](art/duck-feathers.png), [Животный жир](art/animal-fat.png) |
| Лягушка | [Лягушачьи лапки](art/frog-legs.png), [Лягушачья кожа](art/frog-skin.png), [Мелкие кости](art/small-bones.png) |
| Рыба | [Рыбное филе](art/fish-fillet.png), [Рыбья чешуя](art/fish-scales.png), [Рыбьи кости](art/fish-bones.png) |
| Курица | [Мясо птицы](art/poultry-meat.png), [Куриные перья](art/chicken-feathers.png), [Мелкие кости](art/small-bones.png) |
| Коза | [Красное мясо](art/red-meat.png), [Козья шкура](art/goat-hide.png), [Козий рог](art/goat-horn.png) |
| Корова | [Красное мясо](art/red-meat.png), [Коровья шкура](art/cow-hide.png), [Животный жир](art/animal-fat.png), [Крупная кость](art/large-bone.png) |

## Файлы

art/*.png — 256×256; sprites/*.png — 64×64 для инвентаря; ground/*.png — 96×96 для предметов на земле. Всего 120 PNG. Прозрачные атласы и JSON в atlases; для предметов на земле pivot (0.5, 0.8333), для инвентаря (0.5, 0.5). Масштаб изображения задаёт только читаемость и не является физическим размером предмета.

Мясо и материалы изображены отдельными предметами без крови, целых туш и интерфейсных рамок. Шкуры соответствуют окрасу выбранных животных. Перья птиц, рога, клыки и когти имеют собственные визуалы. Кости, сухожилия, жир и некоторые пищевые ресурсы используются несколькими видами.

## Готовность

Это визуальные материалы и таблица соответствия ресурсам. Автоматическое выпадение, разделка, вероятность, количество, рецепты, пищевая ценность и применение ресурсов в игре ещё не реализованы. Таблица не назначает шанс и количество.

Сборка: node tools/build-wildlife-loot.cjs

Проверка: node tools/check-wildlife-loot.cjs

Архив: node tools/build-wildlife-loot.cjs --zip
