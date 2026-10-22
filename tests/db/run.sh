#!/usr/bin/env bash
# Applies the Supabase stub + migrations to a throwaway database and runs the RLS suite.
# Usage: PGURL=postgres://postgres@127.0.0.1:54329 npm run test:db
set -euo pipefail
PGURL="${PGURL:-postgres://postgres@127.0.0.1:54329}"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
psql "$PGURL/postgres" -q -c "drop database if exists tlv_test" -c "create database tlv_test"
psql "$PGURL/tlv_test" -q -v ON_ERROR_STOP=1 -f "$DIR/tests/db/supabase_stub.sql"
for f in "$DIR"/supabase/migrations/*.sql; do psql "$PGURL/tlv_test" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$PGURL/tlv_test" -q -v ON_ERROR_STOP=1 -tA -f "$DIR/tests/db/rls_test.sql" 2>&1 | grep -E "ok -|FAIL|ERROR|PASSED" | sed "s/.*NOTICE:  //"
