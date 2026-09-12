#!/bin/sh
# Restore a PostgreSQL custom-format dump into the Compose postgres service.
# Usage:
#   COMPOSE_FILE=docker-compose.production.yml ENV_FILE=.env.production ./scripts/pg-restore.sh backups/file.dump
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: $0 <dump-file>" >&2
  exit 1
fi

DUMP_FILE="$1"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

INPUT="$DUMP_FILE"
CLEANUP=""
if echo "$DUMP_FILE" | grep -q '\.gpg$'; then
  INPUT="$(mktemp)"
  CLEANUP="$INPUT"
  gpg --decrypt --output "$INPUT" "$DUMP_FILE"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  < "$INPUT"

if [ -n "$CLEANUP" ]; then
  rm -f "$CLEANUP"
fi

echo "Restore finished: $DUMP_FILE"
