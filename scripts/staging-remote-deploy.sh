#!/usr/bin/env bash
# Runs on the staging VPS. Does not print secrets.
# Required: IMAGE_TAG, /opt/rybatskiy-mir/{docker-compose.staging.yml,.env.staging}
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/rybatskiy-mir}"
cd "$APP_DIR"

if [ -z "${IMAGE_TAG:-}" ]; then
  echo "IMAGE_TAG is required (commit SHA or previously published tag)" >&2
  exit 1
fi

if [ ! -f docker-compose.staging.yml ]; then
  echo "missing $APP_DIR/docker-compose.staging.yml" >&2
  exit 1
fi

if [ ! -f .env.staging ]; then
  echo "missing $APP_DIR/.env.staging — create it on the server before deploy" >&2
  exit 1
fi

if grep -q "STAGING_PUBLIC_IP\|CHANGE_ME_\|REPLACE_WITH_" .env.staging; then
  echo ".env.staging still contains placeholders. Fill real values on the server." >&2
  exit 1
fi

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USERNAME:-mrkhx}" --password-stdin
fi

export IMAGE_TAG
COMPOSE=(docker compose --env-file .env.staging -f docker-compose.staging.yml)

echo "Pulling images for IMAGE_TAG=${IMAGE_TAG}"
"${COMPOSE[@]}" pull

echo "Applying Prisma migrations (prisma migrate deploy)"
"${COMPOSE[@]}" run --rm -T backend npx prisma migrate deploy

echo "Starting stack"
"${COMPOSE[@]}" up -d --wait --wait-timeout 180

echo "Checking liveness"
curl -fsS --retry 8 --retry-delay 2 --retry-all-errors http://127.0.0.1/health/live
echo

echo "Checking readiness"
ready_code="$(curl -sS -o /tmp/rybatskiy-ready.json -w '%{http_code}' --retry 8 --retry-delay 2 http://127.0.0.1/health/ready || true)"
if [ "$ready_code" != "200" ]; then
  echo "readiness failed: HTTP ${ready_code}" >&2
  cat /tmp/rybatskiy-ready.json >&2 || true
  echo >&2
  "${COMPOSE[@]}" ps >&2 || true
  "${COMPOSE[@]}" logs --no-color --tail=120 backend postgres redis proxy >&2 || true
  exit 1
fi
cat /tmp/rybatskiy-ready.json
echo

echo "Checking frontend / admin / API / socket.io"
curl -fsS -o /dev/null -w "GET / -> %{http_code}\n" http://127.0.0.1/
curl -fsS -o /dev/null -w "GET /admin/ -> %{http_code}\n" http://127.0.0.1/admin/
curl -fsS -o /dev/null -w "GET /api/health -> %{http_code}\n" http://127.0.0.1/api/health
curl -fsS -o /dev/null -w "GET /socket.io -> %{http_code}\n" \
  "http://127.0.0.1/socket.io/?EIO=4&transport=polling"

echo "Staging deploy OK IMAGE_TAG=${IMAGE_TAG}"
