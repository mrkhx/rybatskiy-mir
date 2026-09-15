# Stage A: проверяемый промежуточный результат

Дата: 2026-09-15. **Stage A не принят; Stage B не начат.**
Это отчёт об изменениях кода, а не подтверждение готовой игровой сцены.
Пользователь отложил preview. Изменения находятся в локальной рабочей копии; публикация не выполнялась.

## Git

- Repository: https://github.com/mrkhx/rybatskiy-mir.git
- Branch: `full-game-development`
- CURRENT HEAD BEFORE: `672a390f510555d238b52f02148b78bb88648f65`
- Отдельный baseline commit: `e486cf89048e09408af61a89d4d0951f686c66da`
- Baseline message: `fix(frontend): restore executable build baseline`
- Integration message: `fix(frontend): stabilize old bridge 3d fisherman integration`
- NEW HEAD / COMMIT SHA: хеш integration commit указан в сообщении с этим отчётом; его можно получить через `git log -1`.

Получен настоящий writable Git checkout. Старые audit-snapshot/preview-work не использованы как исходники. Установлены зависимости через npm ci, выполнен prisma:generate. Исходные 39 ошибок TypeScript frontend устранены отдельным baseline commit; пустые CSS не добавлялись.

## Реализовано

- Один `useFishingVisualsFromSession` для Forest Lake и /dev/rig3d SERVER. DEBUG сохраняет ручные события.
- PRE-CAST 350 ms принадлежит состоянию AIM: вход в AIM и повторный ответ сервера не отменяют этот таймер.
- Ранний BITE ждёт окончания CAST / FLOAT LANDING. Клиентский таймер не генерирует поклёвку.
- HOOKED → FIGHTING не перезапускает таймер подсечки. Ранний LANDED не прерывает HOOKSET.
- REEL возвращается в FIGHT_LIGHT; KEEP/RELEASE возвращаются через существующий RETURN.
- Forest Lake запускает cast/hook/reel visual events после ответа API. Result HUD ждёт LAND/HOLD; новый cast блокируется до READY.
- Удалён диагностический отрезок RodTip → Jaw. Леска остаётся через FloatAttach и FloatBottom; до появления рыбы используется конец поводка.
- World points лески преобразуются в local space её parent перед записью geometry.
- Production fisherman/rod/float сохранены. Fish proxy остаётся debug. Backend и approved animation modules не изменены.

## Feet alignment и photo calibration

Подтверждённая причина исходной ошибки: внешнее фиксированное смещение привязывало origin персонажа, а не подошвы. Координаты изображения с cover/crop/overscan не участвовали в постановке.

`measureReadyFeet` клонирует production skinned model, проигрывает READY на отдельном AnimationMixer в момент 0, учитывает внутренний разворот π. Для вершин с суммарным skin weight >= 0.5 на соответствующей стопе или её дочерних костях получает skinned position и выбирает нижнюю точку каждой подошвы. Оригинальная модель не изменяется. Центр двух точек — `feetAnchor`.

Измерение реального fisherman.glb в нормализованном пространстве сцены:

| Точка | X | Y | Z |
|---|---:|---:|---:|
| Left sole | 0.023494565 | -0.000181426 | -0.177598561 |
| Right sole | -0.065425104 | -0.008130713 | 0.129065605 |
| feetAnchor | -0.020965270 | -0.004156070 | -0.024266478 |

Разница высоты подошв не устранена редактированием approved pose: средний anchor не доказывает одновременный контакт обеих стоп. Точную оставшуюся визуальную погрешность без рендера установить нельзя.

| Настройка | Текущее значение |
|---|---|
| stage.webp | 1792 × 1008, существующая фотография |
| oldBridgeStandingAnchor | u=0.34, v=0.555 — предварительная точка настила по исходному фото |
| cover | object-position 22% 62%, inset -2%, 104% overscan |
| feetOffset | 0 |
| scale | 0.24 |
| yaw | 0.06 rad сверх внутреннего π |
| camera position | [1.66, 1.4, -6.35] |
| camera lookAt | [1.66, 0.8, 0] |
| camera fov / near / far | 32° / 0.12 / 40 |
| cast photo anchor | u=0.55, v=0.65 — предварительно, видимая вода исходного фото |
| waterlineWorldY | 0 |
| castTargetWorld | пересечение луча через photo anchor с плоскостью waterline; пересчитывается при resize |

Положение персонажа рассчитывается как photo target на мировой плоскости минус повернутый и масштабированный feetAnchor. `RuntimeWaterContext` передаёт рассчитанные castTargetWorld/waterlineWorldY в LakeFloat. Для embedding начальная скорость заброса рассчитывается до водной цели; далее действует существующее приземление. После resize переносится сохранённая позиция поплавка относительно новой водной цели.

Development `?calib=1` предоставляет standing u/v, feetOffset, scale, yaw и метки photo target, обеих READY soles, origin, cast target / waterline. Метки подошв отражают опорную READY pose, а не динамическое измерение каждого кадра. Панель отсутствует в production. Её controls вынесены за декоративный Canvas, чтобы запрет pointer-events не блокировал их.

