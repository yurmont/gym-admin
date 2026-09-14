import pg from "pg";
import { databaseOptions } from "./database-config.cjs";

if (!process.env.DATABASE_URL) throw new Error("Set backend DATABASE_URL");
const pool = new pg.Pool(databaseOptions(process.env.DATABASE_URL, 1));
let client;
try {
  client = await pool.connect();
  const {
    rows: [row],
  } = await client.query(
    "select current_database() as database, to_regclass('public.members') is not null as schema_present",
  );
  console.log(
    JSON.stringify({
      connected: true,
      database: row.database,
      tls: client.connection.stream.encrypted === true,
      certificate_verified: client.connection.stream.authorized === true,
      schema_present: row.schema_present,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      connected: false,
      error_type: error instanceof Error ? error.name : "UnknownError",
      code: typeof error?.code === "string" ? error.code : "CONNECTION_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
