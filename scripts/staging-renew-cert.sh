#!/usr/bin/env bash
# Renew Let's Encrypt certificates and reload nginx. Safe to run from cron.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rybatskiy-mir}"
cd "$APP_DIR"

COMPOSE=(docker compose --env-file .env.staging -f docker-compose.staging.yml)

"${COMPOSE[@]}" --profile certbot run --rm certbot renew \
  --webroot -w /var/www/certbot \
  --quiet

"${COMPOSE[@]}" exec -T proxy nginx -s reload