## Проверки

| Проверка | Результат |
|---|---|
| npm run typecheck | backend/frontend/admin проходят |
| npm run build | backend/frontend/admin проходят |
| frontend tests | 13 тестов, 7 файлов проходят |
| PRE-CAST polling + StrictMode + cleanup | тест пройден |
| 2 цикла KEEP / RELEASE без remount | тест контроллера пройден; подставленные серверные состояния, не live backend |
| Ранний LANDED во время HOOKSET | тест пройден |
| Production GLB feet measurement | тест пройден, модель не изменяется |
| Cover 1920×1080, 1366×768, 1280×720, 420×900 | математический тест UV пройден; визуальная устойчивость не принята |
| World/local леска | тест преобразования пройден |
| Баллистическая скорость cast | математический тест разных частот кадров пройден; runtime траектория визуально не принята |
| ?2d=1, ?3d=0, localStorage, env | тест feature flag пройден; live gameplay fallback не проверен |
| Другие spots | интеграция 3D туда не добавлена |
| /health, PostgreSQL, Redis, backend live | не проверены в этом этапе |
| /dev/rig3d live | не проверен |
| Forest Lake live / движение / screenshots | не проверены, preview отложен пользователем |
| Preview URL | отсутствует |

Остаются предупреждение Vite о большом JS chunk и ограничение jsdom Canvas в существующем App-тесте. Успешная сборка не является подтверждением производительности VK Mini App.

## Что ещё нужно до приёмки Stage A

1. **Код исправлен следующим коммитом, live-проверка остаётся:** проверка world/local координат конца вываживания: существующие prepFishWorld/landFishWorld и связанные float helpers используют начало координат standalone сцены. Перенесённый fisherman требует согласования этих расчётов с его placement frame. Исправление геометрии лески само по себе этого не решает.
2. Проверить масштаб world motion и контакт FloatWaterline/FloatBottom в новой трансформации. Текущие targets предварительные; math tests не доказывают контакт с фото-водой.
3. **Пауза таймеров реализована и проверена тестом.** Проверить живые анимации при скрытии/возврате вкладки.
4. Открыть обе реальные сцены, окончательно настроить стопы/масштаб/yaw/cast/water, проверить четыре размера окна.
5. Выполнить два живых server-driven цикла KEEP и RELEASE без reload, проверить 2D fallback и UI, сделать требуемые screenshots из Forest Lake.

Stage B и полная готовность всех пяти локаций этим коммитом **не заявляются**. Новые backgrounds, экономика, backend mechanics и production fish не добавлены.

## Изменённые файлы integration commit

- `docs/old-bridge-stage-a-progress.md`
- `frontend/src/App.tsx`
- `frontend/src/rig3d/FloatActor.tsx`
- `frontend/src/rig3d/Rig3DLab.tsx`
- `frontend/src/rig3d/Rig3DScene.tsx`
- `frontend/src/rig3d/fishingLine.test.ts`
- `frontend/src/rig3d/fishingLine.ts`
- `frontend/src/rig3d/runtimeWater.test.ts`
- `frontend/src/rig3d/runtimeWater.ts`
- `frontend/src/scene/ForestLakeFishing3D.tsx`
- `frontend/src/scene/Lake.tsx`
- `frontend/src/scene/OldBridgeCalibration.tsx`
- `frontend/src/scene/OldBridgePlacement.tsx`
- `frontend/src/scene/feetAnchor.test.ts`
- `frontend/src/scene/feetAnchor.ts`
- `frontend/src/scene/oldBridge3d.ts`
- `frontend/src/scene/photoSpace.test.ts`
- `frontend/src/scene/photoSpace.ts`
- `frontend/src/scene/use3DFisherman.test.ts`
- `frontend/src/scene/useFishingVisualsFromSession.test.tsx`
- `frontend/src/scene/useFishingVisualsFromSession.ts`

## Продолжение Stage A: frame вываживания и скрытая вкладка

CURRENT HEAD BEFORE этого продолжения: `4caf2c7b9a0a8c3f8a2b3bcb0046b0197953512c`.
Commit message: `fix(frontend): align fishing motion with placement and pause hidden transitions`.

- Добавлен MotionSpace: существующие расчёты FIGHT / LAND PREP / LAND / HOLD / KEEP / RELEASE выполняются в frame текущего fisherman, затем результат возвращается в world space. Водный ноль frame соответствует waterlineWorldY. Approved motion files не изменены.
- В том же frame рассчитываются поплавок и отделяющийся поводок. В embedding RETURN заканчивается на photo cast target, а не на константе лаборатории.
- Поворот fish proxy в embedding вычисляется относительно его parent. Координаты splash преобразуются в local space эффекта.
- Убраны четыре ошибочных сброса LandingSim внутри покадровой постановки Jaw: они стирали splash/tension во время LAND/HOLD/KEEP/RELEASE. Сбросы при смене состояния сохранены.
- При resize сохранённые world points рыбы переносятся с изменением placement frame; движения BITE/HOOK/FIGHT, длина поводка, hanging drop, гравитация и глубина keel учитывают масштаб embedding.
- Общий controller использует таймер видимого времени. Скрытие вкладки сохраняет остаток задержки, возврат продолжает её; unmount отменяет таймер и listener. Rig3DScene и FloatActor не продвигают анимацию в скрытой вкладке.

