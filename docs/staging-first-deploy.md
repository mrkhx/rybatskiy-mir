# Первый staging deploy (Selectel VPS)

Пока вы не подтвердите отдельно — **деплой не запускать**. Этот файл — чеклист человека.

Сервер: Ubuntu 24.04, Docker и Compose уже установлены. Домена нет: HTTP по публичному IP.

Каталог на VPS:

```text
/opt/rybatskiy-mir/
  docker-compose.staging.yml    # копирует GitHub Actions (можно положить и вручную)
  .env.staging                  # только на сервере, никогда в Git
  scripts/staging-remote-deploy.sh
  backups/
```

Исходный код на сервере не нужен. Образы: `ghcr.io/mrkhx/rybatskiy-mir-{backend,frontend,admin,proxy}`.

## 1. GitHub Secrets

Settings → Secrets and variables → Actions.

| Secret | Обязателен | Значение |
|---|---|---|
| `STAGING_HOST` | да | публичный IPv4 VPS, без `http://` |
| `STAGING_USER` | да | `deploy` |
| `STAGING_SSH_KEY` | да | приватный OpenSSH-ключ целиком (`-----BEGIN … PRIVATE KEY-----`) |
| `STAGING_PORT` | нет | `22` если не задан |
| `STAGING_APP_DIR` | нет | `/opt/rybatskiy-mir` если не задан |
| `GHCR_USERNAME` | нет | `mrkhx` если не задан |
| `GHCR_TOKEN` | да | PAT для **pull на VPS** |

`GITHUB_TOKEN` создавать не нужно. Actions им пушит образы в GHCR (`permissions.packages: write`).

`GHCR_TOKEN` нужен **только серверу**: `GITHUB_TOKEN` нельзя копировать на VPS (живёт один job). Classic PAT: scopes `read:packages` и `repo` (приватный репозиторий). Сохранить как GitHub Secret, не в Git.

Пароли БД / Redis / JWT **не** класть в GitHub Secrets — только в `/opt/rybatskiy-mir/.env.staging`.

## 2. Один раз на VPS (под root, затем проверить deploy)

Не отключать root SSH, пока вход под `deploy` не проверен вручную.

```bash
# --- пользователь deploy ---
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# вставить публичный ключ (тот, чья пара уйдёт в STAGING_SSH_KEY):
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# --- каталог приложения ---
mkdir -p /opt/rybatskiy-mir/backups /opt/rybatskiy-mir/scripts
chown -R deploy:deploy /opt/rybatskiy-mir
chmod 750 /opt/rybatskiy-mir

# --- firewall: только 22/80/443 ---
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

Не публиковать `3000`, `5173`, `5174`, `5432`, `6379`. Staging compose их не пробрасывает; не запускать локальный `docker-compose.yml` на этом VPS.

## 3. Ключ SSH (на своей машине)

```bash
ssh-keygen -t ed25519 -f rybatskiy-mir-staging-deploy -N ""
```

- `rybatskiy-mir-staging-deploy.pub` → `/home/deploy/.ssh/authorized_keys`
- содержимое `rybatskiy-mir-staging-deploy` → secret `STAGING_SSH_KEY`

Проверка (подставьте IP только в команде, не в Git):

```bash
ssh -i rybatskiy-mir-staging-deploy -o IdentitiesOnly=yes deploy@STAGING_PUBLIC_IP 'whoami && docker compose version && sudo -n true || true'
```

Ожидается: `deploy`, версия Compose. `sudo` для деплоя не нужен.

## 4. `.env.staging` на сервере

Под `deploy`:

```bash
nano /opt/rybatskiy-mir/.env.staging
chmod 600 /opt/rybatskiy-mir/.env.staging
```

Шаблон (секреты сгенерировать на сервере, не копировать из чата):

```bash
openssl rand -hex 32   # POSTGRES_PASSWORD
openssl rand -hex 32   # REDIS_PASSWORD
openssl rand -hex 32   # JWT_SECRET
```

```dotenv
NODE_ENV=production
ALLOW_DEV_AUTH=false
IMAGE_TAG=staging
HTTP_PORT=80

