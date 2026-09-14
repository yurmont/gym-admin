import { ForbiddenException } from "@nestjs/common";
import type { Database } from "../database/database";
import { schemas, type Input, type Operation } from "./schemas";
import { required, type Context } from "./services/common";
import {
  createMembership,
  renewMembership,
  cancelMembership,
} from "./services/memberships";
import { registerPayment, voidPayment } from "./services/payments";
import { checkIn, checkOut } from "./services/attendance";
export function createOperations(database: Database) {
  return async (
    operation: Operation,
    body: unknown,
    actor: string,
  ): Promise<unknown> => {
    const input = schemas[operation].parse(body);
    return await database.transaction(async (db) => {
      const [profile] = await db.query(
        "select tenant_id from public.profiles where id=$1 and is_active and role in ('admin','recepcion') for share",
        [actor],
      );
      if (!profile)
        throw new ForbiddenException(
          "Usuario sin permisos para esta operación",
        );
      const tenant = String(profile.tenant_id);
      // Consistent transaction-scoped locking serializes business writes within one gym.
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
        tenant,
      ]);
      const [clock] = await db.query(
        "select current_date::text as today, localtime::text as time",
      );
      const ctx: Context = {
        db,
        actor,
        tenant,
        today: String(clock.today),
        time: String(clock.time),
      };
      switch (operation) {
        case "create-membership":
          return await createMembership(
            ctx,
            input as Input<"create-membership">,
          );
        case "register-payment":
          return await registerPayment(ctx, input as Input<"register-payment">);
        case "renew-membership":
          return await renewMembership(ctx, input as Input<"renew-membership">);
        case "cancel-membership":
          return await cancelMembership(
            ctx,
            input as Input<"cancel-membership">,
          );
        case "void-payment":
          return await voidPayment(
            ctx,
            (input as Input<"void-payment">).payment_id,
          );
        case "attendance-check-in":
          return await checkIn(ctx, input as Input<"attendance-check-in">);
        case "attendance-check-out":
          return await checkOut(ctx, input as Input<"attendance-check-out">);
      }
    });
  };
}
