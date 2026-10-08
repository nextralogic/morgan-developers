#!/usr/bin/env bash
# Regenerates supabase/schema_snapshot.sql from the linked Supabase project, so the
# snapshot always matches the live database. Run it after every schema change:
#
#   npm run db:snapshot
#
# Needs the Supabase CLI (logged in and linked to the project), Node, and pg_dump
# 17 or newer on PATH (macOS: brew install libpq, then add /opt/homebrew/opt/libpq/bin).
# Pass a path to write somewhere else, e.g. to compare before replacing the file.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-supabase/schema_snapshot.sql}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# The public schema, exactly as `supabase db dump` writes it. --dry-run prints the
# CLI's pg_dump script, which runs here with the local pg_dump instead of Docker.
dump_public_schema() {
  supabase db dump --linked --schema public --dry-run 2>/dev/null | bash
}

# What the public dump leaves out: triggers on auth.users that call public
# functions, the Storage buckets and policies, and event triggers that run public
# functions (`supabase db dump` skips all event triggers). Postgres writes the
# statements from its own catalog, so they match the live definitions.
dump_supabase_schemas() {
  local result errors
  errors="$(mktemp)"
  result="$(supabase db query --linked "$(cat <<'SQL'
set search_path = '';
select string_agg(statement, E'\n\n' order by section, name) as sql
from (
  select 1 as section, t.tgname::text as name,
    replace(pg_get_triggerdef(t.oid), 'CREATE TRIGGER', 'CREATE OR REPLACE TRIGGER') || ';' as statement
  from pg_trigger t
  join pg_proc f on f.oid = t.tgfoid
  where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and f.pronamespace = 'public'::regnamespace
  union all
  select 2, b.id,
    format(E'INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)\nVALUES (%L, %L, %s, %s, %s)\nON CONFLICT (id) DO NOTHING;',
      b.id, b.name, b.public::text, coalesce(b.file_size_limit::text, 'NULL'),
      coalesce((select 'ARRAY[' || string_agg(quote_literal(m), ', ') || ']' from unnest(b.allowed_mime_types) m), 'NULL'))
  from storage.buckets b
  union all
  select 3, p.polname::text,
    format('CREATE POLICY %I ON %s AS %s FOR %s TO %s%s%s;',
      p.polname, p.polrelid::regclass,
      case when p.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
      case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
      case when p.polroles = '{0}' then 'public'
        else (select string_agg(quote_ident(r.rolname), ', ' order by r.rolname) from pg_roles r where r.oid = any(p.polroles)) end,
      coalesce(E'\n  USING (' || pg_get_expr(p.polqual, p.polrelid) || ')', ''),
      coalesce(E'\n  WITH CHECK (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')', ''))
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where c.relnamespace = 'storage'::regnamespace
  union all
  select 4, e.evtname::text,
    format(E'DROP EVENT TRIGGER IF EXISTS %I;\nCREATE EVENT TRIGGER %I ON %s%s\n  EXECUTE FUNCTION %s();',
      e.evtname, e.evtname, e.evtevent,
      coalesce(E'\n  WHEN TAG IN (' || (select string_agg(quote_literal(tag), ', ') from unnest(e.evttags) tag) || ')', ''),
      e.evtfoid::regproc)
  from pg_event_trigger e
  join pg_proc f on f.oid = e.evtfoid
  where f.pronamespace = 'public'::regnamespace and e.evtenabled <> 'D'
) statements
SQL
)" 2>"$errors")" || true
  # Show the CLI's own error (login, network, API) instead of failing in the JSON parse below.
  if [[ "$result" != *'"rows"'* ]]; then
    echo "schema-snapshot: supabase db query failed:" >&2
    cat "$errors" >&2
    rm -f "$errors"
    return 1
  fi
  rm -f "$errors"
  printf '%s' "$result" | node -e '
    let text = "";
    process.stdin.on("data", (chunk) => (text += chunk)).on("end", () => {
      const [row] = JSON.parse(text.slice(text.indexOf("{"))).rows;
      process.stdout.write(`${row.sql}\n`);
    });'
}

{
  cat <<'HEADER'
-- =============================================================
-- FULL SCHEMA SNAPSHOT — Morgan Developers Real Estate Platform
-- =============================================================
-- Generated from the live Supabase project by supabase/schema-snapshot.sh.
-- Do not edit by hand: change the database through a migration in
-- supabase/migrations, then run `npm run db:snapshot` and commit the result.
--
-- It recreates everything the app needs on a new, empty Supabase project:
--   * the public schema: types, tables, constraints, indexes, functions,
--     triggers, row level security, policies and grants
--   * the trigger on auth.users that creates a profile for each new user
--   * the property-images Storage bucket and its access policies
--   * event triggers that call public functions
-- It holds no data. Run it once on the empty project, in the SQL Editor or with
--   psql "<connection string>" -f supabase/schema_snapshot.sql
-- =============================================================
HEADER
  dump_public_schema
  printf '\n\n-- =============================================================\n'
  printf -- '-- Outside the public schema: auth trigger, Storage, event triggers\n'
  printf -- '-- =============================================================\n\n'
  dump_supabase_schemas
} | cat -s > "$TMP"

# Fail rather than replace the snapshot with a partial file.
for expected in 'CREATE TABLE IF NOT EXISTS "public"."properties"' 'ON auth.users' 'INSERT INTO storage.buckets'; do
  grep -qF "$expected" "$TMP" || { echo "schema-snapshot: output is missing '$expected'" >&2; exit 1; }
done

mv "$TMP" "$OUT"
trap - EXIT
echo "Wrote $OUT"