PUBLIC_URL=http://STAGING_PUBLIC_IP
FRONTEND_ORIGIN=http://STAGING_PUBLIC_IP
ADMIN_ORIGIN=http://STAGING_PUBLIC_IP

POSTGRES_USER=rybatskiy
POSTGRES_PASSWORD=
POSTGRES_DB=rybatskiy_mir

REDIS_PASSWORD=

JWT_SECRET=
JWT_EXPIRES_IN=7d

VK_APP_ID=
VK_APP_SECRET=
VK_API_VERSION=5.199
```

`FRONTEND_ORIGIN` / `ADMIN_ORIGIN` — как в браузере, **без** `/` на конце: `http://x.x.x.x`.

`DATABASE_URL` и `REDIS_URL` собирает compose (`postgres` / `redis` внутри Docker-сети).

Плейсхолдеры `STAGING_PUBLIC_IP` и `REPLACE_WITH_*` скрипт деплоя отвергает.

## 5. Prisma

Backend-образ при старте делает `prisma migrate deploy` (не `migrate dev`).
Скрипт деплоя вызывает `migrate deploy` явно **до** `compose up`. Команда идемпотентна. Volume `postgres_data` переживает рестарт контейнера; `docker compose down -v` уничтожит БД.

## 6. Как запустить deploy

1. Secrets заданы, `deploy` входит по ключу, `.env.staging` заполнен.
2. GitHub → Actions → **Deploy staging** → Run workflow:
   - branch: `bootstrap`
   - `push_images`: true
   - `deploy`: true
   - `image_tag`: пусто (будет commit SHA)

Job `deploy` не стартует, пока `deploy != true`. Если secrets пустые — падает до SSH.

Первый прогон без `deploy=true`, только `push_images=true`, можно использовать чтобы создать пакеты GHCR, затем второй прогон с `deploy=true`.

## 7. Что должно открыться

После успешного workflow (подставьте IP в браузере, не в репозиторий):

| URL | Ожидание |
|---|---|
| `http://IP/` | стартовая страница игры «Рыбацкий Мир» |
| `http://IP/admin/` | Admin |
| `http://IP/api/health` | JSON статуса |
| `http://IP/health/live` | `{"status":"ok","backend":"ok"}` |
| `http://IP/health/ready` | `status: ok`, HTTP **200** |
| `http://IP/socket.io/?EIO=4&transport=polling` | ответ Socket.IO |

## 8. Проверки

На VPS:

```bash
curl -fsS http://127.0.0.1/health/live
curl -fsS http://127.0.0.1/health/ready
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1/admin/
curl -fsS http://127.0.0.1/api/health
```

Снаружи:

```bash
curl -fsS http://STAGING_PUBLIC_IP/health/live
curl -fsS http://STAGING_PUBLIC_IP/health/ready
```

`live` и `ready` должны быть HTTP 200. `ready` = 503, если PostgreSQL или Redis недоступны — деплой считается неуспешным.

## 9. Rollback

Образы тегируются SHA. Тег `staging` плавающий.

```bash
ssh deploy@STAGING_PUBLIC_IP
cd /opt/rybatskiy-mir
export IMAGE_TAG=<previous-sha>
export GHCR_USERNAME=mrkhx
# GHCR login уже есть в ~/.docker после первого деплоя
./scripts/staging-remote-deploy.sh
```

Или Actions → Deploy staging → `image_tag` = предыдущий SHA, `push_images=false`, `deploy=true` (образ уже в GHCR).

Схема БД **не** откатывается. Пока миграция одна (`User`) — откат образа безопасен. Не делать `compose down -v`.

## 10. Что делает человек вручную

1. Создать пользователя `deploy` + SSH-ключ.
2. Firewall 22/80/443.
3. Каталог `/opt/rybatskiy-mir` и `.env.staging`.
4. Записать GitHub Secrets (без паролей приложения).
5. Создать PAT `GHCR_TOKEN`.
6. Проверить SSH под `deploy`.
7. Запустить workflow, когда будет отдельное подтверждение.
8. Открыть `http://IP/` и health-URL.
9. Root SSH пока не отключать.
