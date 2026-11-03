#!/bin/bash
# ============================================================================
# Database-tier test runner (pgTAP).
#
# Runs every supabase/tests/database/[0-9]*.sql against the local Supabase
# database inside its own transaction (each file does BEGIN ... ROLLBACK),
# parses TAP output and fails if any test fails or any file errors out.
#
# Requirements:
#   * Local stack running:  supabase start && supabase db reset
#     (db reset also applies supabase/seed.sql, which several suites rely on
#      for the canonical plan capability matrix)
#   * Nothing extra to install: pgTAP lives in the bundled postgres image.
#
# Portable bash 3.2 (macOS): no mapfile, no associative arrays.
#
# Usage:  ./supabase/tests/run-database-tests.sh [file-pattern]
#         ./supabase/tests/run-database-tests.sh            # all suites
#         ./supabase/tests/run-database-tests.sh 07_*       # one suite
# ============================================================================

set -u

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEST_DIR="$REPO_ROOT/supabase/tests/database"

DB_HOST_PORT="${SUPABASE_DB_PORT:-55322}"
DB_NAME="postgres"
DB_USER="postgres"

# This repo's local stack id (override when multiple Supabase projects run).
PROJECT_ID="${SUPABASE_PROJECT_ID:-donate-local}"

# ---------------------------------------------------------------------------
# Locate the local Supabase DB container for THIS project.
# ---------------------------------------------------------------------------
DB_CONTAINER="$(docker ps --filter "label=com.supabase.cli.project=$PROJECT_ID" \
  --format '{{.Names}}' | grep -E '_db_' | head -1)"

if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: no running Supabase DB container found." >&2
  echo "Start the stack first:  supabase start" >&2
  exit 2
fi

psql_db() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
}
# ---------------------------------------------------------------------------
# Ensure pgTAP is available.
# ---------------------------------------------------------------------------
if ! psql_db -tAc "CREATE EXTENSION IF NOT EXISTS pgtap;" > /dev/null 2>&1; then
  echo "ERROR: could not create pgtap extension." >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Collect suite files.
# ---------------------------------------------------------------------------
PATTERN="${1:-[0-9]*.sql}"
FILES=""
for f in "$TEST_DIR"/$PATTERN; do
  [ -f "$f" ] && FILES="$FILES $f"
done

if [ -z "$FILES" ]; then
  echo "No test files matched pattern '$PATTERN' in $TEST_DIR" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Run each suite.
# ---------------------------------------------------------------------------
TOTAL_FILES=0
FAILED_FILES=0
FAILED_NAMES=""

for f in $FILES; do
  TOTAL_FILES=$((TOTAL_FILES + 1))
  name="$(basename "$f")"

  # Suites reference product tables unqualified, so pin the session search_path
  # to the same chain the migrations use (the psql default does not include
  # the donate schema); `public` trails it because that's where the pgTAP
  # extension lives. The SET is piped ahead of the suite file: `-c` would
  # make psql exit before reading stdin.
  OUT="$({ echo "SET search_path = donate, donate_private, shared, extensions, public;"
    cat "$f"; } | psql_db -A -t -q -v ON_ERROR_STOP=1 2>&1)"
  PSQL_RC=$?

  OK_COUNT="$(printf '%s\n' "$OUT" | grep -c '^ok' || true)"
  NOT_OK_COUNT="$(printf '%s\n' "$OUT" | grep -c '^not ok' || true)"
  HAS_PLAN="$(printf '%s\n' "$OUT" | grep -cE '^1\.\.[0-9]+' || true)"
  HAS_FAILURES="$(printf '%s\n' "$OUT" | grep -c '^# Failed tests:' || true)"

  STATUS="ok"
  REASON=""

  if [ $PSQL_RC -ne 0 ]; then
    STATUS="FAIL"; REASON="psql error (rc=$PSQL_RC)"
  elif [ "$HAS_PLAN" -eq 0 ]; then
    STATUS="FAIL"; REASON="no TAP plan emitted (suite aborted?)"
  elif [ "$NOT_OK_COUNT" -gt 0 ] || [ "$HAS_FAILURES" -gt 0 ]; then
    STATUS="FAIL"; REASON="$NOT_OK_COUNT failed test(s)"
  fi

  printf '%-45s %s  (%s passed, %s failed)\n' "$name" "$STATUS" "$OK_COUNT" "$NOT_OK_COUNT"

  if [ "$STATUS" = "FAIL" ]; then
    FAILED_FILES=$((FAILED_FILES + 1))
    FAILED_NAMES="$FAILED_NAMES $name"
    if [ -n "$REASON" ]; then
      echo "    -> $REASON"
    fi
    # Show the failure detail block, trimmed.
    printf '%s\n' "$OUT" | sed -n '/^# Failed tests:/,/^$/p' | head -40
  fi
done

echo ""
echo "Suites: $TOTAL_FILES, failed: $FAILED_FILES"

if [ $FAILED_FILES -gt 0 ]; then
  echo "Failing suites:$FAILED_NAMES"
  exit 1
fi

echo "ALL DATABASE TESTS PASSED"
