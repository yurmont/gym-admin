import pg from "pg";
import { databaseOptions } from "./database-config.cjs";

// Firebase account creation is separate: this command only grants an existing UID a gym role.
const [uid, gymName, fullName] = process.argv.slice(2);
if (!uid || !gymName || !fullName || !process.env.DATABASE_URL)
  throw new Error(
    'Usage: npm run bootstrap -- <firebase-uid> "Gym name" "Admin name"; set DATABASE_URL',
  );
const pool = new pg.Pool(databaseOptions(process.env.DATABASE_URL, 1));
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const id = crypto.randomUUID();
  await client.query(
    "insert into public.tenants (id,name,slug) values ($1,$2,$3)",
    [id, gymName, `gym-${id}`],
  );
  await client.query(
    "insert into public.profiles (firebase_uid,tenant_id,full_name,role) values ($1,$2,$3,'admin')",
    [uid, id, fullName],
  );
  await client.query("COMMIT");
  console.log(`Created gym ${id} and administrator profile`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
