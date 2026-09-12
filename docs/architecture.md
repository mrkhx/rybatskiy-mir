# Архитектура

Монорепозиторий, модульный монолит. Микросервисы на этом этапе не используются.

Актуальный 3D-клиент: [UNITY_CLIENT.md](UNITY_CLIENT.md), арт: [3D_ART_BIBLE.md](3D_ART_BIBLE.md).

## Клиенты

| Приложение | Роль |
|---|---|
| `backend` | Авторитетный источник игровых данных. NestJS + Prisma + PostgreSQL + Redis + Socket.IO. |
| `frontend` | LEGACY 2.5D web / VK Mini App. React + Vite. **Не удалять.** |
| `clients/unity/RybatskiyMir3D` | 3D-клиент, vertical slice «Лесное озеро — Старый мостик». Windows / Android, позже iOS. |
| `admin` | Служебная панель. |

VK **не** архитектурный центр. Игровая логика клёва, веса, экономики, инвентаря и XP живёт только в `backend/`. Unity и web только отображают серверную `FishingSession`.

Инфраструктура: PostgreSQL (Prisma), Redis, Socket.IO, Docker Compose, Nginx reverse proxy (staging/production).

## Модули backend

- `health` — liveness / readiness
- `auth` — JWT, dev-session, контракт VK
- `player` — профиль, стартовый набор
- `world` — часы мира, водоём, виды
- `fishing` — server-authoritative FSM, умный клёв, fight, catch
- `inventory`, `shop`, `social`, `catalog`, `admin-api`
- `realtime` — Socket.IO handshake; `fishing.gateway` — live fishing ticks

## Данные

Prisma-схема покрывает игрока, каталог, водоёмы, сессии ловли, уловы, инвентарь. Расширение — новые миграции, без переписывания каркаса.

## Realtime

Socket.IO: `fishing:cast|hook|tick` → `fishing:state`. Web-клиент и будущий Unity RealtimeClient используют один протокол. REST покрывает тот же цикл (для Editor/slice без сокет-пакета).

## Staging / production

Публичная точка входа — Nginx reverse proxy. Подробности: [deployment.md](deployment.md), [staging-first-deploy.md](staging-first-deploy.md), [secrets.md](secrets.md), [backups.md](backups.md).

**Не деплоить Unity-slice и не сливать `full-game-development` в `main`/`staging` в этой итерации.**

## Будущее расширение

REGION → WATERBODY → EXPLORABLE 3D AREA. Не единый бесконечный open world. Между регионами — карта / транспорт / loading. Новые домены = новые NestJS-модули + миграции.
