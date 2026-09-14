import {
  Global,
  Injectable,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, types } from "pg";
// The container retains backend/scripts alongside dist.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { databaseOptions } = require("../../scripts/database-config.cjs") as {
  databaseOptions: (url: string, max: number) => import("pg").PoolConfig;
};

export type Row = Record<string, unknown>;
export interface Connection {
  query(text: string, values?: unknown[]): Promise<Row[]>;
}
export interface Database {
  transaction<T>(run: (db: Connection) => Promise<T>): Promise<T>;
}

export function connectDatabase(url: string, max = 3) {
  types.setTypeParser(1700, Number);
  const pool = new Pool(databaseOptions(url, max));
  pool.on("error", () =>
    process.stdout.write(
      JSON.stringify({
        severity: "ERROR",
        message: "Idle database connection failed",
      }) + "\n",
    ),
  );
  return {
    query: async (text: string, values: unknown[] = []): Promise<Row[]> =>
      (await pool.query(text, values)).rows,
    async transaction<T>(run: (db: Connection) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const data = await run({
          query: async (text, values = []) =>
            (await client.query(text, values)).rows,
        });
        await client.query("COMMIT");
        return data;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* Preserve the original failure. */
        }
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

@Injectable()
export class DatabaseService
  implements Database, Connection, OnApplicationShutdown
{
  private readonly client;
  constructor(config: ConfigService) {
    this.client = connectDatabase(
      config.getOrThrow<string>("DATABASE_URL"),
      config.get<number>("DB_POOL_MAX", 3),
    );
  }
  query(text: string, values?: unknown[]) {
    return this.client.query(text, values);
  }
  transaction<T>(run: (db: Connection) => Promise<T>) {
    return this.client.transaction(run);
  }
  async onApplicationShutdown() {
    await this.client.close();
  }
}
@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
