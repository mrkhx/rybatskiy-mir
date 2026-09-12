#!/bin/sh
# Create a PostgreSQL custom-format dump from the Compose postgres service.
# Usage:
#   COMPOSE_FILE=docker-compose.production.yml ENV_FILE=.env.production ./scripts/pg-backup.sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
FILE="${BACKUP_DIR}/rybatskiy-mir-${STAMP}.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
  > "$FILE"

if [ "${ENCRYPT:-0}" = "1" ]; then
  if [ -z "${BACKUP_GPG_RECIPIENT:-}" ]; then
    echo "BACKUP_GPG_RECIPIENT is required when ENCRYPT=1" >&2
    exit 1
  fi
  gpg --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "${FILE}.gpg" "$FILE"
  rm -f "$FILE"
  FILE="${FILE}.gpg"
fi

echo "$FILE"
