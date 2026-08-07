#!/usr/bin/env python3
"""Apply versioned Supabase migrations through the Management API.

This intentionally avoids `supabase link` so CI is not blocked by CLI/API
compatibility issues. Migrations are tracked in private.schema_migrations.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_ID", "").strip()
MIGRATIONS_DIR = Path("supabase/migrations")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def run_sql(query: str):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    payload = json.dumps({"query": query, "read_only": False}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "liga-serrana-github-actions",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        fail(f"Supabase Management API returned HTTP {exc.code}: {body}")
    except urllib.error.URLError as exc:
        fail(f"Could not reach Supabase Management API: {exc}")


def extract_versions(result) -> set[str]:
    if result is None:
        return set()

    rows = result
    if isinstance(result, dict):
        for key in ("data", "result", "rows"):
            if isinstance(result.get(key), list):
                rows = result[key]
                break

    if not isinstance(rows, list):
        print("Unexpected migration query response; treating as no applied migrations:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return set()

    versions: set[str] = set()
    for row in rows:
        if isinstance(row, dict) and row.get("version") is not None:
            versions.add(str(row["version"]))
    return versions


def main() -> None:
    if not TOKEN:
        fail("SUPABASE_ACCESS_TOKEN is missing")
    if not PROJECT_REF:
        fail("SUPABASE_PROJECT_ID is missing")
    if not MIGRATIONS_DIR.exists():
        fail(f"Migration directory not found: {MIGRATIONS_DIR}")

    bootstrap = """
    create schema if not exists private;
    revoke all on schema private from anon, authenticated;
    create table if not exists private.schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    );
    revoke all on table private.schema_migrations from anon, authenticated;
    """
    run_sql(bootstrap)

    applied = extract_versions(
        run_sql("select version from private.schema_migrations order by version;")
    )

    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_files:
        print("No migrations found.")
        return

    pending = []
    for path in migration_files:
        version = path.stem.split("_", 1)[0]
        if version not in applied:
            pending.append((version, path))

    if not pending:
        print("Database is already up to date.")
        return

    for version, path in pending:
        print(f"Applying {path.name}...")
        migration_sql = path.read_text(encoding="utf-8")
        statement = f"""
        begin;
        {migration_sql}
        insert into private.schema_migrations (version, name)
        values ({sql_literal(version)}, {sql_literal(path.name)})
        on conflict (version) do nothing;
        commit;
        """
        run_sql(statement)
        print(f"Applied {path.name}")

    print(f"Applied {len(pending)} migration(s) successfully.")


if __name__ == "__main__":
    main()