19 frontend-тестов проходят. Дополнительно проверены преобразованные траектории всех завершающих фаз, поводок до/после detach, перенос сохранённых точек при resize, масштаб bite offset, отсутствие изменения standalone samplers, пауза PRE-CAST при скрытии вкладки на 60 секунд и отмена скрытого таймера при unmount. Frontend production build проходит с прежним предупреждением о размере JS chunk.

Остаётся live gate: точный контакт обеих подошв, естественный масштаб и ориентация, попадание поплавка в воду, движения в обеих сценах, два настоящих backend-цикла, fallback и screenshots. Материалы, модели, background, backend, другие spots не изменены. Stage B не начат. Preview и push не выполнялись.

Изменённые файлы продолжения:

- `frontend/src/rig3d/motionSpace.ts`
- `frontend/src/rig3d/motionSpace.test.ts`
- `frontend/src/rig3d/runtimeWater.ts`
- `frontend/src/rig3d/Rig3DScene.tsx`
- `frontend/src/rig3d/FloatActor.tsx`
- `frontend/src/scene/OldBridgePlacement.tsx`
- `frontend/src/scene/visibleTransition.ts`
- `frontend/src/scene/visibleTransition.test.ts`
- `frontend/src/scene/useFishingVisualsFromSession.ts`
- `docs/old-bridge-stage-a-progress.md`

## Продолжение Stage A: порядок запросов сессии

CURRENT HEAD BEFORE: `3b472e9d87fa660406a90946c6b79035f2f4bb86`.
Commit message: `fix(frontend): serialize fishing session requests`.

Общий useFishingRequests используется Forest Lake и useServerFishing лаборатории. Запросы сессии выполняются последовательно: уже отправленный poll заканчивается до следующего действия. Фоновый poll не ставится в очередь, когда другой запрос ещё не завершён. Повторный запрос того же действия во время ожидания не отправляется; после ошибки очередь продолжает работу. Ответ после unmount не применяется.

Это устраняет перекрытие /bite, автоматического /tick и команд игрока, которое могло возвращать UI к устаревшему состоянию. KEEP и RELEASE используют общий ключ /decide, поэтому быстрое нажатие двух кнопок не отправляет два решения одновременно. В Forest Lake автоматический tick повторяется и в HOOKED, чтобы единичная ошибка первого tick не оставляла сессию без повторной попытки. Существующие параметры команд сохранены; backend не изменён.

Проверка: 22 frontend-теста проходят (10 файлов), включая порядок poll → recast, отсутствие накопления фоновых запросов, дедупликацию решения и восстановление после ошибки. Production frontend build проходит. Это тесты управляемых ответов, не два live backend-цикла. Предыдущие ограничения визуальной приёмки сохраняются.

Файлы: frontend/src/api/useFishingRequests.ts, frontend/src/api/useFishingRequests.test.ts, frontend/src/App.tsx, frontend/src/rig3d/useServerFishing.ts, этот отчёт. Изменения локальные, push и preview не выполнялись.

## Продолжение Stage A: смена ID серверной сессии

CURRENT HEAD BEFORE: `f4ddb310c9ce264b7a29f77a49b38d4d2de6543a`.
Commit message: `fix(frontend): preserve visual lifecycle across fishing sessions`.

Проверен реальный backend: /fishing/decide закрывает старую сессию и вызывает start, который создаёт новую. Backend оставлен без изменений.

Общий visual controller теперь различает переход на новый ID после подтверждённого KEEP/RELEASE и обычную замену сессии. В первом случае завершение улова и RETURN сохраняются. Во втором сбрасываются старые visual state, locks и completion flags, после чего восстанавливается текущее состояние сервера. Отсутствие сессии или отключение controller также очищает старую визуальную активность.

Callbacks CAST / LANDING / KEEP / RELEASE / RETURN проверяют ID активной сессии и допустимое состояние. Поздний callback старой сессии не может завершить новый заброс или сбросить его в READY. После повторного включения накопленные cast/reel/decision counters считаются уже обработанными; старые команды не воспроизводятся. Восстановленный LANDED показывает result после HOLD, а не до его начала.

В тесте двух циклов KEEP и RELEASE теперь используются разные ID после решения — как в реальном backend. Дополнительно проверены замена сессии во время PRE-CAST, поздние callbacks, задержка result при восстановлении LANDED и отключение/повторное включение controller.

Результат: 25 frontend-тестов проходят, 10 файлов. Frontend production build проходит; прежнее предупреждение Vite о размере chunk сохраняется. Live preview, реальные backend-циклы, screenshots и визуальная приёмка не выполнялись. Stage B не начат, push не выполнялся.

Изменённые файлы: frontend/src/scene/useFishingVisualsFromSession.ts, frontend/src/scene/useFishingVisualsFromSession.test.tsx и этот отчёт.
