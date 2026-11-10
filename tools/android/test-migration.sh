#!/usr/bin/env bash
# Runs tools/android/test-migration.sql against a throwaway PostgreSQL server (needs PostgreSQL 15+ installed).
# Usage: tools/android/test-migration.sh        (from the repository root)
set -euo pipefail
BIN="${PG_BIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}"
DIR="$(mktemp -d)"; PORT="${PGTEST_PORT:-54329}"
run() { if [ "$(id -u)" = 0 ]; then chown -R postgres "$DIR"; su postgres -s /bin/sh -c "$*"; else sh -c "$*"; fi; }
trap 'run "$BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
run "$BIN/initdb -D $DIR/data -U postgres -A trust" >/dev/null
run "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -c listen_addresses=localhost -k $DIR' -l $DIR/log -w start" >/dev/null
psql -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -f tools/android/test-migration.sql
