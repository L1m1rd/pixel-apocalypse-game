# Заражённые — объединённый набор v5

Шесть заражённых в четырёх направлениях: south/west/east/north. **224 анимации персонажей, 1344 прозрачных кадра, 24 статичных тела. Отдельно 4 VFX, 24 кадра. С эффектами: 228 анимаций и 1368 кадров.**

Все 1152 прежних кадра и 192 анимации из [v4](../infected-animation-pack-v4/README.md) сохранены вместе с телами и настройками. Новые приёмы добавлены из [infected-specials-v1](../infected-specials-v1/README.md).

| Тип | Базовые действия | Дополнение |
|---|---|---|
| runner, stalker, clicker, shambler | idle, walk, run, attack, hurt, stunned, knockback, death | Без новых специальных атак |
| bloater | Те же восемь | throw_growth |
| rat-king | Те же восемь | charge_start, charge_loop, charge_impact, heavy_combo, ground_slam, phase2_roar, phase3_enrage |

Каждый приём — шесть кадров в каждом из четырёх ракурсов. Используйте `monster.frameOrder` из [manifest.json](manifest.json): число строк листа зависит от монстра (8/9/15). Имена и прямоугольники кадров задаёт `atlas.json`. Нельзя использовать общий номер строки для специального приёма всех монстров.

Размеры и origin сохранены: 64×64 у runner/stalker/clicker, 96×96 у bloater/shambler, 128×128 у rat-king, origin `(0.5, 0.875)`. 24 листа персонажей, 224 одиночных GIF и 56 сравнительных GIF. `corpse.png` совпадает с последним кадром смерти. В `fx` четыре листа/атласа эффектов, их кадры и GIF. Origin VFX `(0.5, 0.5)`.

## Просмотр

Откройте [preview.html](preview.html) локально. По умолчанию выбран топляк и его бросок. У Крысиного короля доступны семь новых движений; переходы фаз можно открыть отдельным фильтром. Эффекты показаны отдельно. В демонстрации приёмы повторяются, в JSON все новые приёмы однократны, кроме `charge_loop`. Пауза и шаг по кадрам позволяют проверить точки событий. Смерть удерживает последний кадр. Статичные тела также можно посмотреть в сохранённом просмотрщике v4.

## Phaser

Загрузку и регистрацию персонажей дополняют эффекты:

```js
// preload:
preloadInfected(this, 'assets/infected-animation-pack-v5');
preloadInfectedEffects(this, 'assets/infected-animation-pack-v5');
// create:
createInfectedAnimations(this);
createInfectedEffectAnimations(this);
const enemy = addInfectedSprite(this, 'bloater', 300, 200, 'east');
const unsubscribe = bindInfectedSpecialEvents(enemy, event => {
  if (event.name === 'projectile_release') {
    // Synchronize visual projectile with the server-approved attack instance.
  }
});
playInfectedSpecial(enemy, 'bloater', 'throw_growth', 'east');
// On authoritative impact: addInfectedEffect(this, 'spore_burst', impactX, impactY);
// Before removing/recycling enemy: unsubscribe();
```

Функции экспортируются из [phaser-infected.js](phaser-infected.js). События комбо на кадрах 2 и 4; выпуск нароста, удар по земле и пик перехода фазы — на кадре 3. Нумерация с нуля. `sockets.throw_hand` — центр ладони на выпуске, в локальных пикселях текстуры. Одно и то же событие не повторяется при повторных animationupdate одного кадра. При смерти новые спецприёмы и их события блокируются примером.

Три предлагаемые фазы в [boss-phases.json](boss-phases.json). Порог здоровья и доступность приёмов — предварительная спецификация. Код мира должен отдельно реализовать выбор атак, переходы фаз, движение тарана, полёт/коллизии снаряда, зоны спор и урон. Эти игровые и сетевые механики пока не реализованы; `rootMotion: false`.

## Источники и проверки

Полные запросы встроенного image_gen, исходники и исправленный лист VFX находятся в [дополнении](../infected-specials-v1/README.md). Предыдущие наборы сохранены. Для прежних четырёх типов без новых приёмов листы и кадры остаются такими же, как в v4; у топляка/босса новые строки добавлены снизу без изменения старой области атласов.

Проверки: [verification.json](verification.json). Архив: [infected-animation-pack-v5.zip](../../output/infected-animation-pack-v5.zip). Только новые приёмы: [infected-specials-v1.zip](../../output/infected-specials-v1.zip).
