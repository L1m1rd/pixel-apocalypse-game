# Ограниченный функциональный аудит

Оценка ниже относится только к выбранной матрице из 34 функций, а не ко всей Mini DAYZ 2 и не к визуальной идентичности. Все 24 обязательных пункта этой матрицы реализованы и проверены; 30 строк отмечены yes, одна partial, три no. Список ограничений сохраняется в отчёте.

Исследование использовало открытые описания и исторические скриншоты, а не полный ручной проход текущей мобильной версии. Числовой процент сходства изображений не вычислялся: сопоставимых кадров с одинаковым наполнением и состоянием нет. По трём просмотренным скриншотам проверены роли интерфейса: верхние общие ресурсы, улучшение постройки, сетка склада и отдельное управление рейдом. Графика и палитра собственной игры сохранены своими.

## Parity: 95.5 / 100

features 95.5  (34 counted, must-haves 24 of 24 done)

## By area, weakest first
- network                        0.0  (1 features)
- content                        0.0  (2 features)
- equipment                     50.0  (1 features)
- progress                     100.0  (1 features)
- camp                         100.0  (5 features)
- inventory                    100.0  (3 features)
- crew                         100.0  (3 features)
- raids                        100.0  (5 features)
- craft                        100.0  (2 features)
- combat                       100.0  (4 features)
- world                        100.0  (6 features)
- save                         100.0  (1 features)

## Missing, in build order
- [should] equipment: Weapon attachments and night vision, partial  (Two weapon upgrades and battery powered night module; original accessory catalogue not fully matched)
- [could] content: Exact original item and recipe catalogue, no  (Not implemented or not fully established by public research)
- [could] content: Exact original loot and server balance, no  (Not implemented or not fully established by public research)
- [could] network: Online cooperative raids, no  (Not implemented or not fully established by public research)


## Поведение и доказательства

Сценарии F01–F07 покрываются campaign.test.mjs и двумя сценариями окна Electron. Ручной проход всей кампании от нуля до финальной цели человеком не заявляется; конечное условие проверяется автоматизированным тестом. Итоговые результаты Windows EXE сохраняются отдельно в output/campaign-v010-review, отчёты проверки — verification.json, packaged-verification.json, edge-verification.json и edge-packaged-verification.json.
