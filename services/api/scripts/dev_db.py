"""(Re)create the local dev database and load migration + seed.

Usage:  python scripts/dev_db.py  [--dsn postgresql://postgres@localhost:5544]
"""
import asyncio
import pathlib
import sys

import asyncpg

ROOT = pathlib.Path(__file__).resolve().parents[3]
ADMIN = sys.argv[sys.argv.index("--dsn") + 1] if "--dsn" in sys.argv else "postgresql://postgres@localhost:5544"


async def main() -> None:
    admin = await asyncpg.connect(ADMIN + "/postgres")
    await admin.execute("DROP DATABASE IF EXISTS claro")
    await admin.execute("CREATE DATABASE claro")
    await admin.close()

    conn = await asyncpg.connect(ADMIN + "/claro")
    migrations_dir = ROOT / "database" / "migrations"
    for migration in sorted(migrations_dir.glob("*.sql")):
        await conn.execute(migration.read_text(encoding="utf-8"))
    await conn.execute((ROOT / "database" / "seed.sql").read_text(encoding="utf-8"))
    n = await conn.fetchval("SELECT count(*) FROM customers")
    await conn.close()
    print(f"claro dev DB ready — {n} customers seeded")


asyncio.run(main())
