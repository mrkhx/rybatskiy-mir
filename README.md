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
- Nginx — в перспективе как reverse proxy (сейчас используется только для раздачи SPA в контейнерах)

## Структура

```text
/
  frontend/              клиент игры
  backend/               NestJS API
  admin/                 админ-панель
  docker/                Dockerfile и nginx SPA-конфиг
  docs/                  архитектура и VK TODO
  .github/workflows/     CI
  docker-compose.yml
  .env.example
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

Все имена и безопасные примеры — в `.env.example`.

Файл `.env` в Git не коммитится.

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

## Health endpoint

`GET /health`

Пример:

```json
{
  "status": "ok",
  "backend": "ok",
  "database": "ok",
  "redis": "ok"
}
```

Если PostgreSQL или Redis недоступны, `status` будет `degraded`, а соответствующее поле — `error`. Backend при этом остаётся источником правды и отвечает на запрос.

## Ветки

- `main` — стабильная линия. Прямые изменения фундамента в неё не вносятся.
- `bootstrap` — ветка первого этапа. Весь каркас живёт здесь, пока не будет отдельно проверен и слит.

Автоматический merge `bootstrap` → `main` не выполняется.

## CI

GitHub Actions (`.github/workflows/ci.yml`) на push и pull request:

- установка зависимостей
- TypeScript
- lint
- тесты
- сборка frontend, backend и admin

Production deploy из CI пока не делается.

## Безопасность

- `.env`, ключи, токены и пароли не коммитятся
- backend не пишет секреты в лог
- VK production-авторизация не включена, пока нет реального приложения VK — см. `docs/vk-auth.md`
