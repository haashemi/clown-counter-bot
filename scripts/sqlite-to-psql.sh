#!/usr/bin/env bash
# One-shot data migration: SQLite (legacy libsql DB) -> PostgreSQL.
# Usage: ./scripts/sqlite-to-psql.sh <sqlite.db> <postgres-url>
# The PostgreSQL schema must already exist (boot the bot once, or run `pnpm db:migrate`).
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <sqlite.db> <postgres-url>" >&2
  exit 1
fi

SQLITE=$1
PSQL_URL=$2

command -v sqlite3 >/dev/null || { echo "sqlite3 not found" >&2; exit 1; }
command -v psql >/dev/null || { echo "psql not found" >&2; exit 1; }
[[ -f $SQLITE ]] || { echo "sqlite db not found: $SQLITE" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Don't hang forever when a resolved address is unreachable (e.g. blackholed ::1).
export PGCONNECT_TIMEOUT=${PGCONNECT_TIMEOUT:-10}

# CSV exports; \N marks NULL so empty strings survive the round-trip intact.
sqlite3 -readonly "$SQLITE" <<EOF
.mode csv
.nullvalue \\N
.output $TMP/users.csv
SELECT id, name FROM users ORDER BY id;
.output $TMP/groups.csv
SELECT id, name, gif_ids, sticker_ids, reset_at, cooldown FROM groups ORDER BY id;
.output $TMP/clown_votes.csv
SELECT id, voter_id, clown_id, group_id, voted_at FROM clown_votes ORDER BY id;
EOF

# gif_ids/sticker_ids: JSON text -> jsonb. reset_at: epoch seconds -> timestamptz.
# voted_at: ISO-8601 UTC text -> timestamptz.
psql --set ON_ERROR_STOP=1 "$PSQL_URL" <<EOF
BEGIN;

TRUNCATE clown_votes, groups, users CASCADE;

CREATE TEMP TABLE tmp_users (id bigint, name text);
CREATE TEMP TABLE tmp_groups (id bigint, name text, gif_ids text, sticker_ids text, reset_at integer, cooldown integer);
CREATE TEMP TABLE tmp_clown_votes (id integer, voter_id bigint, clown_id bigint, group_id bigint, voted_at text);

\copy tmp_users FROM '$TMP/users.csv' WITH (FORMAT csv, NULL '\N')
\copy tmp_groups FROM '$TMP/groups.csv' WITH (FORMAT csv, NULL '\N')
\copy tmp_clown_votes FROM '$TMP/clown_votes.csv' WITH (FORMAT csv, NULL '\N')

INSERT INTO users (id, name)
SELECT id, name FROM tmp_users ORDER BY id;

INSERT INTO groups (id, name, gif_ids, sticker_ids, reset_at, cooldown)
SELECT id, name, gif_ids::jsonb, sticker_ids::jsonb,
       to_timestamp(reset_at)::timestamptz, cooldown
FROM tmp_groups ORDER BY id;

INSERT INTO clown_votes (id, voter_id, clown_id, group_id, voted_at) OVERRIDING SYSTEM VALUE
SELECT id, voter_id, clown_id, group_id, voted_at::timestamptz
FROM tmp_clown_votes ORDER BY id;

SELECT setval(pg_get_serial_sequence('clown_votes', 'id'),
       COALESCE((SELECT MAX(id) FROM clown_votes), 0) + 1, false);

COMMIT;
EOF

echo "migrated:"
psql "$PSQL_URL" -tA -c \
  "SELECT 'users='||(SELECT COUNT(*) FROM users),
          'groups='||(SELECT COUNT(*) FROM groups),
          'clown_votes='||(SELECT COUNT(*) FROM clown_votes);"
