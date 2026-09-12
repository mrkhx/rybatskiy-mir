# Рыбацкий Мир

Онлайн-симулятор рыбалки. Многопользовательская браузерная игра для VK Mini Apps.

Слоган: **Лови. Исследуй. Соревнуйся.**

Это первый этап — технический фундамент. Игровые механики (рыбалка, турниры, клубы, магазины, экономика и т.д.) ещё не реализованы.

## Стек

- Frontend: React, TypeScript, Vite
- Admin: React, TypeScript, Vite
- Backend: Node.js, TypeScript, NestJS (модульный монолит)
- Database: PostgreSQL
- ORM: Prisma
- Cache / realtime infrastructure: Redis
- Realtime: Socket.IO
- Infra: Docker, Docker Compose, GitHub Actions
- Nginx — reverse proxy в staging/production; локально SPA-контейнеры сами раздают статику

## Структура

```text
/
  frontend/              клиент игры
  backend/               NestJS API
  admin/                 админ-панель
  docker/                Dockerfile, nginx SPA и reverse proxy
  docs/                  архитектура, deploy, backup, secrets, VK
  scripts/               backup/restore PostgreSQL
  .github/workflows/     CI и шаблон staging deploy
  docker-compose.yml
  docker-compose.staging.yml
  docker-compose.production.yml
  .env.example
  .env.staging.example
  .env.production.example
```

## Требования для локального запуска

- Node.js 22+
- npm 10+
- Docker и Docker Compose — для полного стека
- Git

## Запуск через Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

После старта:

- frontend: http://localhost:5173
- admin: http://localhost:5174
- backend: http://localhost:3000
- health: http://localhost:3000/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Backend применяет Prisma-миграции при старте контейнера.

## Запуск без Docker (разработка)

Нужны отдельно запущенные PostgreSQL и Redis, URL которых прописаны в `.env`.

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
```

В трёх терминалах:

```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
npm run dev --workspace=admin
```

## Переменные окружения

Все имена и безопасные примеры — в `.env.example`. Для сервера: `.env.staging.example`, `.env.production.example`.

Файлы `.env`, `.env.staging`, `.env.production` в Git не коммитятся.

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | PostgreSQL для Prisma |
| `REDIS_URL` | Redis |
| `JWT_SECRET` | Подпись сессий backend |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS |
| `ALLOW_DEV_AUTH` | Локальный вход без VK, только non-production |
| `VK_APP_ID` / `VK_APP_SECRET` | Будущая VK-авторизация, сейчас пустые |
| `VITE_API_URL` | URL API для клиента |
| `VITE_ADMIN_API_URL` | URL API для админки |

Production secrets в GitHub не хранятся. Секреты задаются только в окружении сервера.

## Prisma migrations

Схема: `backend/prisma/schema.prisma`.

Применённые миграции лежат в `backend/prisma/migrations/`.

```bash
# сгенерировать клиент
npm run prisma:generate

# применить миграции к текущей БД
npm run prisma:migrate

# создать новую миграцию в разработке (нужен доступ к PostgreSQL)
npm run prisma:migrate:dev --workspace=backend -- --name short_description
```

## Health endpoints

`GET /health` — подробный статус. HTTP 200 даже если PostgreSQL или Redis недоступны (`status: "degraded"`).

`GET /health/live` — liveness: процесс backend жив. Без проверки зависимостей.

`GET /health/ready` — readiness: PostgreSQL и Redis доступны. HTTP 503, если нет.

Пример `/health` и `/health/ready` при успехе:

```json
{
  "status": "ok",
  "backend": "ok",
  "database": "ok",
  "redis": "ok"
}
```

Через staging/production proxy те же пути доступны с края и как `/api/health*`.

## Ветки

- `main` — стабильная линия. Прямые изменения фундамента в неё не вносятся.
- `bootstrap` — ветка первого этапа. Весь каркас живёт здесь, пока не будет отдельно проверен и слит.

Автоматический merge `bootstrap` → `main` не выполняется.

## CI / CD

GitHub Actions (`.github/workflows/ci.yml`) на push и pull request:

- установка зависимостей
- TypeScript
- lint
- тесты
- сборка frontend, backend и admin

Шаблон будущего деплоя: `.github/workflows/deploy-staging.yml` (вручную, без SSH пока не заданы secrets).

Production deploy из CI пока не делается.

Документация:

- [docs/deployment.md](docs/deployment.md)
- [docs/secrets.md](docs/secrets.md)
- [docs/backups.md](docs/backups.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/vk-auth.md](docs/vk-auth.md)

## Безопасность

- `.env`, ключи, токены и пароли не коммитятся
- backend не пишет секреты в лог
- `ALLOW_DEV_AUTH=true` запрещён при `NODE_ENV=production` (процесс не стартует)
- VK production-авторизация не включена, пока нет реального приложения VK — см. `docs/vk-auth.md`
