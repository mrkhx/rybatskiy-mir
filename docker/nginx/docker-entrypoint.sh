#!/bin/sh
# Runs from the stock nginx image via /docker-entrypoint.d/.
# Selects HTTP-only or HTTPS config. Never prints certificate material.
set -eu

mkdir -p /var/www/certbot

DOMAIN="${STAGING_DOMAIN:-}"
if [ -n "$DOMAIN" ]; then
  case "$DOMAIN" in
    *[!A-Za-z0-9.-]*|.*|*.)
      echo "proxy: ignoring invalid STAGING_DOMAIN" >&2
      DOMAIN=""
      ;;
  esac
fi

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ -n "$DOMAIN" ] && [ -f "$CERT" ] && [ -f "$KEY" ]; then
  echo "proxy: TLS enabled"
  sed "s/__STAGING_DOMAIN__/${DOMAIN}/g" /etc/nginx/templates/https.conf \
    > /etc/nginx/conf.d/default.conf
else
  echo "proxy: HTTP only (certificate not present yet)"
  cp /etc/nginx/templates/http.conf /etc/nginx/conf.d/default.conf
fi

nginx -t
