# Секреты

Реальные значения не хранятся в Git. В репозитории только примеры: `.env.example`, `.env.staging.example`, `.env.production.example`.

Файлы `.env`, `.env.staging`, `.env.production` в `.gitignore`.

Первый staging: [staging-first-deploy.md](staging-first-deploy.md).

## Где что живёт

| Место | Что хранить |
|---|---|
| GitHub Actions Secrets | SSH на VPS + PAT для pull образов с GHCR |
| `/opt/rybatskiy-mir/.env.staging` | PostgreSQL, Redis, JWT, VK, публичный origin |
| Локальный `.env` | только development |

## GitHub Secrets (staging)

| Secret | Обязателен | Зачем |
|---|---|---|
| `STAGING_HOST` | да | IPv4 VPS без схемы |
| `STAGING_USER` | да | `deploy` |
| `STAGING_SSH_KEY` | да | приватный ключ пользователя `deploy` |
| `STAGING_PORT` | нет | по умолчанию `22` |
| `STAGING_APP_DIR` | нет | по умолчанию `/opt/rybatskiy-mir` |
| `GHCR_USERNAME` | нет | по умолчанию `mrkhx` |
| `GHCR_TOKEN` | да | PAT, **pull на VPS** |

### GITHUB_TOKEN или GHCR_TOKEN?

- **Push образов из Actions → GHCR:** встроенный `GITHUB_TOKEN` (`packages: write`). Отдельный secret не нужен.
- **Pull образов на VPS:** `GITHUB_TOKEN` туда нельзя (короткоживущий, не покидает GitHub). Нужен `GHCR_TOKEN`.
- Classic PAT: `read:packages` + `repo` (пакеты из приватного репозитория). Fine-grained: read packages + доступ к `mrkhx/rybatskiy-mir`.

Workflow не подключается по SSH, пока input `deploy=true` и заданы `STAGING_HOST` / `STAGING_USER` / `STAGING_SSH_KEY` / `GHCR_TOKEN`.

## Секреты приложения на сервере

Генерировать на VPS:

```bash
openssl rand -hex 32
```

| Переменная | Зачем |
|---|---|
| `POSTGRES_PASSWORD` | роль PostgreSQL; volume `postgres_data` |
| `REDIS_PASSWORD` | `requirepass`; Redis без volume, данные кэша можно потерять |
| `JWT_SECRET` | ≥ 32 символа; `openssl rand -hex 32` даёт 64 |
| `VK_APP_SECRET` | пусто до VK Mini App; не попадает во frontend |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS = `http://<PUBLIC_IP>` без хвоста `/` |

`DATABASE_URL` / `REDIS_URL` собирает `docker-compose.staging.yml` из `POSTGRES_*` и `REDIS_PASSWORD` (хосты `postgres` и `redis`).

## Правила

- Не коммитить `.env`, ключи, дампы, сертификаты, IP в репозиторий.
- Не логировать `JWT_SECRET`, `Authorization`, `VK_APP_SECRET`, `DATABASE_URL`, `GHCR_TOKEN`.
- `ALLOW_DEV_AUTH=true` при `NODE_ENV=production` останавливает backend.
- После утечки — ротация паролей и JWT, перевыпуск PAT и SSH-ключа.
