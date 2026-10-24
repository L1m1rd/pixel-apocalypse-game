# Фасады с отдельной дверью

Шесть используемых фронтальных видов `house-0-0_5` … `house-5-0_5` переработаны встроенным `image_gen`: открытый центральный проём, без дверного полотна и запечённой падающей тени. Запросы и исходные файлы указаны в [generation-records.json](generation-records.json). Пиксельные координаты проёмов проверены по изображениям и сохранены в [door-openings.json](door-openings.json).

Это варианты канонического `world/house`, владелец — `environment-variants-v1/house`. Отдельная дверь использует существующее изображение владельца `world/door` из реестра; копия создаётся только при подготовке runtime. Новых игровых предметов и канонических ID нет.

Подготовка: `node tools/prepare-village-directions.cjs`. Сборка: `npm run build:web`. Проверка в Edge: `node tools/check-house-doors-web.cjs`. Визуальный отчёт и снимки находятся в `output/house-doors-review`.
