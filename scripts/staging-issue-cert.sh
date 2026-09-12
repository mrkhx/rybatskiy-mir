#!/usr/bin/env bash
# Issue a Let's Encrypt certificate for STAGING_DOMAIN (HTTP-01 / webroot).
# Run on the VPS as deploy, after DNS A-record points at the VPS and HTTP :80 works.
# Does not print private keys.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rybatskiy-mir}"
cd "$APP_DIR"

if [ ! -f .env.staging ]; then
  echo "missing $APP_DIR/.env.staging" >&2
  exit 1
fi

DOMAIN="$(grep -E '^STAGING_DOMAIN=' .env.staging | tail -n1 | cut -d= -f2- | tr -d '[:space:]')"
EMAIL="$(grep -E '^LETSENCRYPT_EMAIL=' .env.staging | tail -n1 | cut -d= -f2- | tr -d '[:space:]')"

if [ -z "$DOMAIN" ]; then
  echo "Set STAGING_DOMAIN in .env.staging first" >&2
  exit 1
fi
if [ -z "$EMAIL" ]; then
  echo "Set LETSENCRYPT_EMAIL in .env.staging first" >&2
  exit 1
fi

mkdir -p letsencrypt certbot-www

COMPOSE=(docker compose --env-file .env.staging -f docker-compose.staging.yml)

echo "Issuing certificate for ${DOMAIN}"
"${COMPOSE[@]}" --profile certbot run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive

echo "Recreating proxy so it picks up TLS"
"${COMPOSE[@]}" up -d --force-recreate proxy

echo "Certificate issued. Check: curl -fsSI https://${DOMAIN}/health/live"
