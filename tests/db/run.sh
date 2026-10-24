#!/usr/bin/env bash
# Applies the Supabase stub + every migration (in deployment order) to a throwaway database and runs both RLS suites.
# Usage: PGURL=postgres://postgres@127.0.0.1:54329 npm run test:db
set -euo pipefail
PGURL="${PGURL:-postgres://postgres@127.0.0.1:54329}"
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
psql "$PGURL/postgres" -q -c "drop database if exists tlv_test" -c "create database tlv_test"
for f in tests/db/supabase_stub.sql supabase/migrations/001_init.sql supabase/migrations/002_course_catalogue.sql \
         supabase/seed_courses.sql supabase/migrations/003_memory_verses.sql supabase/production-hardening.sql \
         supabase/migrations/004_schools_courses_mentors.sql supabase/migrations/005_prayer_requests_and_member_points.sql; do
  psql "$PGURL/tlv_test" -q -v ON_ERROR_STOP=1 -f "$DIR/$f" > /dev/null
done
for t in rls_test.sql rls_004_test.sql rls_005_test.sql; do
  psql "$PGURL/tlv_test" -q -v ON_ERROR_STOP=1 -tA -f "$DIR/tests/db/$t" 2>&1 | grep -E "ok -|FAIL|ERROR|PASSED" | sed "s/.*NOTICE:  //"
done
