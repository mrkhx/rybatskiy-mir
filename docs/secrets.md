# Секреты

Реальные значения не хранятся в Git. В репозитории только примеры: `.env.example`, `.env.staging.example`, `.env.production.example`.

Файлы `.env`, `.env.staging`, `.env.production` в `.gitignore`.

## Где что живёт

| Место | Что хранить |
|---|---|
| GitHub Actions Secrets | доступ к staging-серверу и GHCR для pull на VPS |
| `.env.staging` / `.env.production` на сервере | пароли PostgreSQL/Redis, JWT, VK |
| Локальный `.env` | только development |

Production secrets в GitHub можно не дублировать, если workflow не записывает `.env` на сервер.

## GitHub Secrets для будущего staging deploy

Задаются в Settings → Secrets and variables → Actions, когда появится VPS.

| Secret | Назначение |
|---|---|
| `STAGING_HOST` | IP или hostname VPS |
| `STAGING_USER` | SSH-пользователь |
| `STAGING_SSH_KEY` | приватный ключ (без passphrase или с ssh-agent на runner — лучше без passphrase, отдельный deploy-ключ) |
| `STAGING_PORT` | SSH-порт, обычно `22` |
| `STAGING_APP_DIR` | каталог приложения, по умолчанию `/opt/rybatskiy-mir` |
| `GHCR_USERNAME` | пользователь GitHub для `docker login ghcr.io` на VPS |
| `GHCR_TOKEN` | PAT с `read:packages` (для приватных образов GHCR) |

Workflow `.github/workflows/deploy-staging.yml` **не подключается к серверу**, пока не выставлен `STAGING_HOST` и не включён input `deploy`.

Образы на GHCR пушатся тем же workflow только при `push_images=true` или по git-тегу `staging-*`. Для push на GHCR достаточно `GITHUB_TOKEN` (packages: write).

## Секреты приложения на сервере

Копируются из примеров, значения генерируются на месте:

```bash
openssl rand -base64 32
```

| Переменная | Зачем |
|---|---|
| `POSTGRES_PASSWORD` | пароль роли PostgreSQL |
| `REDIS_PASSWORD` | `requirepass` Redis |
| `JWT_SECRET` | подпись сессий, **не короче 32 символов** |
| `VK_APP_SECRET` | только на backend, никогда во frontend |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS; при path-based proxy это публичный origin |

Пароли должны быть URL-safe (`A-Za-z0-9-_+`), потому что они подставляются в `DATABASE_URL` и `REDIS_URL`.

## Правила

- Не коммитить `.env`, ключи, дампы, сертификаты.
- Не логировать `JWT_SECRET`, `Authorization`, `VK_APP_SECRET`, `DATABASE_URL`.
- `ALLOW_DEV_AUTH=true` в `NODE_ENV=production` **останавливает запуск backend**.
- Dev-секрет `change-me-local-dev-only` в production тоже останавливает запуск.
- Frontend/admin получают только `VITE_*` на этапе сборки. Секреты туда не передавать.
- После утечки секрета — ротация паролей БД/Redis/JWT и инвалидация сессий.
