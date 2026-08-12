#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required; this image supports PostgreSQL runtime only." >&2
  exit 1
fi

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo "DATABASE_URL must use the PostgreSQL protocol." >&2
    exit 1
    ;;
esac

exec "$@"
