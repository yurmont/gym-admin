import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
import { databaseOptions } from "./database-config.cjs";

const url = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_DIRECT_URL or DATABASE_URL");
const pool = new pg.Pool(databaseOptions(url, 1));
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("select pg_advisory_xact_lock(77192001)");
  await client.query(
    "create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const dir = new URL("../migrations/", import.meta.url);
  for (const name of (await readdir(dir))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (
        await client.query(
          "select name from public.schema_migrations where name=$1",
          [name],
        )
      ).rows.length
    )
      continue;
    await client.query(await readFile(new URL(name, dir), "utf8"));
    await client.query(
      "insert into public.schema_migrations (name) values ($1)",
      [name],
    );
    console.log(`Applied ${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
