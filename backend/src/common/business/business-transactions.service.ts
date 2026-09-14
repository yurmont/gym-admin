import { Injectable, ForbiddenException } from "@nestjs/common";
import {
  DatabaseService,
  type Database,
} from "../../database/database.service";
import { requireManager } from "../../modules/auth/require-manager";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import type { Context } from "./context";
export function withBusinessTransaction<T>(
  database: Database,
  actor: string,
  run: (ctx: Context) => Promise<T>,
): Promise<T> {
  return database.transaction(async (db) => {
    const [profile] = await db.query(
      `select tenant_id
      from public.profiles
      where id = $1 and is_active and role in ('admin', 'recepcion')
      for share`,
      [actor],
    );
    if (!profile)
      throw new ForbiddenException("Usuario sin permisos para esta operación");
    const tenant = String(profile.tenant_id);
    // Consistent transaction-scoped locking serializes business writes within one gym.
    await db.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      tenant,
    ]);
    const [clock] = await db.query(
      `select current_date::text as today, localtime::text as time`,
    );
    const ctx: Context = {
      db,
      actor,
      tenant,
      today: String(clock.today),
      time: String(clock.time),
    };
    return run(ctx);
  });
}
@Injectable()
export class BusinessTransactions {
  constructor(private readonly db: DatabaseService) {}

  run<T>(user: AuthenticatedUser, action: (ctx: Context) => Promise<T>) {
    requireManager(user);
    return withBusinessTransaction(this.db, user.id, action);
  }
}
