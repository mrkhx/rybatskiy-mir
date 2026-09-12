# Unity-клиент «Рыбацкий Мир» — архитектура

Статус: **3D vertical slice STAGE 1 (runtime blockout)**, изолирован от web-прототипа.  
Web React (`frontend/`) = **LEGACY / PROTOTYPE CLIENT**. Не удалять.  
Unity (`clients/unity/RybatskiyMir3D/`) = кандидат в основной игровой клиент.

VK **не** центр архитектуры. Backend остаётся единственным источником истины.

## 0. Честно про эту поставку

Этот репозиторий собирается в среде **без Unity Editor**. Поэтому:

- проект и C# slice **есть в git** и открываются в Unity 6;
- Play Mode, скриншоты 3D, Windows/Android/WebGL билды здесь **не запускались**;
- web-preview по-прежнему показывает 2.5D прототип;
- рыбак — authored FBX `SM_Fisherman` (Humanoid, CC0 body + original clothes), **не** капсула;
- сцена — компактный runtime-blockout Лесного озера (чаша, мостик, сосны-конусы, камыш, кувшинки, коряги, волновая вода). Это промежуточная стадия art bible §12.1, не shipping-кадр.

Блокирующих архитектурных проблем нет: API рыбалки переиспользуется как есть, CORS для native не нужен, VK/WebGL сознательно отложен.

## 1. Зачем отдельный клиент

2.5D web-сцена доказала экономику, клёв и FSM. Она **не** даёт:

- ходьбу по берегу;
- вход на мостик;
- живую 3D-воду;
- удочку/леску/рыбу как объекты мира.

Vertical slice должен это доказать на **одной** точке: Лесное озеро → Старый мостик.

## 2. Что переиспользуем без изменений

| Слой | Переиспользуется |
|---|---|
| NestJS + Prisma + PostgreSQL + Redis | да, целиком |
| JWT (`Authorization: Bearer`) | да |
| REST `/auth`, `/players`, `/world`, `/fishing/*`, `/inventory`, `/shops` | да |
| Socket.IO `fishing:cast\|hook\|tick`, `fishing:state` | да, опционально |
| FSM `IDLE→READY→CAST→WAITING_BITE→BITE→HOOKED→FIGHTING→LANDED/LOST/BROKEN` | да |
| Умный клёв, вес, XP, садок, прикормка | да, только на сервере |
| Спот `old-bridge`, метод `FLOAT` | первый slice |

Unity **не** считает рыбу, вес, монеты, XP, инвентарь.

## 3. Целевые платформы (приоритет)

1. **Windows / Steam** — нативный игрок, главный proof качества.
2. **Android / Google Play** — нативный IL2CPP, touch + gamepad.
3. **iOS / App Store** — позже, тот же проект, другой player.
4. **VK / web** — **не** ломать текущий React. Unity WebGL — отдельный experiment, не blocker slice.

### WebGL / VK — честная оценка

| Тема | Оценка |
|---|---|
| CORS | Нужен для WebGL. Нативный Windows/Android CORS **не** использует. |
| Размер билда | URP + персонаж + вода легко 30–80 MB. VK Mini App это плохо переваривает. |
| Память | WebGL heap ограничен, iOS VK WebView ещё хуже. |
| Input | Touch ок, gamepad в iframe — лотерея. |
| Сокеты | Socket.IO в WebGL через WebSocket, с оговорками. |
| Вывод | **VK на старте остаётся на React.** 3D идёт в Steam/Android. WebGL — отдельный quality-tier LOW, только если пройдёт отдельный spike. |

## 4. Unity version и pipeline

| | |
|---|---|
| Editor | **Unity 6 LTS (6000.0.x)** — `ProjectVersion.txt` = 6000.0.38f1 |
| Pipeline | **URP 17** |
| Color | Linear, sRGB textures |
| Input | **Input System** (не legacy Input Manager) |
| Camera | third-person orbit + collision; Cinemachine 3 в манифесте на следующий проход |
| UI | compact IMGUI overlay (uGUI в манифесте) |
| Physics | Built-in 3D, CharacterController |
| Scripting | IL2CPP для Android/Windows shipping; Mono в Editor |

## 5. Структура репозитория

