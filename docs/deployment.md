# Развёртывание на одном VPS

Первый staging (Selectel, HTTP по IP, пользователь `deploy`): **[staging-first-deploy.md](staging-first-deploy.md)**.
Домен и HTTPS (после покупки имени): **[staging-domain-https.md](staging-domain-https.md)**.

Не запускать GitHub deploy без отдельного подтверждения.

Локальная разработка по-прежнему: `docker compose up --build` (файл `docker-compose.yml`, порты 5173/5174/3000/5432/6379). Не использовать локальный compose на staging VPS.

## Схема staging / production

Публично открыт только reverse proxy (HTTP, позже HTTPS).

```text
Internet
   │
   ▼
[nginx proxy :80]
   ├─ /              → frontend (SPA)
   ├─ /admin/        → admin (SPA, Vite base /admin/)
   ├─ /api/          → backend :3000  (префикс /api снимается)
   ├─ /socket.io/    → backend WebSocket
   └─ /health/live|ready → backend (для балансировщика)
        │
        ├─ network `front`: proxy, frontend, admin, backend
        └─ network `data`:  backend, postgres, redis
```

PostgreSQL и Redis портов на хост не публикуют. Backend с хоста тоже не публикуется.

Альтернатива с отдельными hostname (когда появится домен): `app.example.com` → frontend, `admin.example.com` → admin, `api.example.com` → backend. Path-based схема не требует домена и подходит для первого VPS.

Образы:

| Image | Dockerfile |
|---|---|
| `ghcr.io/mrkhx/rybatskiy-mir-backend` | `docker/backend.Dockerfile` |
| `ghcr.io/mrkhx/rybatskiy-mir-frontend` | `docker/frontend.Dockerfile` |
| `ghcr.io/mrkhx/rybatskiy-mir-admin` | `docker/admin.Dockerfile` |
| `ghcr.io/mrkhx/rybatskiy-mir-proxy` | `docker/proxy.Dockerfile` |

Теги: git SHA, `staging` / `production`, semver / `staging-*`.

## 1. Требования к VPS

- Ubuntu 24.04 LTS (или аналог)
- 2 vCPU, 2–4 GB RAM, 20+ GB SSD
- Docker Engine 24+ и Compose plugin v2
- Исходящий HTTPS (GHCR, будущий VK API)
- Отдельный пользователь без пароля, вход по SSH-ключу

## 2. Установка Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
```

Перелогиниться. Проверить: `docker compose version`.

## 3. Firewall

Открыть только:

- `22/tcp` — SSH (по возможности ограничить по IP)
- `80/tcp` — HTTP
- `443/tcp` — позже для HTTPS

Не открывать `5432`, `6379`, `3000`.

`ufw` пример:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 4. Clone / раскладка на сервере

```bash
sudo mkdir -p /opt/rybatskiy-mir
sudo chown "$USER":"$USER" /opt/rybatskiy-mir
git clone git@github.com:mrkhx/rybatskiy-mir.git /opt/rybatskiy-mir
cd /opt/rybatskiy-mir
git checkout bootstrap   # пока рабочая ветка
```

На сервере нужны как минимум: compose-файл, `.env.staging` или `.env.production`, Docker.

## 5. Environment

```bash
cp .env.staging.example .env.staging
# заполнить реальными паролями и PUBLIC_URL
```

`ALLOW_DEV_AUTH` должен быть `false`. `NODE_ENV=production` и для staging: так выключается dev-auth и скрывается внутренность ошибок.

Подробности: [secrets.md](secrets.md).

## 6. GHCR

Образы собирает workflow `Deploy staging` (opt-in push). На VPS:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

Имена пакетов должны быть lowercase. После первого push выдать пакету право read для deploy-бота.

## 7. Reverse proxy

Конфиг: `docker/nginx/reverse-proxy.conf`.

- gzip включён; brotli в стандартном `nginx:alpine` нет — не используем
- WebSocket: `Upgrade` / `Connection` для `/socket.io/`
- `client_max_body_size 2m`
- timeouts: connect 5s, read/send 60s, WS read 86400s
- security headers: `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP `frame-ancestors` (VK iframe). **Нет** `X-Frame-Options: DENY/SAMEORIGIN`.
- HSTS только на HTTPS-сервере, после появления сертификата

HTTPS: [staging-domain-https.md](staging-domain-https.md). Пока домена нет — HTTP :80. Proxy сам включает :443, когда на диске есть Let's Encrypt cert.

## 8. HTTPS

Пошагово: [staging-domain-https.md](staging-domain-https.md). Кратко: A-запись на VPS → `STAGING_DOMAIN` + `LETSENCRYPT_EMAIL` в `.env.staging` → `scripts/staging-issue-cert.sh` → origin на `https://…` → cron `staging-renew-cert.sh`. HTTP по IP не отключается.

## 9. Миграции

Backend-контейнер при старте выполняет `prisma migrate deploy` и затем `node dist/main.js`. Для одной реплики этого достаточно.

Не запускать `prisma migrate dev` на staging/production. Не откатывать миграции автоматически.

Перед накатом — backup, см. [backups.md](backups.md).

## 10. Backup

См. [backups.md](backups.md). Скрипты: `scripts/pg-backup.sh`, `scripts/pg-restore.sh`.

## 11. Rollback

Образы тегируются SHA. Откат приложения:

```bash
cd /opt/rybatskiy-mir
# предыдущий SHA, который уже есть в GHCR
export IMAGE_TAG=<previous-sha>
docker compose --env-file .env.staging -f docker-compose.staging.yml pull
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
curl -fsS http://127.0.0.1/health/ready
```

Ограничение: схема БД не откатывается вместе с образом. Поэтому миграции только расширяющие. Если новая миграция уже применилась, откат кода возможен только если старый код умеет работать с новой схемой.

## 12. Health check

| URL | Смысл | Неуспех |
|---|---|---|
| `GET /health/live` | процесс backend жив | 5xx → рестарт контейнера |
| `GET /health/ready` | PostgreSQL и Redis доступны | 503 → не слать трафик |
| `GET /health` | подробный статус, как раньше; 200 даже при `degraded` | |

Снаружи (через proxy) те же пути. API дублируется как `/api/health`, `/api/health/live`, `/api/health/ready`.

Compose healthcheck backend в staging/production использует `/health/ready`.

После деплоя:

```bash
curl -fsS http://127.0.0.1/health/live
curl -fsS http://127.0.0.1/health/ready
```

## Команды staging

```bash
docker compose --env-file .env.staging -f docker-compose.staging.yml pull
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
```

Production — то же с `docker-compose.production.yml` и `.env.production`.

## GitHub Actions

- `CI` (`.github/workflows/ci.yml`) — typecheck, lint, tests, builds. Без деплоя.
- `Deploy staging` — вручную. `deploy=true` дополнительно пушит образы (GITHUB_TOKEN) и по SSH тянет их на VPS (GHCR_TOKEN).

Чеклист человека: [staging-first-deploy.md](staging-first-deploy.md).

## Безопасность (чеклист)

- [ ] `.env*` не в Git
- [ ] PostgreSQL/Redis/backend не published
- [ ] `ALLOW_DEV_AUTH=false` в staging/production
- [ ] JWT ≥ 32 символов
- [ ] CORS только с `FRONTEND_ORIGIN` / `ADMIN_ORIGIN`
- [ ] 500 без stack trace (NODE_ENV=production)
- [ ] firewall 22/80/443
