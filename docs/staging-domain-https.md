# Staging: домен и HTTPS

Пока домена нет — **ничего не покупать, DNS не менять, сертификат не выпускать**.
Текущий staging по HTTP и публичному IP должен продолжать работать.

Способ TLS: **Let's Encrypt HTTP-01 (webroot) + Certbot в Docker + nginx reverse proxy**.
Приватный ключ живёт только на VPS в `/opt/rybatskiy-mir/letsencrypt/` (каталог в `.gitignore`).

## Поведение proxy

Контейнер `proxy` при старте:

1. Если `STAGING_DOMAIN` задан **и** есть
   `letsencrypt/live/<domain>/fullchain.pem` + `privkey.pem` → HTTPS.
2. Иначе → только HTTP (как сейчас, по IP).

После включения TLS:

| Вход | Что происходит |
|---|---|
| `http://DOMAIN/` (кроме ACME и `/health/live|ready`) | 301 → `https://DOMAIN/` |
| `https://DOMAIN/` `/admin/` `/api/` `/socket.io/` `/health/*` | приложение |
| `http://IP/` | HTTP без редиректа (health/deploy/откат) |
| `wss://DOMAIN/socket.io/` | тот же `/socket.io/` на 443 |

HSTS (`max-age=15552000; includeSubDomains`) ставится **только** на HTTPS-сервере. `preload` не включаем.

VK Mini Apps: **нет** `X-Frame-Options: DENY` и **нет** `SAMEORIGIN`. Вместо этого
`Content-Security-Policy: frame-ancestors 'self' https://vk.com https://*.vk.com https://vk.ru https://*.vk.ru https://web.vk.me`.
Полный CSP (`script-src` и т.д.) не задаём — сломает будущий VK JS SDK.

Frontend-образы уже собраны с `VITE_API_URL=/api` и `VITE_WS_URL=/` — после HTTPS браузер сам ходит на `/api` и `wss://` того же origin. Пересобирать из‑за домена не нужно.

## 1. DNS-записи

Когда домен куплен (подставьте имя только в DNS-панели, не в Git):

| Тип | Имя | Значение |
|---|---|---|
| `A` | `@` (apex) или нужный hostname (`staging`, `app`, …) | публичный IPv4 VPS |
| `AAAA` | не обязательно | только если есть стабильный IPv6 |

CNAME на другой hostname можно, если A уже указывает на VPS. CAA не обязателен.

Проверка с вашей машины (IP не коммитить):

```bash
dig +short A your-staging-domain.example
# должен совпасть с STAGING_HOST
```

## 2. Куда указывает A-record

На публичный IPv4 того же VPS, что уже в GitHub Secret `STAGING_HOST`.
Порты **80 и 443** должны быть открыты (UFW так и задуман).

Let's Encrypt ходит с интернета на `http://DOMAIN/.well-known/acme-challenge/`.
Пока A-запись не указывает на VPS, выпуск сертификата не удастся.

## 3. Как получить сертификат

На VPS, пользователь `deploy`, HTTP-стек уже задеплоен:

```bash
cd /opt/rybatskiy-mir
nano .env.staging
```

Выставить (без хвоста `/`):

```dotenv
STAGING_DOMAIN=your-staging-domain.example
LETSENCRYPT_EMAIL=you@example.com
PUBLIC_URL=https://your-staging-domain.example
FRONTEND_ORIGIN=https://your-staging-domain.example
ADMIN_ORIGIN=https://your-staging-domain.example
```

Не выключайте HTTP и не удаляйте IP-origin, пока HTTPS не проверен: можно сначала добавить `STAGING_DOMAIN` + email, выпустить сертификат, потом сменить origin на `https://…`.

```bash
chmod +x scripts/staging-issue-cert.sh scripts/staging-renew-cert.sh
./scripts/staging-issue-cert.sh
```

Скрипт: `certbot certonly --webroot`, затем `compose up -d --force-recreate proxy`
(entrypoint переключает конфиг на TLS).

## 4. Как проверить сертификат

```bash
echo | openssl s_client -connect your-staging-domain.example:443 -servername your-staging-domain.example 2>/dev/null | openssl x509 -noout -issuer -dates -subject
curl -fsSI https://your-staging-domain.example/health/live
```