```
rybatskiy-mir/
  backend/                 # без изменений логики
  frontend/                # LEGACY 2.5D, живой
  admin/
  clients/
    README.md
    unity/
      README.md
      RybatskiyMir3D/      # сам Unity-проект (открывать ЭТУ папку)
        Assets/_Project/Scripts/{Net,Player,Camera,Input,Fishing,World,Hud,Audio}
        Packages/manifest.json
        ProjectSettings/
```

Unity-проект **не** в корне монорепо, чтобы `Library/` не засорял web-tooling.

## 6. Слои клиента

```
Presentation   HudOverlay, interact prompt
Gameplay       FishermanController, FishingDirector, Interact
View           FishermanBody, FishingGear (rod bones), Line, Float, FishActor, LakeWater, Atmosphere
Net            Auth/Profile/Fishing/Inventory/Economy/Realtime clients
Backend        NestJS (server authoritative)
```

Запрещено: `MonoBehaviour` с `UnityWebRequest` внутри `Update` рыбалки.  
Все HTTP/WS — только в `Net/*Client`.

## 7. Backend flow slice

1. `POST /auth/dev/session` (Editor) — **vkId только цифры**
2. `GET /players/me`
3. `GET /world` — clock, waterbody, spots → Atmosphere
4. Игрок подходит к `old-bridge` → Interact
5. `POST /fishing/start` `{ spotId: "old-bridge", method: "FLOAT" }`
6. Aim + force → pose CAST → `POST /fishing/cast`
7. Пока `WAITING_BITE`: `POST /fishing/bite` каждые ~0.9 с
8. `POST /fishing/hook` `{ timingMs }`
9. `POST /fishing/tick` каждый ~400 ms: `{ reel, rodPressure, rodDir, drag }`
10. `LANDED` → `POST /fishing/decide`
11. Снова free roam

Состояние сессии с сервера — единственный gameplay source. Клиентские анимации **интерполируют** это состояние, не подменяют исход.

## 8. Socket.IO

Handshake как у web:

```
auth: { token: "<jwt>" }
query: { token: "<jwt>" }   // fallback
события: fishing:cast, fishing:hook, fishing:tick
сервер → fishing:state, hello, live:record
```

Пакет: REST обязателен в slice; Socket.IO — `RealtimeClient` stub.

Нативный клиент бьёт в `http://<host>:3000` напрямую.  
Для Editor добавить origin в CORS **не нужно**.  
Для будущего WebGL — расширить список origin в `backend/src/main.ts` (отдельный маленький PR, не в этом slice).

## 9. Input (action-based)

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | WASD | Left stick | `SetTouchMove` (оверлей позже) |
| Look | Mouse | Right stick | Right drag |
| Sprint | Left Shift | LB | Sprint button |
| Interact | E | South | Interact button |
| Cast / Hook | LMB / Space | South | Cast button |
| Reel | Shift / RT | RT | Reel slider |
| Cancel | Esc / R | East | Back |

On-foot: **A = strafe left, D = strafe right**, W вперёд относительно yaw камеры (не vehicle-steer).

## 10. Quality tiers

| | LOW | MEDIUM | HIGH |
|---|---|---|---|
| Shadows | off | soft | soft |
| Water | 40 verts | 72 | 110 + pulse |
| Trees | 22 | 40 | 58 |
| Particles | rain off | rain | rain + storm flash |
| View dist | 80 m | 140 m | 220 m |

Android default: MEDIUM. Desktop: HIGH.

## 11. Риски

1. **Редактор Unity в текущей dev-среде недоступен** — Play Mode только локально.
2. Humanoid без FBX — промежуточный stylized rig, не shipping.
3. Вода — vertex waves + transparent URP Lit, не Gerstner+planar.
4. VK WebGL может так и не стать shipping-путём.
5. Нельзя допустить вторую симуляцию клёва в клиенте.
6. `POST /auth/dev/session` отклоняет нечисловой vkId.

## 12. Acceptance slice (локально в Unity 6)

Открыть проект, Play, dev-auth, пройти к мостику, забросить, получить bite с сервера, подсечь, выважить, получить Catch, отойти.

## 13. Следующий этап

1. Авторский мостик + берег (SM_OldBridge) вместо runtime planks.
2. Authored clips IDLE/WALK/RUN/SIT/CAST/FIGHT on the same Humanoid (procedural poses cover the slice).
3. Water asset (Gerstner + intersection foam + planar HIGH).
4. Socket.IO RealtimeClient вместо REST poll.
5. Android IL2CPP smoke.
6. Не трогать VK, пока натив не стабилен.