Ожидается issuer Let's Encrypt, `HTTP/2 200` (или HTTP/1.1 200).

## 5. Автообновление

Certbot контейнер **не** крутится постоянно (profile `certbot`). Cron от `deploy`:

```bash
crontab -e
```

```cron
15 4 * * * /opt/rybatskiy-mir/scripts/staging-renew-cert.sh >> /opt/rybatskiy-mir/logs/certbot-renew.log 2>&1
```

```bash
mkdir -p /opt/rybatskiy-mir/logs
```

Проверка (dry-run):

```bash
cd /opt/rybatskiy-mir
docker compose --env-file .env.staging -f docker-compose.staging.yml \
  --profile certbot run --rm certbot renew --dry-run --webroot -w /var/www/certbot
```

Let's Encrypt обновляет примерно каждые 60 дней; cron раз в сутки достаточен.

## 6. Как изменить `.env.staging`

После успешного HTTPS:

```dotenv
PUBLIC_URL=https://your-staging-domain.example
FRONTEND_ORIGIN=https://your-staging-domain.example
ADMIN_ORIGIN=https://your-staging-domain.example
STAGING_DOMAIN=your-staging-domain.example
LETSENCRYPT_EMAIL=you@example.com
```

CORS на backend берёт `FRONTEND_ORIGIN` / `ADMIN_ORIGIN`. Браузер на `https://domain` и `https://domain/admin/` шлёт Origin `https://domain` (без `/admin`).

Пересоздать backend, чтобы подхватил origin:

```bash
cd /opt/rybatskiy-mir
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d backend proxy
```

## 7. Как перезапустить stack

Как обычно:

```bash
export IMAGE_TAG=<sha>
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --wait
```

или GitHub Actions **Deploy staging**. Сертификаты в bind-mount `./letsencrypt` переживают recreate. После recreate proxy снова включит TLS, если файлы на месте.

## 8. Как проверить HTTPS

```bash
curl -fsS https://your-staging-domain.example/health/live
curl -fsS https://your-staging-domain.example/health/ready
curl -fsS -o /dev/null -w '%{http_code}\n' https://your-staging-domain.example/
curl -fsS -o /dev/null -w '%{http_code}\n' https://your-staging-domain.example/admin/
curl -fsS https://your-staging-domain.example/api/health
curl -sI http://your-staging-domain.example/ | grep -i location
# Location: https://your-staging-domain.example/
```

В браузере: замок, заголовок «Рыбацкий Мир», `/admin/` — Admin.

## 9. Как проверить WSS

Со страницы `https://domain/` сокет идёт на `wss://domain/socket.io/`.

```bash
curl -fsS "https://your-staging-domain.example/socket.io/?EIO=4&transport=polling"
```

Ожидается payload Socket.IO (не HTML-редирект). В DevTools → Network → WS: `wss://…/socket.io/?EIO=4&transport=websocket`.

## 10. Откат

TLS выключается, если нет валидных файлов сертификата или опустошён `STAGING_DOMAIN`:

```bash
# временно выключить HTTPS, оставить HTTP по IP
# в .env.staging: STAGING_DOMAIN=
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --force-recreate proxy
```

Сертификаты лучше не удалять. Вернуть TLS: снова прописать `STAGING_DOMAIN` и recreate proxy.

HTTP по IP (`http://STAGING_HOST/`) при включённом TLS **не отключается** — default_server на :80. Если HTTPS сломан, staging по IP остаётся.

GitHub Secret `STAGING_PUBLIC_URL` задавайте **после** рабочего HTTPS:

```
https://your-staging-domain.example
```

До этого workflow проверяет `http://STAGING_HOST` (как сейчас). Не ставьте `https://…` в секрет, пока сертификат не выпускается — public health check упадёт.

## Новые GitHub Secrets

| Secret | Когда |
|---|---|
| `STAGING_PUBLIC_URL` | **необязательно**, после рабочего HTTPS. Значение `https://domain` без `/`. |

Пароли и ключ Let's Encrypt в GitHub **не** класть.

## Что не делать

- Не коммитить `letsencrypt/`, `*.pem`, `privkey.pem`.
- Не выпускать сертификат до корректного A-record.
- Не включать HSTS preload, пока домен не стабилен.
- Не ставить `X-Frame-Options: DENY`.
